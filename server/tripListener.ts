import OpenAI, { toFile } from "openai";
import { storage } from "./storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function transcribeAudio(audioBuffer: Buffer, format: string = "wav"): Promise<string> {
  const file = await toFile(audioBuffer, `audio.${format}`);
  const response = await openai.audio.transcriptions.create({
    file,
    model: "gpt-4o-mini-transcribe",
  });
  return response.text;
}

export interface TripSuggestion {
  type: "deal" | "bundle" | "accommodation" | "safari" | "restaurant" | "companion";
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  price: number | null;
  currency: string;
  location: string;
  matchReason: string;
}

export async function extractTripKeywords(transcript: string): Promise<{
  destinations: string[];
  activities: string[];
  interests: string[];
  budget: string | null;
  travelType: string | null;
}> {
  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: `You are a travel keyword extraction assistant. Extract travel-related information from conversations. Return JSON only with these fields:
- destinations: array of place names, countries, cities mentioned
- activities: array of activities mentioned (safari, diving, hiking, dining, etc.)
- interests: array of interests (luxury, adventure, relaxation, culture, wildlife, food, etc.)
- budget: budget level if mentioned (budget, moderate, luxury, ultra-luxury) or null
- travelType: type of trip if clear (solo, couple, family, group, business) or null

Only extract what is explicitly or strongly implied in the text. Return empty arrays if nothing travel-related is found.`,
      },
      {
        role: "user",
        content: transcript,
      },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 500,
  });

  try {
    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    return {
      destinations: parsed.destinations || [],
      activities: parsed.activities || [],
      interests: parsed.interests || [],
      budget: parsed.budget || null,
      travelType: parsed.travelType || null,
    };
  } catch {
    return { destinations: [], activities: [], interests: [], budget: null, travelType: null };
  }
}

export async function findMatchingSuggestions(keywords: {
  destinations: string[];
  activities: string[];
  interests: string[];
  budget: string | null;
  travelType: string | null;
}): Promise<TripSuggestion[]> {
  const suggestions: TripSuggestion[] = [];
  const allDestinations = [...keywords.destinations].map(d => d.toLowerCase());
  const allActivities = [...keywords.activities].map(a => a.toLowerCase());
  const allInterests = [...keywords.interests].map(i => i.toLowerCase());

  const deals = await storage.getFlashDeals({ activeOnly: true });
  for (const deal of deals) {
    const matchReasons: string[] = [];
    const dealCountry = (deal.country || "").toLowerCase();
    const dealCity = (deal.city || "").toLowerCase();
    const dealTitle = (deal.title || "").toLowerCase();
    const dealDesc = (deal.description || "").toLowerCase();

    for (const dest of allDestinations) {
      if (dealCountry.includes(dest) || dealCity.includes(dest) || dest.includes(dealCountry) || dest.includes(dealCity)) {
        matchReasons.push(`Matches destination: ${dest}`);
      }
    }
    for (const act of allActivities) {
      if (dealTitle.includes(act) || dealDesc.includes(act) || deal.vendorType.includes(act)) {
        matchReasons.push(`Related to: ${act}`);
      }
    }
    if (deal.vendorType === "safari" && (allActivities.includes("safari") || allInterests.includes("wildlife") || allInterests.includes("adventure"))) {
      if (!matchReasons.length) matchReasons.push("Safari adventure match");
    }
    if (deal.vendorType === "restaurant" && (allActivities.includes("dining") || allInterests.includes("food") || allInterests.includes("culinary"))) {
      if (!matchReasons.length) matchReasons.push("Dining experience match");
    }

    if (matchReasons.length > 0) {
      suggestions.push({
        type: "deal",
        id: deal.id,
        name: deal.title,
        description: `${deal.discountPercent}% off - ${deal.vendorName}`,
        imageUrl: deal.imageUrl,
        price: deal.dealPrice,
        currency: deal.currency || "usd",
        location: `${deal.city || ""}, ${deal.country || ""}`,
        matchReason: matchReasons.join("; "),
      });
    }
  }

  const bundles = await storage.getTripBundles({ activeOnly: true });
  for (const bundle of bundles) {
    const matchReasons: string[] = [];
    const bundleCountry = (bundle.country || "").toLowerCase();
    const bundleDest = (bundle.destination || "").toLowerCase();
    const bundleName = (bundle.name || "").toLowerCase();
    const bundleDesc = (bundle.description || "").toLowerCase();

    for (const dest of allDestinations) {
      if (bundleCountry.includes(dest) || bundleDest.includes(dest) || dest.includes(bundleCountry) || dest.includes(bundleDest)) {
        matchReasons.push(`Matches destination: ${dest}`);
      }
    }
    for (const act of allActivities) {
      if (bundleName.includes(act) || bundleDesc.includes(act)) {
        matchReasons.push(`Includes: ${act}`);
      }
    }
    for (const interest of allInterests) {
      if (bundleName.includes(interest) || bundleDesc.includes(interest)) {
        matchReasons.push(`Matches interest: ${interest}`);
      }
    }

    if (matchReasons.length > 0) {
      suggestions.push({
        type: "bundle",
        id: bundle.id,
        name: bundle.name,
        description: `Save ${bundle.savingsPercent}% - ${bundle.duration || "Multi-day"} package`,
        imageUrl: bundle.imageUrl,
        price: bundle.bundlePrice,
        currency: bundle.currency || "usd",
        location: `${bundle.destination}, ${bundle.country}`,
        matchReason: matchReasons.join("; "),
      });
    }
  }

  for (const dest of allDestinations) {
    try {
      const accoms = await storage.getAccommodations({ country: dest });
      for (const a of accoms.slice(0, 3)) {
        suggestions.push({
          type: "accommodation",
          id: a.id,
          name: a.name,
          description: `${a.propertyType} in ${a.city}, ${a.country}`,
          imageUrl: a.imageUrl,
          price: a.bookingPrice,
          currency: a.bookingCurrency || "usd",
          location: `${a.city}, ${a.country}`,
          matchReason: `Accommodation in ${dest}`,
        });
      }
    } catch {}

    try {
      const safaris = await storage.getSafaris({ country: dest });
      for (const s of safaris.slice(0, 3)) {
        suggestions.push({
          type: "safari",
          id: s.id,
          name: s.name,
          description: `${s.safariType} - ${s.duration}`,
          imageUrl: s.imageUrl,
          price: s.bookingPrice,
          currency: s.bookingCurrency || "usd",
          location: `${s.city}, ${s.country}`,
          matchReason: `Safari in ${dest}`,
        });
      }
    } catch {}

    try {
      const restaurants = await storage.getRestaurants({ country: dest });
      for (const r of restaurants.slice(0, 2)) {
        suggestions.push({
          type: "restaurant",
          id: r.id,
          name: r.name,
          description: `${r.cuisineType} - ${r.priceRange}`,
          imageUrl: r.imageUrl,
          price: r.bookingPrice,
          currency: r.bookingCurrency || "usd",
          location: `${r.city}, ${r.country}`,
          matchReason: `Restaurant in ${dest}`,
        });
      }
    } catch {}
  }

  const uniqueSuggestions = new Map<string, TripSuggestion>();
  for (const s of suggestions) {
    const key = `${s.type}-${s.id}`;
    if (!uniqueSuggestions.has(key)) {
      uniqueSuggestions.set(key, s);
    }
  }

  return Array.from(uniqueSuggestions.values()).slice(0, 15);
}
