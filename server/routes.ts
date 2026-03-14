import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { eq, and, desc, or } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import {
  insertRestaurantSchema,
  insertRatingSchema,
  insertSafariSchema,
  insertSafariRatingSchema,
  insertAccommodationSchema,
  insertAccommodationRatingSchema,
  insertCompanionSchema,
  insertCompanionRatingSchema,
  insertCarRentalSchema,
  insertCarRentalRatingSchema,
  carRentals,
  insertTripSchema,
  insertBookingSchema,
  insertTripMemorySchema,
  insertFlashDealSchema,
  insertTripBundleSchema,
  chatMessages,
  loyaltyAccounts,
  loyaltyTransactions,
  referralRedemptions,
  priceNegotiations,
  escrowTransactions,
  payoutRequests,
  flashDeals,
  destinationEvents,
  insertDestinationEventSchema,
  insertMenuItemSchema,
  insertDeliveryOrderSchema,
  deliveryOrders,
} from "@shared/schema";
import { stripeService } from "./stripeService";
import { stripeStorage } from "./stripeStorage";
import { getStripePublishableKey } from "./stripeClient";
import { sendMessageEmailNotification } from "./email";
import { travellerProfiles } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { transcribeAudio, extractTripKeywords, findMatchingSuggestions } from "./tripListener";
import { ensureCompatibleFormat } from "./replit_integrations/audio/client";
import OpenAI from "openai";

const PLATFORM_SERVICE_FEE_PERCENT = 12;

function filterContactInfo(text: string): { filtered: string; wasFiltered: boolean; filterWarning: string | null } {
  let filtered = text;
  let wasFiltered = false;

  const phoneRegex = /(\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,9}[-.\s]?\d{1,9}[-.\s]?\d{0,9})/g;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const urlRegex = /(?:https?:\/\/|www\.|goo\.gl|bit\.ly|tinyurl|maps\.app\.goo\.gl|maps\.google|google\.com\/maps)[^\s<>]*/gi;
  const socialRegex = /@[a-zA-Z0-9_.]{3,30}/g;
  const whatsappRegex = /whats\s*app|wh?ats\s*up|wa\.me|wats\s*ap|w\.?a\.?t\.?s\.?a\.?p/gi;
  const telegramRegex = /telegram|t\.me|tele\s*gram|t\s*g\s*ram/gi;
  const externalAppsRegex = /\b(signal|viber|imo|wechat|we\s*chat|line\s*app|snapchat|snap\s*chat|skype|discord|messenger|fb\s*msg|facebook\s*msg|insta\s*gram\s*dm|ig\s*dm|call\s*me|text\s*me|ring\s*me|reach\s*me\s*at|contact\s*me\s*on|find\s*me\s*on|dm\s*me|message\s*me\s*on|hit\s*me\s*up\s*on|add\s*me\s*on|buzz\s*me|ping\s*me\s*on|hmu\s*on|hmu\s*at|write\s*me\s*on|send\s*me\s*a?\s*msg|my\s*number\s*is|my\s*cell\s*is|my\s*digits|here'?s?\s*my\s*number|take\s*my\s*number|got\s*my\s*number|give\s*you\s*my\s*number|i'?ll?\s*give\s*you\s*my\s*num)\b/gi;
  const spelledNumbersRegex = /\b(zero|one|two|three|four|five|six|seven|eight|nine|oh|nought|nil)\s*[-.,;]?\s*(zero|one|two|three|four|five|six|seven|eight|nine|oh|nought|nil)\s*[-.,;]?\s*(zero|one|two|three|four|five|six|seven|eight|nine|oh|nought|nil)\s*[-.,;]?\s*(zero|one|two|three|four|five|six|seven|eight|nine|oh|nought|nil)/gi;
  const spacedDigitsRegex = /\d[\s._\-*#|]{1,3}\d[\s._\-*#|]{1,3}\d[\s._\-*#|]{1,3}\d[\s._\-*#|]{1,3}\d[\s._\-*#|]{1,3}\d[\s._\-*#|]{1,3}\d/g;

  const leetDigitsRegex = /[oO0]\s*[1lI]\s*[2zZ]\s*[3eE]\s*[4aA]\s*[5sS]\s*[6bG]\s*[7tT]\s*[8bB]\s*[9gq]/gi;
  const digitsWithWordsRegex = /\b\d{2,4}\s*(?:dash|dot|point|hyphen|space)\s*\d{2,4}/gi;
  const reversedContactRegex = /\b(em\s*llac|em\s*txet|em\s*gnir|rebmun\s*ym)\b/gi;
  const consecutiveDigitsRegex = /(?<!\d)\d{7,15}(?!\d)/g;

  const addressRegex = /\b\d{1,5}\s+(?:[A-Z][a-z]+\s+){0,3}(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|place|pl|way|terrace|circle|highway|hwy)\b\.?\s*(?:,?\s*(?:apt|apartment|suite|ste|unit|room|rm|flat|floor|fl)\.?\s*#?\s*\d{0,5})?/gi;
  const meetLocationRegex = /\b(?:meet\s*(?:me\s*)?(?:at|near|by|outside|in\s*front\s*of|behind|next\s*to|across\s*from)|come\s*(?:to|over\s*to|meet\s*me)|i'?m?\s*(?:at|near|staying\s*at|located\s*at)|let'?s?\s*meet\s*(?:at|near|by))\s+[A-Z0-9][\w\s,.'#-]{5,60}/gi;
  const gpsCoordinateRegex = /-?\d{1,3}\.\d{3,8}\s*,\s*-?\d{1,3}\.\d{3,8}/g;
  const postalAddressRegex = /\b(?:p\.?\s*o\.?\s*box|post\s*office\s*box)\s*#?\s*\d+/gi;

  const applyFilter = (regex: RegExp, replacement: string) => {
    const before = filtered;
    filtered = filtered.replace(regex, replacement);
    if (filtered !== before) wasFiltered = true;
  };

  applyFilter(gpsCoordinateRegex, "[location hidden - arrange meetings through Tripsbnb]");
  applyFilter(meetLocationRegex, "[meeting location hidden - arrange through Tripsbnb] ");
  applyFilter(addressRegex, "[address hidden - arrange meetings through Tripsbnb]");
  applyFilter(postalAddressRegex, "[address hidden - arrange meetings through Tripsbnb]");
  applyFilter(phoneRegex, "[contact hidden - book through Tripsbnb]");
  applyFilter(consecutiveDigitsRegex, "[contact hidden - book through Tripsbnb]");
  applyFilter(spacedDigitsRegex, "[contact hidden - book through Tripsbnb]");
  applyFilter(spelledNumbersRegex, "[contact hidden - book through Tripsbnb]");
  applyFilter(leetDigitsRegex, "[contact hidden - book through Tripsbnb]");
  applyFilter(digitsWithWordsRegex, "[contact hidden - book through Tripsbnb]");
  applyFilter(reversedContactRegex, "[contact hidden - book through Tripsbnb]");
  applyFilter(emailRegex, "[email hidden - book through Tripsbnb]");
  applyFilter(urlRegex, "[link hidden - book through Tripsbnb]");
  applyFilter(socialRegex, "[handle hidden]");
  applyFilter(whatsappRegex, "[external messaging not allowed]");
  applyFilter(telegramRegex, "[external messaging not allowed]");
  applyFilter(externalAppsRegex, "[external messaging not allowed - use Tripsbnb chat]");

  const filterWarning = wasFiltered
    ? "For your safety, all bookings and payments must go through Tripsbnb. Sharing contact details, addresses, or meeting locations outside the platform is not permitted."
    : null;

  return { filtered, wasFiltered, filterWarning };
}

function maskVendorContact(vendor: any): any {
  if (!vendor) return vendor;
  const masked = { ...vendor };
  if (masked.phone) masked.phone = "Contact via Tripsbnb chat";
  if (masked.email) masked.email = "Contact via Tripsbnb chat";
  if (masked.website) masked.website = "Book through Tripsbnb";
  return masked;
}

function calculateServiceFee(subtotalCents: number): { serviceFee: number; total: number; feePercent: number } {
  const serviceFee = Math.round(subtotalCents * (PLATFORM_SERVICE_FEE_PERCENT / 100));
  return {
    serviceFee,
    total: subtotalCents + serviceFee,
    feePercent: PLATFORM_SERVICE_FEE_PERCENT,
  };
}

const uploadsDir = path.resolve(process.cwd(), "uploads", "memories");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const memoryStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `memory-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|heic/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype.split("/")[1] || "");
    if (ext || mime) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Restaurant endpoints
  
  // Get all restaurants with optional filters
  app.get("/api/restaurants", async (req, res) => {
    try {
      const { country, city, cuisineType, verified } = req.query;
      
      const restaurants = await storage.getRestaurants({
        country: country as string | undefined,
        city: city as string | undefined,
        cuisineType: cuisineType as string | undefined,
        verified: verified === "true" ? true : verified === "false" ? false : undefined,
      });
      
      res.json(restaurants);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      res.status(500).json({ error: "Failed to fetch restaurants" });
    }
  });

  // Get restaurant by ID
  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      const restaurant = await storage.getRestaurantById(req.params.id);
      
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      
      res.json(maskVendorContact(restaurant));
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      res.status(500).json({ error: "Failed to fetch restaurant" });
    }
  });

  // Create new restaurant (onboarding)
  app.post("/api/restaurants", async (req, res) => {
    try {
      // Clean up the data - remove empty strings for optional fields
      const cleanedData = { ...req.body };
      
      // Handle empty string latitude/longitude
      if (cleanedData.latitude === "" || cleanedData.latitude === null) {
        delete cleanedData.latitude;
      }
      if (cleanedData.longitude === "" || cleanedData.longitude === null) {
        delete cleanedData.longitude;
      }
      
      // Handle empty optional string fields
      if (cleanedData.description === "") cleanedData.description = null;
      if (cleanedData.phone === "") cleanedData.phone = null;
      if (cleanedData.email === "") cleanedData.email = null;
      if (cleanedData.website === "") cleanedData.website = null;
      if (cleanedData.imageUrl === "") cleanedData.imageUrl = null;
      
      // Handle booking price - convert to integer cents if provided as string
      if (cleanedData.bookingPrice === "" || cleanedData.bookingPrice === null) {
        delete cleanedData.bookingPrice;
      } else if (cleanedData.bookingPrice) {
        cleanedData.bookingPrice = parseInt(cleanedData.bookingPrice, 10);
      }
      
      console.log("Creating restaurant with data:", JSON.stringify(cleanedData, null, 2));
      
      const parsed = insertRestaurantSchema.safeParse(cleanedData);
      
      if (!parsed.success) {
        console.error("Validation errors:", parsed.error.errors);
        return res.status(400).json({ error: "Invalid restaurant data", details: parsed.error.errors });
      }
      
      // Create the restaurant first
      let restaurant = await storage.createRestaurant(parsed.data);
      
      // If booking price is set, create Stripe product
      if (parsed.data.bookingPrice && parsed.data.bookingPrice > 0) {
        try {
          const stripeResult = await stripeService.createVendorProduct({
            vendorType: 'restaurant',
            vendorId: restaurant.id,
            name: `Dining at ${restaurant.name}`,
            description: restaurant.description || `Dining experience at ${restaurant.name}`,
            priceInCents: parsed.data.bookingPrice,
            currency: parsed.data.bookingCurrency || 'usd',
            metadata: {
              cuisineType: restaurant.cuisineType,
              city: restaurant.city,
              country: restaurant.country,
            },
          });
          
          // Update restaurant with Stripe IDs
          restaurant = await storage.updateRestaurant(restaurant.id, {
            stripeProductId: stripeResult.productId,
            stripePriceId: stripeResult.priceId,
          }) || restaurant;
        } catch (stripeError) {
          console.error("Failed to create Stripe product:", stripeError);
          // Continue without Stripe - restaurant is still created
        }
      }
      
      res.status(201).json(restaurant);
    } catch (error) {
      console.error("Error creating restaurant:", error);
      res.status(500).json({ error: "Failed to create restaurant" });
    }
  });

  // Update restaurant
  app.put("/api/restaurants/:id", async (req, res) => {
    try {
      const existing = await storage.getRestaurantById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      
      const updateData = { ...req.body };
      
      // Handle booking price changes
      if (updateData.bookingPrice !== undefined) {
        const newPrice = parseInt(updateData.bookingPrice, 10) || 0;
        
        if (newPrice > 0) {
          try {
            if (existing.stripeProductId) {
              // Update existing product's price
              const newPriceId = await stripeService.updateVendorPrice(
                existing.stripeProductId,
                newPrice,
                updateData.bookingCurrency || existing.bookingCurrency || 'usd'
              );
              updateData.stripePriceId = newPriceId;
            } else {
              // Create new Stripe product
              const stripeResult = await stripeService.createVendorProduct({
                vendorType: 'restaurant',
                vendorId: existing.id,
                name: `Dining at ${existing.name}`,
                description: existing.description || `Dining experience at ${existing.name}`,
                priceInCents: newPrice,
                currency: updateData.bookingCurrency || 'usd',
                metadata: {
                  cuisineType: existing.cuisineType,
                  city: existing.city,
                  country: existing.country,
                },
              });
              updateData.stripeProductId = stripeResult.productId;
              updateData.stripePriceId = stripeResult.priceId;
            }
          } catch (stripeError) {
            console.error("Failed to update Stripe product:", stripeError);
          }
        }
      }
      
      const restaurant = await storage.updateRestaurant(req.params.id, updateData);
      res.json(restaurant);
    } catch (error) {
      console.error("Error updating restaurant:", error);
      res.status(500).json({ error: "Failed to update restaurant" });
    }
  });

  // Create checkout session for restaurant booking
  app.post("/api/restaurants/:id/checkout", async (req, res) => {
    try {
      const restaurant = await storage.getRestaurantById(req.params.id);
      
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      
      if (!restaurant.stripePriceId) {
        return res.status(400).json({ error: "This restaurant does not accept online bookings" });
      }

      const subtotal = restaurant.bookingPrice || 0;
      const { serviceFee, total, feePercent } = calculateServiceFee(subtotal);
      
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const baseUrl = `${protocol}://${host}`;
      
      const session = await stripeService.createCheckoutSession({
        priceId: restaurant.stripePriceId,
        successUrl: `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/booking/cancel`,
        mode: 'payment',
        metadata: {
          vendorType: 'restaurant',
          vendorId: restaurant.id,
          vendorName: restaurant.name,
          serviceFee: serviceFee.toString(),
          serviceFeePercent: feePercent.toString(),
        },
      });

      await storage.createPlatformTransaction({
        bookingId: null,
        vendorType: "restaurant",
        vendorId: restaurant.id,
        vendorName: restaurant.name,
        userId: req.body.userId || null,
        subtotalAmount: subtotal,
        serviceFeeAmount: serviceFee,
        serviceFeePercent: feePercent,
        totalAmount: total,
        currency: restaurant.bookingCurrency || "usd",
        stripeSessionId: session.id,
        status: "pending",
      });

      // Create escrow entry for vendor payout
      let wallet = await storage.getVendorWallet(restaurant.id, "restaurant");
      if (!wallet) {
        wallet = await storage.createVendorWallet({
          vendorId: restaurant.id,
          vendorType: "restaurant",
          vendorName: restaurant.name,
          currency: restaurant.bookingCurrency || "usd",
        });
      }
      await storage.createEscrowTransaction({
        walletId: wallet.id,
        vendorId: restaurant.id,
        vendorType: "restaurant",
        bookingAmount: total,
        platformFee: serviceFee,
        vendorPayout: subtotal,
        userId: req.body.userId || null,
        stripeSessionId: session.id,
        status: "held",
        description: `restaurant booking - ${restaurant.name}`,
      });
      await storage.updateVendorWallet(wallet.id, {
        pendingBalance: (wallet.pendingBalance || 0) + subtotal,
      });
      
      res.json({ url: session.url, sessionId: session.id, subtotal, serviceFee, total, feePercent });
    } catch (error) {
      console.error("Error creating restaurant checkout:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Get countries with restaurants
  app.get("/api/locations/countries", async (req, res) => {
    try {
      const countries = await storage.getCountries();
      res.json(countries);
    } catch (error) {
      console.error("Error fetching countries:", error);
      res.status(500).json({ error: "Failed to fetch countries" });
    }
  });

  // Get cities in a country
  app.get("/api/locations/cities/:country", async (req, res) => {
    try {
      const cities = await storage.getCitiesByCountry(req.params.country);
      res.json(cities);
    } catch (error) {
      console.error("Error fetching cities:", error);
      res.status(500).json({ error: "Failed to fetch cities" });
    }
  });

  // Rating endpoints
  
  // Get ratings for a restaurant
  app.get("/api/restaurants/:id/ratings", async (req, res) => {
    try {
      const ratings = await storage.getRatingsByRestaurant(req.params.id);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching ratings:", error);
      res.status(500).json({ error: "Failed to fetch ratings" });
    }
  });

  // Create a new rating
  app.post("/api/restaurants/:id/ratings", async (req, res) => {
    try {
      const ratingData = {
        ...req.body,
        restaurantId: req.params.id,
      };
      
      const parsed = insertRatingSchema.safeParse(ratingData);
      
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid rating data", details: parsed.error.errors });
      }
      
      // Validate rating is 1-5
      if (parsed.data.rating < 1 || parsed.data.rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }
      
      const rating = await storage.createRating(parsed.data);
      res.status(201).json(rating);
    } catch (error) {
      console.error("Error creating rating:", error);
      res.status(500).json({ error: "Failed to create rating" });
    }
  });

  // ========== SAFARI ENDPOINTS ==========

  app.get("/api/safaris", async (req, res) => {
    try {
      const { country, city, safariType, verified } = req.query;
      const results = await storage.getSafaris({
        country: country as string | undefined,
        city: city as string | undefined,
        safariType: safariType as string | undefined,
        verified: verified === "true" ? true : verified === "false" ? false : undefined,
      });
      res.json(results);
    } catch (error) {
      console.error("Error fetching safaris:", error);
      res.status(500).json({ error: "Failed to fetch safaris" });
    }
  });

  app.get("/api/safaris/:id", async (req, res) => {
    try {
      const safari = await storage.getSafariById(req.params.id);
      if (!safari) return res.status(404).json({ error: "Safari not found" });
      res.json(maskVendorContact(safari));
    } catch (error) {
      console.error("Error fetching safari:", error);
      res.status(500).json({ error: "Failed to fetch safari" });
    }
  });

  app.post("/api/safaris", async (req, res) => {
    try {
      const cleanedData = { ...req.body };
      if (cleanedData.latitude === "" || cleanedData.latitude === null) delete cleanedData.latitude;
      if (cleanedData.longitude === "" || cleanedData.longitude === null) delete cleanedData.longitude;
      if (cleanedData.description === "") cleanedData.description = null;
      if (cleanedData.phone === "") cleanedData.phone = null;
      if (cleanedData.email === "") cleanedData.email = null;
      if (cleanedData.website === "") cleanedData.website = null;
      if (cleanedData.imageUrl === "") cleanedData.imageUrl = null;
      if (cleanedData.groupSize === "" || cleanedData.groupSize === null) delete cleanedData.groupSize;
      else if (cleanedData.groupSize) cleanedData.groupSize = parseInt(cleanedData.groupSize, 10);
      if (cleanedData.bookingPrice === "" || cleanedData.bookingPrice === null) delete cleanedData.bookingPrice;
      else if (cleanedData.bookingPrice) cleanedData.bookingPrice = parseInt(cleanedData.bookingPrice, 10);

      const parsed = insertSafariSchema.safeParse(cleanedData);
      if (!parsed.success) return res.status(400).json({ error: "Invalid safari data", details: parsed.error.errors });

      let safari = await storage.createSafari(parsed.data);

      if (parsed.data.bookingPrice && parsed.data.bookingPrice > 0) {
        try {
          const stripeResult = await stripeService.createVendorProduct({
            vendorType: 'safari',
            vendorId: safari.id,
            name: `Safari: ${safari.name}`,
            description: safari.description || `Safari experience - ${safari.name}`,
            priceInCents: parsed.data.bookingPrice,
            currency: parsed.data.bookingCurrency || 'usd',
            metadata: { safariType: safari.safariType, city: safari.city, country: safari.country },
          });
          safari = await storage.updateSafari(safari.id, {
            stripeProductId: stripeResult.productId,
            stripePriceId: stripeResult.priceId,
          }) || safari;
        } catch (stripeError) {
          console.error("Failed to create Stripe product for safari:", stripeError);
        }
      }

      res.status(201).json(safari);
    } catch (error) {
      console.error("Error creating safari:", error);
      res.status(500).json({ error: "Failed to create safari" });
    }
  });

  app.put("/api/safaris/:id", async (req, res) => {
    try {
      const existing = await storage.getSafariById(req.params.id);
      if (!existing) return res.status(404).json({ error: "Safari not found" });

      const updateData = { ...req.body };
      if (updateData.bookingPrice !== undefined) {
        const newPrice = parseInt(updateData.bookingPrice, 10) || 0;
        if (newPrice > 0) {
          try {
            if (existing.stripeProductId) {
              updateData.stripePriceId = await stripeService.updateVendorPrice(existing.stripeProductId, newPrice, updateData.bookingCurrency || existing.bookingCurrency || 'usd');
            } else {
              const stripeResult = await stripeService.createVendorProduct({
                vendorType: 'safari', vendorId: existing.id, name: `Safari: ${existing.name}`,
                description: existing.description || `Safari experience - ${existing.name}`,
                priceInCents: newPrice, currency: updateData.bookingCurrency || 'usd',
                metadata: { safariType: existing.safariType, city: existing.city, country: existing.country },
              });
              updateData.stripeProductId = stripeResult.productId;
              updateData.stripePriceId = stripeResult.priceId;
            }
          } catch (stripeError) {
            console.error("Failed to update Stripe product for safari:", stripeError);
          }
        }
      }

      const safari = await storage.updateSafari(req.params.id, updateData);
      res.json(safari);
    } catch (error) {
      console.error("Error updating safari:", error);
      res.status(500).json({ error: "Failed to update safari" });
    }
  });

  app.post("/api/safaris/:id/checkout", async (req, res) => {
    try {
      const safari = await storage.getSafariById(req.params.id);
      if (!safari) return res.status(404).json({ error: "Safari not found" });
      if (!safari.stripePriceId) return res.status(400).json({ error: "This safari does not accept online bookings" });

      const subtotal = safari.bookingPrice || 0;
      const { serviceFee, total, feePercent } = calculateServiceFee(subtotal);

      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const baseUrl = `${protocol}://${host}`;

      const session = await stripeService.createCheckoutSession({
        priceId: safari.stripePriceId,
        successUrl: `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/booking/cancel`,
        mode: 'payment',
        metadata: { vendorType: 'safari', vendorId: safari.id, vendorName: safari.name, serviceFee: serviceFee.toString(), serviceFeePercent: feePercent.toString() },
      });

      await storage.createPlatformTransaction({
        bookingId: null, vendorType: "safari", vendorId: safari.id, vendorName: safari.name,
        userId: req.body.userId || null, subtotalAmount: subtotal, serviceFeeAmount: serviceFee,
        serviceFeePercent: feePercent, totalAmount: total, currency: safari.bookingCurrency || "usd",
        stripeSessionId: session.id, status: "pending",
      });

      // Create escrow entry for vendor payout
      let wallet = await storage.getVendorWallet(safari.id, "safari");
      if (!wallet) {
        wallet = await storage.createVendorWallet({
          vendorId: safari.id,
          vendorType: "safari",
          vendorName: safari.name,
          currency: safari.bookingCurrency || "usd",
        });
      }
      await storage.createEscrowTransaction({
        walletId: wallet.id,
        vendorId: safari.id,
        vendorType: "safari",
        bookingAmount: total,
        platformFee: serviceFee,
        vendorPayout: subtotal,
        userId: req.body.userId || null,
        stripeSessionId: session.id,
        status: "held",
        description: `safari booking - ${safari.name}`,
      });
      await storage.updateVendorWallet(wallet.id, {
        pendingBalance: (wallet.pendingBalance || 0) + subtotal,
      });

      res.json({ url: session.url, sessionId: session.id, subtotal, serviceFee, total, feePercent });
    } catch (error) {
      console.error("Error creating safari checkout:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.get("/api/safaris/:id/ratings", async (req, res) => {
    try {
      const ratings = await storage.getSafariRatings(req.params.id);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching safari ratings:", error);
      res.status(500).json({ error: "Failed to fetch ratings" });
    }
  });

  app.post("/api/safaris/:id/ratings", async (req, res) => {
    try {
      const parsed = insertSafariRatingSchema.safeParse({ ...req.body, safariId: req.params.id });
      if (!parsed.success) return res.status(400).json({ error: "Invalid rating data", details: parsed.error.errors });
      if (parsed.data.rating < 1 || parsed.data.rating > 5) return res.status(400).json({ error: "Rating must be between 1 and 5" });
      const rating = await storage.createSafariRating(parsed.data);
      res.status(201).json(rating);
    } catch (error) {
      console.error("Error creating safari rating:", error);
      res.status(500).json({ error: "Failed to create rating" });
    }
  });

  // ========== ACCOMMODATION ENDPOINTS ==========

  app.get("/api/accommodations", async (req, res) => {
    try {
      const { country, city, propertyType, verified } = req.query;
      const results = await storage.getAccommodations({
        country: country as string | undefined,
        city: city as string | undefined,
        propertyType: propertyType as string | undefined,
        verified: verified === "true" ? true : verified === "false" ? false : undefined,
      });
      res.json(results);
    } catch (error) {
      console.error("Error fetching accommodations:", error);
      res.status(500).json({ error: "Failed to fetch accommodations" });
    }
  });

  app.get("/api/accommodations/:id", async (req, res) => {
    try {
      const accommodation = await storage.getAccommodationById(req.params.id);
      if (!accommodation) return res.status(404).json({ error: "Accommodation not found" });
      res.json(maskVendorContact(accommodation));
    } catch (error) {
      console.error("Error fetching accommodation:", error);
      res.status(500).json({ error: "Failed to fetch accommodation" });
    }
  });

  app.post("/api/accommodations", async (req, res) => {
    try {
      const cleanedData = { ...req.body };
      if (cleanedData.latitude === "" || cleanedData.latitude === null) delete cleanedData.latitude;
      if (cleanedData.longitude === "" || cleanedData.longitude === null) delete cleanedData.longitude;
      if (cleanedData.description === "") cleanedData.description = null;
      if (cleanedData.phone === "") cleanedData.phone = null;
      if (cleanedData.email === "") cleanedData.email = null;
      if (cleanedData.website === "") cleanedData.website = null;
      if (cleanedData.imageUrl === "") cleanedData.imageUrl = null;
      if (cleanedData.amenities === "") cleanedData.amenities = null;
      if (cleanedData.roomTypes === "") cleanedData.roomTypes = null;
      if (cleanedData.bookingPrice === "" || cleanedData.bookingPrice === null) delete cleanedData.bookingPrice;
      else if (cleanedData.bookingPrice) cleanedData.bookingPrice = parseInt(cleanedData.bookingPrice, 10);

      const parsed = insertAccommodationSchema.safeParse(cleanedData);
      if (!parsed.success) return res.status(400).json({ error: "Invalid accommodation data", details: parsed.error.errors });

      let accommodation = await storage.createAccommodation(parsed.data);

      if (parsed.data.bookingPrice && parsed.data.bookingPrice > 0) {
        try {
          const stripeResult = await stripeService.createVendorProduct({
            vendorType: 'accommodation',
            vendorId: accommodation.id,
            name: `Stay at ${accommodation.name}`,
            description: accommodation.description || `Accommodation at ${accommodation.name}`,
            priceInCents: parsed.data.bookingPrice,
            currency: parsed.data.bookingCurrency || 'usd',
            metadata: { propertyType: accommodation.propertyType, city: accommodation.city, country: accommodation.country },
          });
          accommodation = await storage.updateAccommodation(accommodation.id, {
            stripeProductId: stripeResult.productId,
            stripePriceId: stripeResult.priceId,
          }) || accommodation;
        } catch (stripeError) {
          console.error("Failed to create Stripe product for accommodation:", stripeError);
        }
      }

      res.status(201).json(accommodation);
    } catch (error) {
      console.error("Error creating accommodation:", error);
      res.status(500).json({ error: "Failed to create accommodation" });
    }
  });

  app.put("/api/accommodations/:id", async (req, res) => {
    try {
      const existing = await storage.getAccommodationById(req.params.id);
      if (!existing) return res.status(404).json({ error: "Accommodation not found" });

      const updateData = { ...req.body };
      if (updateData.bookingPrice !== undefined) {
        const newPrice = parseInt(updateData.bookingPrice, 10) || 0;
        if (newPrice > 0) {
          try {
            if (existing.stripeProductId) {
              updateData.stripePriceId = await stripeService.updateVendorPrice(existing.stripeProductId, newPrice, updateData.bookingCurrency || existing.bookingCurrency || 'usd');
            } else {
              const stripeResult = await stripeService.createVendorProduct({
                vendorType: 'accommodation', vendorId: existing.id, name: `Stay at ${existing.name}`,
                description: existing.description || `Accommodation at ${existing.name}`,
                priceInCents: newPrice, currency: updateData.bookingCurrency || 'usd',
                metadata: { propertyType: existing.propertyType, city: existing.city, country: existing.country },
              });
              updateData.stripeProductId = stripeResult.productId;
              updateData.stripePriceId = stripeResult.priceId;
            }
          } catch (stripeError) {
            console.error("Failed to update Stripe product for accommodation:", stripeError);
          }
        }
      }

      const accommodation = await storage.updateAccommodation(req.params.id, updateData);
      res.json(accommodation);
    } catch (error) {
      console.error("Error updating accommodation:", error);
      res.status(500).json({ error: "Failed to update accommodation" });
    }
  });

  app.post("/api/accommodations/:id/checkout", async (req, res) => {
    try {
      const accommodation = await storage.getAccommodationById(req.params.id);
      if (!accommodation) return res.status(404).json({ error: "Accommodation not found" });
      if (!accommodation.stripePriceId) return res.status(400).json({ error: "This accommodation does not accept online bookings" });

      const subtotal = accommodation.bookingPrice || 0;
      const { serviceFee, total, feePercent } = calculateServiceFee(subtotal);

      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const baseUrl = `${protocol}://${host}`;

      const session = await stripeService.createCheckoutSession({
        priceId: accommodation.stripePriceId,
        successUrl: `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/booking/cancel`,
        mode: 'payment',
        metadata: { vendorType: 'accommodation', vendorId: accommodation.id, vendorName: accommodation.name, serviceFee: serviceFee.toString(), serviceFeePercent: feePercent.toString() },
      });

      await storage.createPlatformTransaction({
        bookingId: null, vendorType: "accommodation", vendorId: accommodation.id, vendorName: accommodation.name,
        userId: req.body.userId || null, subtotalAmount: subtotal, serviceFeeAmount: serviceFee,
        serviceFeePercent: feePercent, totalAmount: total, currency: accommodation.bookingCurrency || "usd",
        stripeSessionId: session.id, status: "pending",
      });

      // Create escrow entry for vendor payout
      let wallet = await storage.getVendorWallet(accommodation.id, "accommodation");
      if (!wallet) {
        wallet = await storage.createVendorWallet({
          vendorId: accommodation.id,
          vendorType: "accommodation",
          vendorName: accommodation.name,
          currency: accommodation.bookingCurrency || "usd",
        });
      }
      await storage.createEscrowTransaction({
        walletId: wallet.id,
        vendorId: accommodation.id,
        vendorType: "accommodation",
        bookingAmount: total,
        platformFee: serviceFee,
        vendorPayout: subtotal,
        userId: req.body.userId || null,
        stripeSessionId: session.id,
        status: "held",
        description: `accommodation booking - ${accommodation.name}`,
      });
      await storage.updateVendorWallet(wallet.id, {
        pendingBalance: (wallet.pendingBalance || 0) + subtotal,
      });

      res.json({ url: session.url, sessionId: session.id, subtotal, serviceFee, total, feePercent });
    } catch (error) {
      console.error("Error creating accommodation checkout:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.get("/api/accommodations/:id/ratings", async (req, res) => {
    try {
      const ratings = await storage.getAccommodationRatings(req.params.id);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching accommodation ratings:", error);
      res.status(500).json({ error: "Failed to fetch ratings" });
    }
  });

  app.post("/api/accommodations/:id/ratings", async (req, res) => {
    try {
      const parsed = insertAccommodationRatingSchema.safeParse({ ...req.body, accommodationId: req.params.id });
      if (!parsed.success) return res.status(400).json({ error: "Invalid rating data", details: parsed.error.errors });
      if (parsed.data.rating < 1 || parsed.data.rating > 5) return res.status(400).json({ error: "Rating must be between 1 and 5" });
      const rating = await storage.createAccommodationRating(parsed.data);
      res.status(201).json(rating);
    } catch (error) {
      console.error("Error creating accommodation rating:", error);
      res.status(500).json({ error: "Failed to create rating" });
    }
  });

  // ========== COMPANION ENDPOINTS ==========

  app.get("/api/companions", async (req, res) => {
    try {
      const { country, city, serviceType, verified } = req.query;
      const results = await storage.getCompanions({
        country: country as string | undefined,
        city: city as string | undefined,
        serviceType: serviceType as string | undefined,
        verified: verified === "true" ? true : verified === "false" ? false : undefined,
      });
      res.json(results);
    } catch (error) {
      console.error("Error fetching companions:", error);
      res.status(500).json({ error: "Failed to fetch companions" });
    }
  });

  app.get("/api/companions/discover", async (req, res) => {
    try {
      const { city, country, gender, serviceType, lat, lng, radius } = req.query;
      const results = await storage.getDiscoverCompanions({
        city: city as string | undefined,
        country: country as string | undefined,
        gender: gender as string | undefined,
        serviceType: serviceType as string | undefined,
        lat: lat ? parseFloat(lat as string) : undefined,
        lng: lng ? parseFloat(lng as string) : undefined,
        radiusKm: radius ? parseFloat(radius as string) : undefined,
      });
      res.json(results);
    } catch (error) {
      console.error("Error discovering companions:", error);
      res.status(500).json({ error: "Failed to discover companions" });
    }
  });

  app.get("/api/companions/likes/:likedBy", async (req, res) => {
    try {
      const likes = await storage.getCompanionLikes(req.params.likedBy);
      res.json(likes);
    } catch (error) {
      console.error("Error fetching companion likes:", error);
      res.status(500).json({ error: "Failed to fetch likes" });
    }
  });

  app.get("/api/companions/:id", async (req, res) => {
    try {
      const companion = await storage.getCompanionById(req.params.id);
      if (!companion) return res.status(404).json({ error: "Companion not found" });
      res.json(maskVendorContact(companion));
    } catch (error) {
      console.error("Error fetching companion:", error);
      res.status(500).json({ error: "Failed to fetch companion" });
    }
  });

  app.post("/api/companions", async (req, res) => {
    try {
      const cleanedData = { ...req.body };
      if (cleanedData.latitude === "" || cleanedData.latitude === null) delete cleanedData.latitude;
      if (cleanedData.longitude === "" || cleanedData.longitude === null) delete cleanedData.longitude;
      if (cleanedData.description === "") cleanedData.description = null;
      if (cleanedData.phone === "") cleanedData.phone = null;
      if (cleanedData.email === "") cleanedData.email = null;
      if (cleanedData.imageUrl === "") cleanedData.imageUrl = null;
      if (cleanedData.specialties === "") cleanedData.specialties = null;
      if (cleanedData.bookingPrice === "" || cleanedData.bookingPrice === null) delete cleanedData.bookingPrice;
      else if (cleanedData.bookingPrice) cleanedData.bookingPrice = parseInt(cleanedData.bookingPrice, 10);
      if (cleanedData.hourlyRate === "" || cleanedData.hourlyRate === null) delete cleanedData.hourlyRate;
      else if (cleanedData.hourlyRate) cleanedData.hourlyRate = parseInt(cleanedData.hourlyRate, 10);
      if (cleanedData.minimumHours === "" || cleanedData.minimumHours === null) delete cleanedData.minimumHours;
      else if (cleanedData.minimumHours) cleanedData.minimumHours = parseInt(cleanedData.minimumHours, 10);
      if (cleanedData.serviceDescription === "") cleanedData.serviceDescription = null;
      if (cleanedData.serviceCategories === "") cleanedData.serviceCategories = null;
      if (cleanedData.serviceType === "escort") {
        cleanedData.isEscort = true;
        cleanedData.platformFeePercent = 20;
      }

      const parsed = insertCompanionSchema.safeParse(cleanedData);
      if (!parsed.success) return res.status(400).json({ error: "Invalid companion data", details: parsed.error.errors });

      let companion = await storage.createCompanion(parsed.data);

      const priceForStripe = parsed.data.bookingPrice || (parsed.data.hourlyRate && parsed.data.minimumHours ? parsed.data.hourlyRate * parsed.data.minimumHours : null);
      if (priceForStripe && priceForStripe > 0) {
        try {
          const isEscort = parsed.data.serviceType === "escort";
          const stripeResult = await stripeService.createVendorProduct({
            vendorType: 'companion',
            vendorId: companion.id,
            name: isEscort ? `Escort: ${companion.name}` : `Companion: ${companion.name}`,
            description: companion.serviceDescription || companion.description || `Travel companion - ${companion.name}`,
            priceInCents: priceForStripe,
            currency: parsed.data.bookingCurrency || 'usd',
            metadata: { serviceType: companion.serviceType, city: companion.city, country: companion.country, isEscort: isEscort ? 'true' : 'false' },
          });
          companion = await storage.updateCompanion(companion.id, {
            stripeProductId: stripeResult.productId,
            stripePriceId: stripeResult.priceId,
            bookingPrice: priceForStripe,
          }) || companion;
        } catch (stripeError) {
          console.error("Failed to create Stripe product for companion:", stripeError);
        }
      }

      res.status(201).json(companion);
    } catch (error) {
      console.error("Error creating companion:", error);
      res.status(500).json({ error: "Failed to create companion" });
    }
  });

  app.put("/api/companions/:id", async (req, res) => {
    try {
      const existing = await storage.getCompanionById(req.params.id);
      if (!existing) return res.status(404).json({ error: "Companion not found" });

      const updateData = { ...req.body };
      if (updateData.bookingPrice !== undefined) {
        const newPrice = parseInt(updateData.bookingPrice, 10) || 0;
        if (newPrice > 0) {
          try {
            if (existing.stripeProductId) {
              updateData.stripePriceId = await stripeService.updateVendorPrice(existing.stripeProductId, newPrice, updateData.bookingCurrency || existing.bookingCurrency || 'usd');
            } else {
              const stripeResult = await stripeService.createVendorProduct({
                vendorType: 'companion', vendorId: existing.id, name: `Companion: ${existing.name}`,
                description: existing.description || `Travel companion - ${existing.name}`,
                priceInCents: newPrice, currency: updateData.bookingCurrency || 'usd',
                metadata: { serviceType: existing.serviceType, city: existing.city, country: existing.country },
              });
              updateData.stripeProductId = stripeResult.productId;
              updateData.stripePriceId = stripeResult.priceId;
            }
          } catch (stripeError) {
            console.error("Failed to update Stripe product for companion:", stripeError);
          }
        }
      }

      const companion = await storage.updateCompanion(req.params.id, updateData);
      res.json(companion);
    } catch (error) {
      console.error("Error updating companion:", error);
      res.status(500).json({ error: "Failed to update companion" });
    }
  });

  app.post("/api/companions/:id/checkout", async (req, res) => {
    try {
      const companion = await storage.getCompanionById(req.params.id);
      if (!companion) return res.status(404).json({ error: "Companion not found" });
      if (!companion.stripePriceId) return res.status(400).json({ error: "This companion does not accept online bookings" });

      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const baseUrl = `${protocol}://${host}`;

      const { hours } = req.body;
      const isEscort = companion.isEscort || companion.serviceType === "escort";

      let totalPrice = companion.bookingPrice || 0;
      if (isEscort && companion.hourlyRate && hours) {
        const bookingHours = Math.max(parseInt(hours) || 1, companion.minimumHours || 1);
        totalPrice = companion.hourlyRate * bookingHours;
      }

      const platformFee = isEscort ? Math.round(totalPrice * ((companion.platformFeePercent || 20) / 100)) : 0;

      const checkoutOptions: any = {
        priceId: companion.stripePriceId,
        successUrl: `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/booking/cancel`,
        mode: 'payment' as const,
        metadata: {
          vendorType: isEscort ? 'escort' : 'companion',
          vendorId: companion.id,
          vendorName: companion.name,
          isEscort: isEscort ? 'true' : 'false',
          platformFee: platformFee.toString(),
          totalPrice: totalPrice.toString(),
        },
      };

      const { serviceFee: platformServiceFee, feePercent } = calculateServiceFee(totalPrice);
      const totalFee = isEscort ? platformFee + platformServiceFee : platformServiceFee;
      const grandTotal = totalPrice + platformServiceFee;

      const session = await stripeService.createCheckoutSession(checkoutOptions);

      await storage.createPlatformTransaction({
        bookingId: null, vendorType: isEscort ? "escort" : "companion",
        vendorId: companion.id, vendorName: companion.name,
        userId: req.body.userId || null, subtotalAmount: totalPrice,
        serviceFeeAmount: totalFee, serviceFeePercent: feePercent,
        totalAmount: grandTotal, currency: companion.bookingCurrency || "usd",
        stripeSessionId: session.id, status: "pending",
      });

      // Create escrow entry for vendor payout
      let wallet = await storage.getVendorWallet(companion.id, isEscort ? "escort" : "companion");
      if (!wallet) {
        wallet = await storage.createVendorWallet({
          vendorId: companion.id,
          vendorType: isEscort ? "escort" : "companion",
          vendorName: companion.name,
          currency: companion.bookingCurrency || "usd",
        });
      }
      await storage.createEscrowTransaction({
        walletId: wallet.id,
        vendorId: companion.id,
        vendorType: isEscort ? "escort" : "companion",
        bookingAmount: grandTotal,
        platformFee: totalFee,
        vendorPayout: totalPrice - platformFee,
        userId: req.body.userId || null,
        stripeSessionId: session.id,
        status: "held",
        description: `${isEscort ? "escort" : "companion"} booking - ${companion.name}`,
      });
      await storage.updateVendorWallet(wallet.id, {
        pendingBalance: (wallet.pendingBalance || 0) + (totalPrice - platformFee),
      });

      res.json({
        url: session.url,
        sessionId: session.id,
        subtotal: totalPrice,
        serviceFee: platformServiceFee,
        platformFee: isEscort ? platformFee : 0,
        total: grandTotal,
        feePercent,
        vendorReceives: totalPrice - platformFee,
        isEscort,
      });
    } catch (error) {
      console.error("Error creating companion checkout:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.get("/api/companions/:id/ratings", async (req, res) => {
    try {
      const ratings = await storage.getCompanionRatings(req.params.id);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching companion ratings:", error);
      res.status(500).json({ error: "Failed to fetch ratings" });
    }
  });

  app.post("/api/companions/:id/ratings", async (req, res) => {
    try {
      const parsed = insertCompanionRatingSchema.safeParse({ ...req.body, companionId: req.params.id });
      if (!parsed.success) return res.status(400).json({ error: "Invalid rating data", details: parsed.error.errors });
      if (parsed.data.rating < 1 || parsed.data.rating > 5) return res.status(400).json({ error: "Rating must be between 1 and 5" });
      const rating = await storage.createCompanionRating(parsed.data);
      res.status(201).json(rating);
    } catch (error) {
      console.error("Error creating companion rating:", error);
      res.status(500).json({ error: "Failed to create rating" });
    }
  });

  app.post("/api/companions/:id/like", async (req, res) => {
    try {
      const { likedBy, status } = req.body;
      if (!likedBy) return res.status(400).json({ error: "likedBy is required" });

      const existingLike = await storage.getCompanionLikeByCompanionAndUser(req.params.id, likedBy);
      if (existingLike) {
        return res.status(200).json({ ...existingLike, alreadyLiked: true });
      }

      const like = await storage.createCompanionLike({
        companionId: req.params.id,
        likedBy,
        status: status || "liked",
      });

      let matched = false;
      let matchData: any = null;

      if (status === "liked") {
        const companion = await storage.getCompanionById(req.params.id);
        if (companion) {
          const existingMatch = await storage.getCompanionMatchByUserAndCompanion(likedBy, req.params.id);
          if (!existingMatch) {
            let existingConv = await storage.getChatConversationByVendor(likedBy, "companion", req.params.id);
            if (!existingConv) {
              existingConv = await storage.createChatConversation({
                userId: likedBy,
                vendorType: "companion",
                vendorId: req.params.id,
                vendorName: companion.name,
                vendorImageUrl: companion.imageUrl || null,
                hasActiveBooking: false,
                isBlocked: false,
              });
            }

            const match = await storage.createCompanionMatch({
              userId: likedBy,
              companionId: req.params.id,
              conversationId: existingConv.id,
              isActive: true,
            });

            matched = true;
            matchData = {
              matchId: match.id,
              conversationId: existingConv.id,
              companionName: companion.name,
              companionPhoto: companion.imageUrl,
            };
          }
        }
      }

      res.status(201).json({ ...like, matched, matchData });
    } catch (error) {
      console.error("Error liking companion:", error);
      res.status(500).json({ error: "Failed to like companion" });
    }
  });

  app.get("/api/companions/matches/:userId", async (req, res) => {
    try {
      const matches = await storage.getCompanionMatches(req.params.userId);
      const enriched = await Promise.all(matches.map(async (match: any) => {
        const companion = await storage.getCompanionById(match.companionId);
        return {
          ...match,
          companion: companion ? {
            id: companion.id,
            name: companion.name,
            imageUrl: companion.imageUrl,
            photos: companion.photos,
            city: companion.city,
            country: companion.country,
            serviceType: companion.serviceType,
            age: companion.age,
            verified: companion.verified,
            averageRating: companion.averageRating,
            availability: companion.availability,
          } : null,
        };
      }));
      res.json(enriched.filter((m: any) => m.companion));
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ error: "Failed to fetch matches" });
    }
  });

  // Companion profile photo upload
  const companionPhotosDir = path.resolve(process.cwd(), "uploads", "companions");
  if (!fs.existsSync(companionPhotosDir)) {
    fs.mkdirSync(companionPhotosDir, { recursive: true });
  }

  const companionPhotoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, companionPhotosDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, `companion-${uniqueSuffix}${ext}`);
    },
  });

  const companionUpload = multer({
    storage: companionPhotoStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = /jpeg|jpg|png|gif|webp|heic/;
      const ext = allowed.test(path.extname(file.originalname).toLowerCase());
      const mime = allowed.test(file.mimetype.split("/")[1] || "");
      if (ext || mime) cb(null, true);
      else cb(new Error("Only image files are allowed"));
    },
  });

  app.post("/api/companions/upload-photo", companionUpload.single("photo"), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No photo provided" });
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
      const host = req.headers["x-forwarded-host"] || req.get("host");
      const photoUrl = `${protocol}://${host}/uploads/companions/${req.file.filename}`;
      res.json({ url: photoUrl });
    } catch (error) {
      console.error("Error uploading companion photo:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });

  // Seating arrangement upload
  const seatingDir = path.resolve(process.cwd(), "uploads", "seating");
  if (!fs.existsSync(seatingDir)) {
    fs.mkdirSync(seatingDir, { recursive: true });
  }

  const seatingStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, seatingDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });

  const seatingUpload = multer({
    storage: seatingStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("image/")) cb(null, true);
      else cb(new Error("Only image files are allowed"));
    },
  });

  app.post("/api/restaurants/upload-seating", seatingUpload.single("seating"), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No image provided" });
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
      const host = req.headers["x-forwarded-host"] || req.get("host");
      const imageUrl = `${protocol}://${host}/uploads/seating/${req.file.filename}`;
      res.json({ url: imageUrl });
    } catch (error) {
      console.error("Error uploading seating arrangement:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // ===== MENU ITEMS =====
  app.get("/api/restaurants/:id/menu", async (req, res) => {
    try {
      const items = await storage.getMenuItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  app.post("/api/restaurants/:id/menu", async (req, res) => {
    try {
      const restaurant = await storage.getRestaurantById(req.params.id);
      if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

      const data = { ...req.body, restaurantId: req.params.id };
      if (typeof data.price === "string") data.price = parseInt(data.price);
      if (typeof data.sortOrder === "string") data.sortOrder = parseInt(data.sortOrder) || 0;

      const parsed = insertMenuItemSchema.safeParse(data);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid menu item data", details: parsed.error.errors });
      }

      const item = await storage.createMenuItem(parsed.data);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating menu item:", error);
      res.status(500).json({ error: "Failed to create menu item" });
    }
  });

  app.put("/api/menu-items/:id", async (req, res) => {
    try {
      const existing = await storage.getMenuItemById(req.params.id);
      if (!existing) return res.status(404).json({ error: "Menu item not found" });

      const data = { ...req.body };
      if (typeof data.price === "string") data.price = parseInt(data.price);
      if (typeof data.sortOrder === "string") data.sortOrder = parseInt(data.sortOrder) || 0;

      const updated = await storage.updateMenuItem(req.params.id, data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating menu item:", error);
      res.status(500).json({ error: "Failed to update menu item" });
    }
  });

  app.delete("/api/menu-items/:id", async (req, res) => {
    try {
      const existing = await storage.getMenuItemById(req.params.id);
      if (!existing) return res.status(404).json({ error: "Menu item not found" });

      await storage.deleteMenuItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting menu item:", error);
      res.status(500).json({ error: "Failed to delete menu item" });
    }
  });

  // ===== DELIVERY ORDERS =====
  app.post("/api/delivery-orders", async (req, res) => {
    try {
      const { items, customerName, customerPhone, customerEmail, restaurantId, orderType, deliveryAddress, deliveryCity, deliveryNotes } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Order must contain at least one item" });
      }
      if (!customerName || !restaurantId) {
        return res.status(400).json({ error: "Customer name and restaurant ID are required" });
      }

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

      const menuItemIds = items.map((i: any) => i.menuItemId);
      const menuItemsData = await Promise.all(menuItemIds.map((id: string) => storage.getMenuItemById(id)));

      let subtotal = 0;
      const orderItems: any[] = [];
      for (const cartItem of items) {
        const menuItem = menuItemsData.find((m: any) => m && m.id === cartItem.menuItemId);
        if (!menuItem) return res.status(400).json({ error: `Menu item ${cartItem.menuItemId} not found` });
        if (!menuItem.isAvailable) return res.status(400).json({ error: `"${menuItem.name}" is currently unavailable` });

        const itemTotal = menuItem.price * (cartItem.quantity || 1);
        subtotal += itemTotal;
        orderItems.push({
          menuItemId: menuItem.id,
          itemName: menuItem.name,
          itemPrice: menuItem.price,
          quantity: cartItem.quantity || 1,
          specialInstructions: cartItem.specialInstructions || null,
        });
      }

      const isDelivery = orderType === "delivery";
      const deliveryFee = isDelivery && restaurant.deliveryFee ? restaurant.deliveryFee : 0;
      const serviceFee = Math.round((subtotal + deliveryFee) * PLATFORM_SERVICE_FEE_PERCENT / 100);
      const total = subtotal + deliveryFee + serviceFee;
      const currency = restaurant.bookingCurrency || "usd";

      const order = await storage.createDeliveryOrder({
        restaurantId,
        customerName,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        orderType: orderType || "delivery",
        deliveryAddress: deliveryAddress || null,
        deliveryCity: deliveryCity || null,
        deliveryNotes: deliveryNotes || null,
        status: "pending",
        subtotalAmount: subtotal,
        deliveryFeeAmount: deliveryFee,
        serviceFeeAmount: serviceFee,
        totalAmount: total,
        currency,
      });

      const createdItems = await storage.createDeliveryOrderItems(
        orderItems.map((oi: any) => ({ ...oi, orderId: order.id }))
      );

      try {
        const stripeProduct = await stripeService.createVendorProduct({
          name: `Order from ${restaurant.name}`,
          description: `${orderItems.length} item(s) - ${orderType || "delivery"}`,
          vendorType: "restaurant",
          vendorId: restaurant.id,
          unitAmount: total,
          currency,
        });

        if (stripeProduct?.stripePriceId) {
          const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
          const host = req.headers["x-forwarded-host"] || req.get("host");
          const baseUrl = `${protocol}://${host}`;

          const session = await stripeService.createCheckoutSession({
            priceId: stripeProduct.stripePriceId,
            successUrl: `${baseUrl}/app#order-success/${order.id}`,
            cancelUrl: `${baseUrl}/app#order-cancelled/${order.id}`,
            metadata: {
              orderId: order.id,
              vendorType: "restaurant",
              vendorId: restaurant.id,
              orderType: orderType || "delivery",
            },
          });

          if (session?.url) {
            const updatedOrder = await db.update(deliveryOrders).set({ stripeSessionId: session.id, updatedAt: new Date() }).where(eq(deliveryOrders.id, order.id)).returning();
            return res.json({ order: { ...(updatedOrder[0] || order), items: createdItems }, checkoutUrl: session.url });
          }
        }
      } catch (stripeErr) {
        console.error("Stripe checkout failed for order:", stripeErr);
      }

      res.json({ order: { ...order, items: createdItems } });
    } catch (error) {
      console.error("Error creating delivery order:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.get("/api/delivery-orders/:id", async (req, res) => {
    try {
      const order = await storage.getDeliveryOrderById(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });

      const items = await storage.getDeliveryOrderItems(order.id);
      const restaurant = await storage.getRestaurantById(order.restaurantId);
      res.json({ ...order, items, restaurant: restaurant ? { name: restaurant.name, address: restaurant.address, city: restaurant.city } : null });
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.get("/api/delivery-orders", async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.restaurantId) filters.restaurantId = req.query.restaurantId as string;
      if (req.query.status) filters.status = req.query.status as string;
      const orders = await storage.getDeliveryOrders(filters);
      const ordersWithItems = await Promise.all(orders.map(async (order: any) => {
        const items = await storage.getDeliveryOrderItems(order.id);
        return { ...order, items };
      }));
      res.json(ordersWithItems);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.put("/api/delivery-orders/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status", validStatuses });
      }

      const updated = await storage.updateDeliveryOrderStatus(req.params.id, status);
      if (!updated) return res.status(404).json({ error: "Order not found" });

      res.json(updated);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // Profile photo upload
  const profilePhotosDir = path.resolve(process.cwd(), "uploads", "profiles");
  if (!fs.existsSync(profilePhotosDir)) {
    fs.mkdirSync(profilePhotosDir, { recursive: true });
  }

  const profilePhotoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, profilePhotosDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, `profile-${uniqueSuffix}${ext}`);
    },
  });

  const profileUpload = multer({
    storage: profilePhotoStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = /jpeg|jpg|png|gif|webp|heic/;
      const ext = allowed.test(path.extname(file.originalname).toLowerCase());
      const mime = allowed.test(file.mimetype.split("/")[1] || "");
      if (ext || mime) cb(null, true);
      else cb(new Error("Only image files are allowed"));
    },
  });

  app.post("/api/profile/upload-photo", (req, res) => {
    profileUpload.single("photo")(req, res, (err) => {
      if (err) {
        console.error("Multer upload error:", err);
        return res.status(400).json({ error: err.message || "Upload failed" });
      }
      try {
        if (!req.file) {
          console.error("No file in request. Content-Type:", req.headers["content-type"]);
          return res.status(400).json({ error: "No photo provided" });
        }
        const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
        const host = req.headers["x-forwarded-host"] || req.get("host");
        const photoUrl = `${protocol}://${host}/uploads/profiles/${req.file.filename}`;
        console.log("Profile photo uploaded:", photoUrl);
        res.json({ url: photoUrl });
      } catch (error) {
        console.error("Error uploading profile photo:", error);
        res.status(500).json({ error: "Failed to upload photo" });
      }
    });
  });

  // Stripe payment endpoints
  
  // Get Stripe publishable key
  app.get("/api/stripe/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting Stripe config:", error);
      res.status(500).json({ error: "Failed to get Stripe configuration" });
    }
  });

  // List available products (experiences, safaris, etc.)
  app.get("/api/products", async (req, res) => {
    try {
      // First try the database (synced data)
      const rows = await stripeStorage.listProductsWithPrices();

      if (rows && rows.length > 0) {
        const productsMap = new Map();
        for (const row of rows as any[]) {
          if (!productsMap.has(row.product_id)) {
            productsMap.set(row.product_id, {
              id: row.product_id,
              name: row.product_name,
              description: row.product_description,
              active: row.product_active,
              metadata: row.product_metadata,
              images: row.product_images,
              prices: []
            });
          }
          if (row.price_id) {
            productsMap.get(row.product_id).prices.push({
              id: row.price_id,
              unit_amount: row.unit_amount,
              currency: row.currency,
              recurring: row.recurring,
              active: row.price_active,
              metadata: row.price_metadata,
            });
          }
        }
        res.json({ data: Array.from(productsMap.values()) });
      } else {
        // Fall back to direct Stripe API call
        const products = await stripeService.listProductsFromStripeAPI();
        res.json({ data: products });
      }
    } catch (error) {
      console.error("Error listing products:", error);
      res.status(500).json({ error: "Failed to list products" });
    }
  });

  // Get product by ID
  app.get("/api/products/:id", async (req, res) => {
    try {
      // First try the database
      const product = await stripeStorage.getProduct(req.params.id);
      if (product) {
        const prices = await stripeStorage.getPricesForProduct(req.params.id);
        return res.json({ ...product, prices });
      }
      
      // Fall back to direct Stripe API
      const productFromStripe = await stripeService.getProductFromStripeAPI(req.params.id);
      res.json(productFromStripe);
    } catch (error: any) {
      if (error.statusCode === 404 || error.code === 'resource_missing') {
        return res.status(404).json({ error: "Product not found" });
      }
      console.error("Error getting product:", error);
      res.status(500).json({ error: "Failed to get product" });
    }
  });

  // Create checkout session
  app.post("/api/checkout", async (req, res) => {
    try {
      const { priceId, productName, metadata } = req.body;

      if (!priceId) {
        return res.status(400).json({ error: "Price ID is required" });
      }

      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const baseUrl = `${protocol}://${host}`;

      const session = await stripeService.createCheckoutSession({
        priceId,
        successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/checkout/cancel`,
        mode: 'payment',
        metadata: metadata || { productName: productName || 'Tripsbnb Booking' },
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // ========== TRIP ENDPOINTS ==========

  app.get("/api/trips", async (req, res) => {
    try {
      const allTrips = await storage.getTrips();
      res.json(allTrips);
    } catch (error) {
      console.error("Error fetching trips:", error);
      res.status(500).json({ error: "Failed to fetch trips" });
    }
  });

  app.get("/api/trips/:id", async (req, res) => {
    try {
      const trip = await storage.getTripById(req.params.id);
      if (!trip) return res.status(404).json({ error: "Trip not found" });
      const tripBookings = await storage.getBookings(trip.id);
      res.json({ ...trip, bookings: tripBookings });
    } catch (error) {
      console.error("Error fetching trip:", error);
      res.status(500).json({ error: "Failed to fetch trip" });
    }
  });

  app.post("/api/trips", async (req, res) => {
    try {
      const parsed = insertTripSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid trip data", details: parsed.error.errors });
      const trip = await storage.createTrip(parsed.data);
      res.status(201).json(trip);
    } catch (error) {
      console.error("Error creating trip:", error);
      res.status(500).json({ error: "Failed to create trip" });
    }
  });

  app.put("/api/trips/:id", async (req, res) => {
    try {
      const trip = await storage.updateTrip(req.params.id, req.body);
      if (!trip) return res.status(404).json({ error: "Trip not found" });
      res.json(trip);
    } catch (error) {
      console.error("Error updating trip:", error);
      res.status(500).json({ error: "Failed to update trip" });
    }
  });

  app.delete("/api/trips/:id", async (req, res) => {
    try {
      await storage.deleteTrip(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting trip:", error);
      res.status(500).json({ error: "Failed to delete trip" });
    }
  });

  // ========== BOOKING ENDPOINTS ==========

  app.get("/api/bookings", async (req, res) => {
    try {
      const { tripId } = req.query;
      const allBookings = await storage.getBookings(tripId as string | undefined);
      res.json(allBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const parsed = insertBookingSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid booking data", details: parsed.error.errors });
      const booking = await storage.createBooking(parsed.data);
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  app.put("/api/bookings/:id", async (req, res) => {
    try {
      const booking = await storage.updateBooking(req.params.id, req.body);
      if (!booking) return res.status(404).json({ error: "Booking not found" });
      res.json(booking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ error: "Failed to update booking" });
    }
  });

  app.delete("/api/bookings/:id", async (req, res) => {
    try {
      await storage.deleteBooking(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting booking:", error);
      res.status(500).json({ error: "Failed to delete booking" });
    }
  });

  // ========== TRIP MEMORIES ENDPOINTS ==========

  app.use("/uploads", require("express").static(path.resolve(process.cwd(), "uploads")));

  app.get("/api/trips/:tripId/memories", async (req, res) => {
    try {
      const memories = await storage.getTripMemories(req.params.tripId);
      res.json(memories);
    } catch (error) {
      console.error("Error fetching trip memories:", error);
      res.status(500).json({ error: "Failed to fetch memories" });
    }
  });

  app.post("/api/trips/:tripId/memories", upload.single("photo"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No photo uploaded" });
      }

      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const baseUrl = `${protocol}://${host}`;
      const imageUrl = `${baseUrl}/uploads/memories/${file.filename}`;

      const memory = await storage.createTripMemory({
        tripId: req.params.tripId,
        imageUrl,
        caption: req.body.caption || null,
        location: req.body.location || null,
        takenAt: req.body.takenAt || null,
      });

      res.status(201).json(memory);
    } catch (error) {
      console.error("Error creating trip memory:", error);
      res.status(500).json({ error: "Failed to create memory" });
    }
  });

  app.put("/api/memories/:id", async (req, res) => {
    try {
      const memory = await storage.updateTripMemory(req.params.id, {
        caption: req.body.caption,
        location: req.body.location,
      });
      if (!memory) return res.status(404).json({ error: "Memory not found" });
      res.json(memory);
    } catch (error) {
      console.error("Error updating memory:", error);
      res.status(500).json({ error: "Failed to update memory" });
    }
  });

  app.delete("/api/memories/:id", async (req, res) => {
    try {
      const memory = await storage.getTripMemoryById(req.params.id);
      if (memory) {
        const filename = memory.imageUrl.split("/").pop();
        if (filename) {
          const filePath = path.join(uploadsDir, filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      }
      await storage.deleteTripMemory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting memory:", error);
      res.status(500).json({ error: "Failed to delete memory" });
    }
  });

  app.post("/api/trips/:tripId/memories/email", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      const trip = await storage.getTripById(req.params.tripId);
      if (!trip) return res.status(404).json({ error: "Trip not found" });

      const memories = await storage.getTripMemories(req.params.tripId);
      if (memories.length === 0) return res.status(400).json({ error: "No memories to share" });

      const tripBookings = await storage.getBookings(trip.id);

      let htmlContent = `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #FAFAF8; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1A4D2E; font-size: 28px; margin: 0;">Tripsbnb</h1>
            <p style="color: #DAA520; font-size: 14px; letter-spacing: 2px; margin: 5px 0;">YOUR TRAVEL MEMORIES</p>
          </div>
          <div style="background: white; border-radius: 16px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
            <h2 style="color: #1A4D2E; margin: 0 0 5px;">${trip.name}</h2>
            ${trip.destination ? `<p style="color: #666; margin: 0 0 20px;">${trip.destination}</p>` : ''}
            ${tripBookings.length > 0 ? `
              <div style="margin-bottom: 20px; padding: 15px; background: #f5f5f0; border-radius: 8px;">
                <p style="font-weight: bold; color: #1A4D2E; margin: 0 0 8px;">Trip Highlights</p>
                ${tripBookings.map(b => `<p style="margin: 3px 0; color: #555;">&#8226; ${b.vendorName}${b.checkInDate ? ` - ${b.checkInDate}` : ''}</p>`).join('')}
              </div>
            ` : ''}
            <h3 style="color: #1A4D2E; border-bottom: 2px solid #DAA520; padding-bottom: 8px;">Photo Memories (${memories.length})</h3>
            ${memories.map(m => `
              <div style="margin-bottom: 20px;">
                <img src="${m.imageUrl}" style="width: 100%; border-radius: 12px; display: block;" alt="${m.caption || 'Trip photo'}" />
                ${m.caption ? `<p style="color: #333; margin: 8px 0 0; font-style: italic;">${m.caption}</p>` : ''}
                ${m.location ? `<p style="color: #888; margin: 4px 0 0; font-size: 12px;">&#128205; ${m.location}</p>` : ''}
              </div>
            `).join('')}
          </div>
          <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">Sent with love from Tripsbnb</p>
        </div>
      `;

      const sgApiKey = process.env.SENDGRID_API_KEY;
      if (!sgApiKey) {
        return res.status(500).json({ error: "Email service not configured. Please set up SendGrid." });
      }

      const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sgApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: process.env.SENDGRID_FROM_EMAIL || "memories@tripsbnb.app", name: "Tripsbnb" },
          subject: `Your Trip Memories: ${trip.name}`,
          content: [{ type: "text/html", value: htmlContent }],
        }),
      });

      if (!sgResponse.ok) {
        const errorText = await sgResponse.text();
        console.error("SendGrid error:", errorText);
        return res.status(500).json({ error: "Failed to send email" });
      }

      res.json({ success: true, message: "Memories sent to your email!" });
    } catch (error) {
      console.error("Error sending memories email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // ========== CAR RENTAL ENDPOINTS ==========

  app.get("/api/car-rentals", async (req, res) => {
    try {
      const { country, city, vehicleType, transmission, fuelType, verified } = req.query;
      const results = await storage.getCarRentals({
        country: country as string | undefined,
        city: city as string | undefined,
        vehicleType: vehicleType as string | undefined,
        transmission: transmission as string | undefined,
        fuelType: fuelType as string | undefined,
        verified: verified === "true" ? true : verified === "false" ? false : undefined,
      });
      res.json(results);
    } catch (error) {
      console.error("Error fetching car rentals:", error);
      res.status(500).json({ error: "Failed to fetch car rentals" });
    }
  });

  app.get("/api/car-rentals/:id", async (req, res) => {
    try {
      const carRental = await storage.getCarRentalById(req.params.id);
      if (!carRental) return res.status(404).json({ error: "Car rental not found" });
      res.json(maskVendorContact(carRental));
    } catch (error) {
      console.error("Error fetching car rental:", error);
      res.status(500).json({ error: "Failed to fetch car rental" });
    }
  });

  app.post("/api/car-rentals", async (req, res) => {
    try {
      const cleanedData = { ...req.body };
      if (cleanedData.latitude === "" || cleanedData.latitude === null) delete cleanedData.latitude;
      if (cleanedData.longitude === "" || cleanedData.longitude === null) delete cleanedData.longitude;
      if (cleanedData.description === "") cleanedData.description = null;
      if (cleanedData.phone === "") cleanedData.phone = null;
      if (cleanedData.email === "") cleanedData.email = null;
      if (cleanedData.website === "") cleanedData.website = null;
      if (cleanedData.imageUrl === "") cleanedData.imageUrl = null;
      if (cleanedData.seats === "" || cleanedData.seats === null) delete cleanedData.seats;
      else if (cleanedData.seats) cleanedData.seats = parseInt(cleanedData.seats, 10);
      if (cleanedData.year === "" || cleanedData.year === null) delete cleanedData.year;
      else if (cleanedData.year) cleanedData.year = parseInt(cleanedData.year, 10);
      if (cleanedData.minimumAge === "" || cleanedData.minimumAge === null) delete cleanedData.minimumAge;
      else if (cleanedData.minimumAge) cleanedData.minimumAge = parseInt(cleanedData.minimumAge, 10);
      if (cleanedData.bookingPrice === "" || cleanedData.bookingPrice === null) delete cleanedData.bookingPrice;
      else if (cleanedData.bookingPrice) cleanedData.bookingPrice = parseInt(cleanedData.bookingPrice, 10);

      const parsed = insertCarRentalSchema.safeParse(cleanedData);
      if (!parsed.success) return res.status(400).json({ error: "Invalid car rental data", details: parsed.error.errors });

      let carRental = await storage.createCarRental(parsed.data);

      if (parsed.data.bookingPrice && parsed.data.bookingPrice > 0) {
        try {
          const stripeResult = await stripeService.createVendorProduct({
            vendorType: 'car_rental',
            vendorId: carRental.id,
            name: `Car Rental: ${carRental.name}`,
            description: carRental.description || `Car rental - ${carRental.name}`,
            priceInCents: parsed.data.bookingPrice,
            currency: parsed.data.bookingCurrency || 'usd',
            metadata: { vehicleType: carRental.vehicleType, city: carRental.city, country: carRental.country },
          });
          carRental = await storage.updateCarRental(carRental.id, {
            stripeProductId: stripeResult.productId,
            stripePriceId: stripeResult.priceId,
          }) || carRental;
        } catch (stripeError) {
          console.error("Failed to create Stripe product for car rental:", stripeError);
        }
      }

      res.status(201).json(carRental);
    } catch (error) {
      console.error("Error creating car rental:", error);
      res.status(500).json({ error: "Failed to create car rental" });
    }
  });

  app.put("/api/car-rentals/:id", async (req, res) => {
    try {
      const existing = await storage.getCarRentalById(req.params.id);
      if (!existing) return res.status(404).json({ error: "Car rental not found" });

      const updateData = { ...req.body };
      if (updateData.bookingPrice !== undefined) {
        const newPrice = parseInt(updateData.bookingPrice, 10) || 0;
        if (newPrice > 0) {
          try {
            if (existing.stripeProductId) {
              updateData.stripePriceId = await stripeService.updateVendorPrice(existing.stripeProductId, newPrice, updateData.bookingCurrency || existing.bookingCurrency || 'usd');
            } else {
              const stripeResult = await stripeService.createVendorProduct({
                vendorType: 'car_rental', vendorId: existing.id, name: `Car Rental: ${existing.name}`,
                description: existing.description || `Car rental - ${existing.name}`,
                priceInCents: newPrice, currency: updateData.bookingCurrency || 'usd',
                metadata: { vehicleType: existing.vehicleType, city: existing.city, country: existing.country },
              });
              updateData.stripeProductId = stripeResult.productId;
              updateData.stripePriceId = stripeResult.priceId;
            }
          } catch (stripeError) {
            console.error("Failed to update Stripe product for car rental:", stripeError);
          }
        }
      }

      const carRental = await storage.updateCarRental(req.params.id, updateData);
      res.json(carRental);
    } catch (error) {
      console.error("Error updating car rental:", error);
      res.status(500).json({ error: "Failed to update car rental" });
    }
  });

  app.post("/api/car-rentals/:id/checkout", async (req, res) => {
    try {
      const carRental = await storage.getCarRentalById(req.params.id);
      if (!carRental) return res.status(404).json({ error: "Car rental not found" });
      if (!carRental.stripePriceId) return res.status(400).json({ error: "This car rental does not accept online bookings" });

      const subtotal = carRental.bookingPrice || 0;
      const { serviceFee, total, feePercent } = calculateServiceFee(subtotal);

      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const baseUrl = `${protocol}://${host}`;

      const session = await stripeService.createCheckoutSession({
        priceId: carRental.stripePriceId,
        successUrl: `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/booking/cancel`,
        mode: 'payment',
        metadata: { vendorType: 'car_rental', vendorId: carRental.id, vendorName: carRental.name, serviceFee: serviceFee.toString(), serviceFeePercent: feePercent.toString() },
      });

      await storage.createPlatformTransaction({
        bookingId: null, vendorType: "car_rental", vendorId: carRental.id, vendorName: carRental.name,
        userId: req.body.userId || null, subtotalAmount: subtotal, serviceFeeAmount: serviceFee,
        serviceFeePercent: feePercent, totalAmount: total, currency: carRental.bookingCurrency || "usd",
        stripeSessionId: session.id, status: "pending",
      });

      let wallet = await storage.getVendorWallet(carRental.id, "car_rental");
      if (!wallet) {
        wallet = await storage.createVendorWallet({
          vendorId: carRental.id,
          vendorType: "car_rental",
          vendorName: carRental.name,
          currency: carRental.bookingCurrency || "usd",
        });
      }
      await storage.createEscrowTransaction({
        walletId: wallet.id,
        vendorId: carRental.id,
        vendorType: "car_rental",
        bookingAmount: total,
        platformFee: serviceFee,
        vendorPayout: subtotal,
        userId: req.body.userId || null,
        stripeSessionId: session.id,
        status: "held",
        description: `car rental booking - ${carRental.name}`,
      });
      await storage.updateVendorWallet(wallet.id, {
        pendingBalance: (wallet.pendingBalance || 0) + subtotal,
      });

      res.json({ url: session.url, sessionId: session.id, subtotal, serviceFee, total, feePercent });
    } catch (error) {
      console.error("Error creating car rental checkout:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.get("/api/car-rentals/:id/ratings", async (req, res) => {
    try {
      const ratings = await storage.getCarRentalRatings(req.params.id);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching car rental ratings:", error);
      res.status(500).json({ error: "Failed to fetch ratings" });
    }
  });

  app.post("/api/car-rentals/:id/ratings", async (req, res) => {
    try {
      const parsed = insertCarRentalRatingSchema.safeParse({ ...req.body, carRentalId: req.params.id });
      if (!parsed.success) return res.status(400).json({ error: "Invalid rating data", details: parsed.error.errors });
      if (parsed.data.rating < 1 || parsed.data.rating > 5) return res.status(400).json({ error: "Rating must be between 1 and 5" });
      const rating = await storage.createCarRentalRating(parsed.data);
      res.status(201).json(rating);
    } catch (error) {
      console.error("Error creating car rental rating:", error);
      res.status(500).json({ error: "Failed to create rating" });
    }
  });

  // ============ RENTAL DAMAGE REPORTS ============

  app.get("/api/car-rentals/:id/damage-reports", async (req, res) => {
    try {
      const { bookingId } = req.query;
      const reports = await storage.getDamageReports(req.params.id, bookingId as string | undefined);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching damage reports:", error);
      res.status(500).json({ error: "Failed to fetch damage reports" });
    }
  });

  app.post("/api/car-rentals/:id/damage-reports", async (req, res) => {
    try {
      const data = {
        ...req.body,
        carRentalId: req.params.id,
        acknowledgedAt: req.body.acknowledgedAt ? new Date(req.body.acknowledgedAt) : new Date(),
      };
      const report = await storage.createDamageReport(data);
      res.status(201).json(report);
    } catch (error) {
      console.error("Error creating damage report:", error);
      res.status(500).json({ error: "Failed to create damage report" });
    }
  });

  // ============ RENTAL AGREEMENTS ============

  app.get("/api/car-rentals/:id/agreement", async (req, res) => {
    try {
      const { deviceId, bookingId } = req.query;
      if (!deviceId) return res.status(400).json({ error: "Device ID required" });
      const agreement = await storage.getRentalAgreement(req.params.id, deviceId as string, bookingId as string | undefined);
      res.json(agreement || null);
    } catch (error) {
      console.error("Error fetching rental agreement:", error);
      res.status(500).json({ error: "Failed to fetch rental agreement" });
    }
  });

  app.post("/api/car-rentals/:id/agreement", async (req, res) => {
    try {
      const data = {
        ...req.body,
        carRentalId: req.params.id,
        pickupDate: req.body.pickupDate ? new Date(req.body.pickupDate) : new Date(),
        returnDate: req.body.returnDate ? new Date(req.body.returnDate) : new Date(),
      };
      const agreement = await storage.createRentalAgreement(data);
      res.status(201).json(agreement);
    } catch (error) {
      console.error("Error creating rental agreement:", error);
      res.status(500).json({ error: "Failed to create rental agreement" });
    }
  });

  app.put("/api/car-rentals/:id/agreement/:agreementId", async (req, res) => {
    try {
      const agreement = await storage.updateRentalAgreement(req.params.agreementId, req.body);
      if (!agreement) return res.status(404).json({ error: "Agreement not found" });
      res.json(agreement);
    } catch (error) {
      console.error("Error updating rental agreement:", error);
      res.status(500).json({ error: "Failed to update rental agreement" });
    }
  });

  // ============ SAFETY REPORTS ============

  app.post("/api/safety-reports", async (req, res) => {
    try {
      const { deviceId, category, description, location, vendorId, vendorType } = req.body;
      if (!deviceId || !category || !description) {
        return res.status(400).json({ error: "Device ID, category, and description are required" });
      }
      const report = await storage.createSafetyReport({
        deviceId,
        category,
        description,
        location: location || null,
        vendorId: vendorId || null,
        vendorType: vendorType || null,
      });
      res.status(201).json(report);
    } catch (error) {
      console.error("Error creating safety report:", error);
      res.status(500).json({ error: "Failed to submit safety report" });
    }
  });

  app.get("/api/safety-reports", async (req, res) => {
    try {
      const { deviceId } = req.query;
      if (!deviceId) return res.status(400).json({ error: "Device ID required" });
      const reports = await storage.getSafetyReports(deviceId as string);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching safety reports:", error);
      res.status(500).json({ error: "Failed to fetch safety reports" });
    }
  });

  // ============ FLASH DEALS ============

  app.get("/api/deals", async (req, res) => {
    try {
      const { country, city, vendorType } = req.query;
      const deals = await storage.getFlashDeals({
        country: country as string | undefined,
        city: city as string | undefined,
        vendorType: vendorType as string | undefined,
        activeOnly: true,
      });
      res.json(deals);
    } catch (error) {
      console.error("Error fetching flash deals:", error);
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  app.get("/api/deals/all", async (req, res) => {
    try {
      const deals = await storage.getFlashDeals({ activeOnly: false });
      res.json(deals);
    } catch (error) {
      console.error("Error fetching all deals:", error);
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  app.get("/api/deals/last-minute", async (req, res) => {
    try {
      const deals = await storage.getLastMinuteDeals();
      res.json(deals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/deals/early-bird", async (req, res) => {
    try {
      const deals = await storage.getEarlyBirdDeals();
      res.json(deals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/deals/:id", async (req, res) => {
    try {
      const deal = await storage.getFlashDealById(req.params.id);
      if (!deal) return res.status(404).json({ error: "Deal not found" });
      res.json(deal);
    } catch (error) {
      console.error("Error fetching deal:", error);
      res.status(500).json({ error: "Failed to fetch deal" });
    }
  });

  app.post("/api/deals", async (req, res) => {
    try {
      const cleanedData = { ...req.body };
      if (cleanedData.originalPrice) cleanedData.originalPrice = parseInt(cleanedData.originalPrice, 10);
      if (cleanedData.dealPrice) cleanedData.dealPrice = parseInt(cleanedData.dealPrice, 10);
      if (cleanedData.discountPercent) cleanedData.discountPercent = parseInt(cleanedData.discountPercent, 10);
      if (cleanedData.maxRedemptions) cleanedData.maxRedemptions = parseInt(cleanedData.maxRedemptions, 10);
      if (cleanedData.startsAt) cleanedData.startsAt = new Date(cleanedData.startsAt);
      if (cleanedData.expiresAt) cleanedData.expiresAt = new Date(cleanedData.expiresAt);

      const parsed = insertFlashDealSchema.safeParse(cleanedData);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid deal data", details: parsed.error.errors });
      }
      const deal = await storage.createFlashDeal(parsed.data);
      res.status(201).json(deal);
    } catch (error) {
      console.error("Error creating flash deal:", error);
      res.status(500).json({ error: "Failed to create deal" });
    }
  });

  app.put("/api/deals/:id", async (req, res) => {
    try {
      const deal = await storage.updateFlashDeal(req.params.id, req.body);
      if (!deal) return res.status(404).json({ error: "Deal not found" });
      res.json(deal);
    } catch (error) {
      console.error("Error updating deal:", error);
      res.status(500).json({ error: "Failed to update deal" });
    }
  });

  app.post("/api/deals/:id/redeem", async (req, res) => {
    try {
      const deal = await storage.getFlashDealById(req.params.id);
      if (!deal) return res.status(404).json({ error: "Deal not found" });
      if (!deal.isActive) return res.status(400).json({ error: "Deal is no longer active" });
      if (deal.expiresAt && new Date(deal.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Deal has expired" });
      }
      if (deal.maxRedemptions && deal.maxRedemptions > 0 && (deal.currentRedemptions || 0) >= deal.maxRedemptions) {
        return res.status(400).json({ error: "Deal is sold out" });
      }
      await storage.incrementDealRedemption(req.params.id);
      res.json({ success: true, message: "Deal redeemed!" });
    } catch (error) {
      console.error("Error redeeming deal:", error);
      res.status(500).json({ error: "Failed to redeem deal" });
    }
  });

  app.get("/api/deals/vendor/:vendorId", async (req, res) => {
    try {
      const deals = await db.select().from(flashDeals)
        .where(eq(flashDeals.vendorId, req.params.vendorId))
        .orderBy(desc(flashDeals.createdAt));
      res.json(deals);
    } catch (error) {
      console.error("Error fetching vendor deals:", error);
      res.status(500).json({ error: "Failed to fetch vendor deals" });
    }
  });

  // ============ TRIP BUNDLES ============

  app.get("/api/bundles", async (req, res) => {
    try {
      const { country, destination, featured } = req.query;
      const bundles = await storage.getTripBundles({
        country: country as string | undefined,
        destination: destination as string | undefined,
        featured: featured === "true" ? true : undefined,
        activeOnly: true,
      });
      res.json(bundles);
    } catch (error) {
      console.error("Error fetching bundles:", error);
      res.status(500).json({ error: "Failed to fetch bundles" });
    }
  });

  app.get("/api/bundles/:id", async (req, res) => {
    try {
      const bundle = await storage.getTripBundleById(req.params.id);
      if (!bundle) return res.status(404).json({ error: "Bundle not found" });
      res.json(bundle);
    } catch (error) {
      console.error("Error fetching bundle:", error);
      res.status(500).json({ error: "Failed to fetch bundle" });
    }
  });

  app.post("/api/bundles", async (req, res) => {
    try {
      const cleanedData = { ...req.body };
      if (cleanedData.originalTotalPrice) cleanedData.originalTotalPrice = parseInt(cleanedData.originalTotalPrice, 10);
      if (cleanedData.bundlePrice) cleanedData.bundlePrice = parseInt(cleanedData.bundlePrice, 10);
      if (cleanedData.savingsPercent) cleanedData.savingsPercent = parseInt(cleanedData.savingsPercent, 10);
      if (cleanedData.maxBookings) cleanedData.maxBookings = parseInt(cleanedData.maxBookings, 10);
      if (cleanedData.startsAt) cleanedData.startsAt = new Date(cleanedData.startsAt);
      if (cleanedData.expiresAt) cleanedData.expiresAt = new Date(cleanedData.expiresAt);
      if (typeof cleanedData.items === "object") cleanedData.items = JSON.stringify(cleanedData.items);

      const parsed = insertTripBundleSchema.safeParse(cleanedData);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid bundle data", details: parsed.error.errors });
      }
      const bundle = await storage.createTripBundle(parsed.data);
      res.status(201).json(bundle);
    } catch (error) {
      console.error("Error creating bundle:", error);
      res.status(500).json({ error: "Failed to create bundle" });
    }
  });

  app.put("/api/bundles/:id", async (req, res) => {
    try {
      const bundle = await storage.updateTripBundle(req.params.id, req.body);
      if (!bundle) return res.status(404).json({ error: "Bundle not found" });
      res.json(bundle);
    } catch (error) {
      console.error("Error updating bundle:", error);
      res.status(500).json({ error: "Failed to update bundle" });
    }
  });

  app.post("/api/bundles/:id/book", async (req, res) => {
    try {
      const bundle = await storage.getTripBundleById(req.params.id);
      if (!bundle) return res.status(404).json({ error: "Bundle not found" });
      if (!bundle.isActive) return res.status(400).json({ error: "Bundle is no longer available" });
      if (bundle.maxBookings && bundle.maxBookings > 0 && (bundle.currentBookings || 0) >= bundle.maxBookings) {
        return res.status(400).json({ error: "Bundle is sold out" });
      }
      await storage.incrementBundleBooking(req.params.id);
      res.json({ success: true, message: "Bundle booked!" });
    } catch (error) {
      console.error("Error booking bundle:", error);
      res.status(500).json({ error: "Failed to book bundle" });
    }
  });

  // ============ SEED sample deals & bundles (for demo) ============
  app.post("/api/seed-deals", async (_req, res) => {
    try {
      const now = new Date();
      const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const in72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);
      const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const sampleDeals = [
        {
          vendorType: "accommodation",
          vendorId: "demo-1",
          vendorName: "Serengeti Luxury Lodge",
          title: "Weekend Safari Stay",
          description: "2 nights at an award-winning safari lodge with game drives included",
          imageUrl: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800",
          originalPrice: 45000,
          dealPrice: 27000,
          currency: "usd",
          discountPercent: 40,
          city: "Serengeti",
          country: "Tanzania",
          startsAt: now,
          expiresAt: in48h,
          maxRedemptions: 10,
          isActive: true,
        },
        {
          vendorType: "safari",
          vendorId: "demo-2",
          vendorName: "Masai Mara Adventures",
          title: "Full Day Game Drive",
          description: "Expert-guided safari through Masai Mara with lunch included",
          imageUrl: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800",
          originalPrice: 15000,
          dealPrice: 8900,
          currency: "usd",
          discountPercent: 41,
          city: "Narok",
          country: "Kenya",
          startsAt: now,
          expiresAt: in72h,
          maxRedemptions: 20,
          isActive: true,
        },
        {
          vendorType: "restaurant",
          vendorId: "demo-3",
          vendorName: "Zanzibar Spice Kitchen",
          title: "Chef's Table Experience",
          description: "7-course tasting menu with wine pairing at an oceanfront restaurant",
          imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",
          originalPrice: 12000,
          dealPrice: 6500,
          currency: "usd",
          discountPercent: 46,
          city: "Stone Town",
          country: "Tanzania",
          startsAt: now,
          expiresAt: in7d,
          maxRedemptions: 15,
          isActive: true,
        },
        {
          vendorType: "accommodation",
          vendorId: "demo-4",
          vendorName: "Bali Oceanview Resort",
          title: "3-Night Tropical Escape",
          description: "Beachfront villa with private pool and daily breakfast",
          imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800",
          originalPrice: 60000,
          dealPrice: 35000,
          currency: "usd",
          discountPercent: 42,
          city: "Seminyak",
          country: "Indonesia",
          startsAt: now,
          expiresAt: in72h,
          maxRedemptions: 5,
          isActive: true,
        },
        {
          vendorType: "safari",
          vendorId: "demo-5",
          vendorName: "Cape Town Whale Watching",
          title: "Ocean Safari & Whale Watch",
          description: "Boat trip to see whales, dolphins, and seals with marine biologist",
          imageUrl: "https://images.unsplash.com/photo-1568430462989-44163eb1752f?w=800",
          originalPrice: 9500,
          dealPrice: 5500,
          currency: "usd",
          discountPercent: 42,
          city: "Cape Town",
          country: "South Africa",
          startsAt: now,
          expiresAt: in48h,
          maxRedemptions: 12,
          isActive: true,
        },
      ];

      const sampleBundles = [
        {
          name: "Serengeti Complete Safari Package",
          description: "Everything you need for the ultimate safari experience: luxury lodge, game drives, and authentic dining",
          imageUrl: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800",
          destination: "Serengeti",
          country: "Tanzania",
          duration: "3 nights / 4 days",
          originalTotalPrice: 85000,
          bundlePrice: 59900,
          currency: "usd",
          savingsPercent: 30,
          items: JSON.stringify([
            { vendorType: "accommodation", vendorName: "Serengeti Luxury Lodge", price: 45000 },
            { vendorType: "safari", vendorName: "Serengeti Game Drives", price: 25000 },
            { vendorType: "restaurant", vendorName: "Bush Dinner Experience", price: 15000 },
          ]),
          includesStay: true,
          includesExperience: true,
          includesDining: true,
          includesCompanion: false,
          isFeatured: true,
          isActive: true,
        },
        {
          name: "Bali Bliss Retreat",
          description: "Relax in paradise with beachfront villa, spa treatments, traditional Balinese dining, and personal guide",
          imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800",
          destination: "Bali",
          country: "Indonesia",
          duration: "5 nights / 6 days",
          originalTotalPrice: 120000,
          bundlePrice: 79900,
          currency: "usd",
          savingsPercent: 33,
          items: JSON.stringify([
            { vendorType: "accommodation", vendorName: "Bali Oceanview Resort", price: 60000 },
            { vendorType: "restaurant", vendorName: "Traditional Balinese Feast", price: 20000 },
            { vendorType: "companion", vendorName: "Local Guide & Translator", price: 25000 },
            { vendorType: "safari", vendorName: "Rice Terrace & Volcano Tour", price: 15000 },
          ]),
          includesStay: true,
          includesExperience: true,
          includesDining: true,
          includesCompanion: true,
          isFeatured: true,
          isActive: true,
        },
        {
          name: "Kenya Explorer Adventure",
          description: "Explore Kenya's best with Masai Mara safari, Nairobi city tour, and authentic Kenyan cuisine",
          imageUrl: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800",
          destination: "Nairobi & Masai Mara",
          country: "Kenya",
          duration: "4 nights / 5 days",
          originalTotalPrice: 95000,
          bundlePrice: 64900,
          currency: "usd",
          savingsPercent: 32,
          items: JSON.stringify([
            { vendorType: "accommodation", vendorName: "Masai Mara Eco Lodge", price: 40000 },
            { vendorType: "safari", vendorName: "Masai Mara Game Drives", price: 30000 },
            { vendorType: "restaurant", vendorName: "Nairobi Food Tour", price: 10000 },
            { vendorType: "companion", vendorName: "Masai Cultural Guide", price: 15000 },
          ]),
          includesStay: true,
          includesExperience: true,
          includesDining: true,
          includesCompanion: true,
          isFeatured: true,
          isActive: true,
        },
        {
          name: "Cape Town Discovery",
          description: "Table Mountain, wine country, and ocean safari in one incredible package",
          imageUrl: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800",
          destination: "Cape Town",
          country: "South Africa",
          duration: "4 nights / 5 days",
          originalTotalPrice: 78000,
          bundlePrice: 54900,
          currency: "usd",
          savingsPercent: 30,
          items: JSON.stringify([
            { vendorType: "accommodation", vendorName: "Waterfront Boutique Hotel", price: 35000 },
            { vendorType: "safari", vendorName: "Whale Watch & Penguin Colony", price: 18000 },
            { vendorType: "restaurant", vendorName: "Wine Country Dining", price: 12000 },
            { vendorType: "companion", vendorName: "Private City Guide", price: 13000 },
          ]),
          includesStay: true,
          includesExperience: true,
          includesDining: true,
          includesCompanion: true,
          isFeatured: false,
          isActive: true,
        },
      ];

      const createdDeals = [];
      for (const deal of sampleDeals) {
        const created = await storage.createFlashDeal(deal as any);
        createdDeals.push(created);
      }

      const createdBundles = [];
      for (const bundle of sampleBundles) {
        const created = await storage.createTripBundle(bundle as any);
        createdBundles.push(created);
      }

      res.json({
        message: "Sample data seeded!",
        deals: createdDeals.length,
        bundles: createdBundles.length,
      });
    } catch (error) {
      console.error("Error seeding deals:", error);
      res.status(500).json({ error: "Failed to seed data" });
    }
  });

  // ============ IN-APP CHAT SYSTEM ============

  app.get("/api/chat/conversations", async (req, res) => {
    try {
      const userId = (req.query.userId as string) || "anonymous";
      const convos = await storage.getChatConversations(userId);
      res.json(convos);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/chat/conversations/:id", async (req, res) => {
    try {
      const convo = await storage.getChatConversationById(req.params.id);
      if (!convo) return res.status(404).json({ error: "Conversation not found" });
      res.json(convo);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/chat/conversations", async (req, res) => {
    try {
      const { userId, vendorType, vendorId, vendorName, vendorImageUrl } = req.body;
      if (!userId || !vendorType || !vendorId || !vendorName) {
        return res.status(400).json({ error: "userId, vendorType, vendorId, and vendorName are required" });
      }

      const existing = await storage.getChatConversationByVendor(userId, vendorType, vendorId);
      if (existing) {
        return res.json(existing);
      }

      const convo = await storage.createChatConversation({
        userId,
        vendorType,
        vendorId,
        vendorName,
        vendorImageUrl: vendorImageUrl || null,
        hasActiveBooking: false,
        isBlocked: false,
      });
      res.json(convo);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.get("/api/chat/conversations/:id/messages", async (req, res) => {
    try {
      const msgs = await storage.getChatMessages(req.params.id);
      res.json(msgs);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat/conversations/:id/messages", async (req, res) => {
    try {
      const { senderId, senderType, content, messageType } = req.body;
      if (!senderId || !senderType || !content) {
        return res.status(400).json({ error: "senderId, senderType, and content are required" });
      }

      const convo = await storage.getChatConversationById(req.params.id);
      if (!convo) return res.status(404).json({ error: "Conversation not found" });
      if (convo.isBlocked) return res.status(403).json({ error: "This conversation has been blocked" });

      const { filtered, wasFiltered, filterWarning } = filterContactInfo(content);

      const msg = await storage.createChatMessage({
        conversationId: req.params.id,
        senderId,
        senderType,
        content: filtered,
        messageType: messageType || "text",
      });

      if (wasFiltered) {
        await db.update(chatMessages).set({
          isFiltered: true,
          originalContent: content,
        }).where(eq(chatMessages.id, msg.id));
      }

      res.json({
        ...msg,
        content: filtered,
        wasFiltered,
        filterWarning,
      });

      if (senderType === "vendor" && convo.userId) {
        try {
          const profile = await storage.getTravellerProfile(convo.userId);
          if (profile?.notificationEmail && profile?.emailNotificationsEnabled) {
            sendMessageEmailNotification({
              recipientEmail: profile.notificationEmail,
              recipientName: profile.displayName || "Traveler",
              senderName: convo.vendorName || "Vendor",
              messageContent: filtered,
              conversationId: req.params.id,
            }).catch((err) => console.error("Email notification error:", err));
          }
        } catch (emailErr) {
          console.error("Email lookup error:", emailErr);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.put("/api/chat/conversations/:id/read", async (req, res) => {
    try {
      const convo = await storage.updateChatConversation(req.params.id, { unreadCount: 0 } as any);
      res.json(convo);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  // Platform fee info endpoint
  app.get("/api/platform/fee-info", (req, res) => {
    res.json({
      serviceFeePercent: PLATFORM_SERVICE_FEE_PERCENT,
      description: `A ${PLATFORM_SERVICE_FEE_PERCENT}% service fee is added to all bookings to cover platform costs and ensure your safety.`,
    });
  });

  // ============ TRIP LISTENER (AI Microphone) ============

  app.post("/api/trip-listener/analyze-text", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required" });
      }

      const keywords = await extractTripKeywords(text);
      const suggestions = await findMatchingSuggestions(keywords);

      res.json({
        transcript: text,
        keywords,
        suggestions,
        matchCount: suggestions.length,
      });
    } catch (error) {
      console.error("Error analyzing text:", error);
      res.status(500).json({ error: "Failed to analyze conversation" });
    }
  });

  app.post("/api/trip-listener/analyze-audio", async (req, res) => {
    try {
      const { audio } = req.body;
      if (!audio) {
        return res.status(400).json({ error: "Audio data (base64) is required" });
      }

      const rawBuffer = Buffer.from(audio, "base64");
      const { buffer: audioBuffer, format } = await ensureCompatibleFormat(rawBuffer);

      const transcript = await transcribeAudio(audioBuffer, format);

      if (!transcript || transcript.trim().length === 0) {
        return res.json({
          transcript: "",
          keywords: { destinations: [], activities: [], interests: [], budget: null, travelType: null },
          suggestions: [],
          matchCount: 0,
        });
      }

      const keywords = await extractTripKeywords(transcript);
      const suggestions = await findMatchingSuggestions(keywords);

      res.json({
        transcript,
        keywords,
        suggestions,
        matchCount: suggestions.length,
      });
    } catch (error) {
      console.error("Error analyzing audio:", error);
      res.status(500).json({ error: "Failed to analyze audio" });
    }
  });

  app.get("/api/flights/status", async (req, res) => {
    try {
      const { flight_iata } = req.query;

      if (!flight_iata || typeof flight_iata !== "string") {
        return res.status(400).json({ error: "flight_iata parameter is required" });
      }

      const apiKey = process.env.AVIATIONSTACK_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Flight tracking service not configured" });
      }

      const url = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${encodeURIComponent(flight_iata.trim().toUpperCase())}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.error) {
        return res.status(400).json({ error: result.error.message || "Flight lookup failed" });
      }

      res.json({ data: result.data || [] });
    } catch (error) {
      console.error("Flight status error:", error);
      res.status(500).json({ error: "Failed to fetch flight status" });
    }
  });

  app.post("/api/payment-methods/setup", async (req, res) => {
    try {
      const { deviceId } = req.body;
      if (!deviceId) return res.status(400).json({ message: "deviceId required" });
      const customer = await stripeService.getOrCreateCustomerByDeviceId(deviceId);
      const setupIntent = await stripeService.createSetupIntent(customer.id);
      const publishableKey = await getStripePublishableKey();
      res.json({
        setupIntentClientSecret: setupIntent.client_secret,
        customerId: customer.id,
        publishableKey,
      });
    } catch (error) {
      console.error("Setup intent error:", error);
      res.status(500).json({ message: "Failed to create setup intent" });
    }
  });

  app.get("/api/payment-methods/add-card", async (req, res) => {
    try {
      const deviceId = req.query.deviceId as string;
      if (!deviceId) return res.status(400).send("Missing deviceId");
      const customer = await stripeService.getOrCreateCustomerByDeviceId(deviceId);
      const setupIntent = await stripeService.createSetupIntent(customer.id);
      const publishableKey = await getStripePublishableKey();
      res.send(`<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Add Card - Tripsbnb</title>
<script src="https://js.stripe.com/v3/"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,system-ui,sans-serif;background:#0F2D1A;color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:40px 20px}
h1{font-size:24px;margin-bottom:8px}
p{color:rgba(255,255,255,0.7);margin-bottom:32px;font-size:14px}
.card-container{background:rgba(255,255,255,0.08);border-radius:16px;padding:24px;width:100%;max-width:400px;margin-bottom:24px;border:1px solid rgba(255,255,255,0.1)}
#card-element{padding:16px 0}
.StripeElement{padding:12px;background:rgba(255,255,255,0.05);border-radius:8px;border:1px solid rgba(255,255,255,0.2)}
.StripeElement--focus{border-color:#DAA520}
button{background:linear-gradient(135deg,#DAA520,#B8860B);color:#fff;border:none;padding:16px 32px;border-radius:24px;font-size:16px;font-weight:600;cursor:pointer;width:100%;max-width:400px;transition:opacity 0.2s}
button:disabled{opacity:0.5;cursor:not-allowed}
button:hover:not(:disabled){opacity:0.9}
.emoji{font-size:48px;margin-bottom:16px}
#error{color:#FF6B6B;margin-top:12px;font-size:14px;text-align:center}
#success{display:none;text-align:center}
#success .emoji{font-size:64px}
#success h2{color:#34C759;margin:16px 0 8px}
#success p{color:rgba(255,255,255,0.8)}
</style>
</head><body>
<div style="text-align:center"><span class="emoji">💳</span>
<h1>Add Payment Method</h1>
<p>Your card details are secured by Stripe</p></div>
<div class="card-container"><div id="card-element"></div><div id="error"></div></div>
<button id="submit" onclick="handleSubmit()">Save Card 🔒</button>
<div id="success"><span class="emoji">✅</span><h2>Card Added!</h2><p>You can now close this window</p></div>
<script>
const stripe=Stripe('${publishableKey}');
const elements=stripe.elements({clientSecret:'${setupIntent.client_secret}',appearance:{theme:'night',variables:{colorPrimary:'#DAA520',colorBackground:'#1A4D2E',colorText:'#FFFFFF',borderRadius:'8px'}}});
const paymentElement=elements.create('payment');
paymentElement.mount('#card-element');
async function handleSubmit(){
const btn=document.getElementById('submit');btn.disabled=true;btn.textContent='Saving...';
const{error}=await stripe.confirmSetup({elements,confirmParams:{return_url:window.location.href},redirect:'if_required'});
if(error){document.getElementById('error').textContent=error.message;btn.disabled=false;btn.textContent='Save Card 🔒'}
else{document.querySelector('.card-container').style.display='none';btn.style.display='none';document.getElementById('success').style.display='block';
setTimeout(()=>window.close(),2000)}}
</script></body></html>`);
    } catch (error) {
      console.error("Add card page error:", error);
      res.status(500).send("Failed to load card form");
    }
  });

  app.get("/api/payment-methods/:deviceId", async (req, res) => {
    try {
      const customer = await stripeService.getOrCreateCustomerByDeviceId(req.params.deviceId);
      const methods = await stripeService.listPaymentMethods(customer.id);
      res.json(methods);
    } catch (error) {
      console.error("List payment methods error:", error);
      res.status(500).json({ message: "Failed to list payment methods" });
    }
  });

  app.delete("/api/payment-methods/:paymentMethodId", async (req, res) => {
    try {
      await stripeService.deletePaymentMethod(req.params.paymentMethodId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete payment method error:", error);
      res.status(500).json({ message: "Failed to delete payment method" });
    }
  });

  app.get("/api/traveller-profile/:deviceId", async (req, res) => {
    try {
      const profile = await storage.getTravellerProfile(req.params.deviceId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Get traveller profile error:", error);
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  app.post("/api/traveller-profile", async (req, res) => {
    try {
      const { deviceId, displayName, travelStyle, interests, preferredDestinations, travelFrequency, avatar } = req.body;
      if (!deviceId || !displayName || !travelStyle || !interests) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const existing = await storage.getTravellerProfile(deviceId);
      if (existing) {
        const updated = await storage.updateTravellerProfile(deviceId, { displayName, travelStyle, interests, preferredDestinations, travelFrequency, avatar });
        return res.json(updated);
      }
      const profile = await storage.createTravellerProfile({ deviceId, displayName, travelStyle, interests, preferredDestinations, travelFrequency, avatar });
      res.status(201).json(profile);
    } catch (error) {
      console.error("Create traveller profile error:", error);
      res.status(500).json({ message: "Failed to create profile" });
    }
  });

  app.put("/api/traveller-profile/:deviceId", async (req, res) => {
    try {
      const updated = await storage.updateTravellerProfile(req.params.deviceId, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Update traveller profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.put("/api/traveller-profile/:deviceId/email-notifications", async (req, res) => {
    try {
      const { email, enabled } = req.body;
      const profile = await storage.getTravellerProfile(req.params.deviceId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const updateData: any = {};
      if (email !== undefined) updateData.notificationEmail = email;
      if (enabled !== undefined) updateData.emailNotificationsEnabled = enabled;

      const updated = await storage.updateTravellerProfile(req.params.deviceId, updateData);
      res.json({
        notificationEmail: updated?.notificationEmail || null,
        emailNotificationsEnabled: updated?.emailNotificationsEnabled || false,
      });
    } catch (error) {
      console.error("Update email notification settings error:", error);
      res.status(500).json({ message: "Failed to update email settings" });
    }
  });

  // ============ LOYALTY REWARDS SYSTEM ============

  const LOYALTY_TIERS = [
    { name: "bronze", minPoints: 0, discount: 0, perks: "Earn 1 point per $1 spent" },
    { name: "silver", minPoints: 2500, discount: 3, perks: "3% bonus discount on all bookings" },
    { name: "gold", minPoints: 10000, discount: 5, perks: "5% bonus discount + priority support" },
    { name: "platinum", minPoints: 25000, discount: 8, perks: "8% bonus discount + free upgrades" },
  ];

  function generateReferralCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "TV-";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function calculateTier(lifetimePoints: number): string {
    let tier = "bronze";
    for (const t of LOYALTY_TIERS) {
      if (lifetimePoints >= t.minPoints) tier = t.name;
    }
    return tier;
  }

  app.get("/api/loyalty/:deviceId", async (req, res) => {
    try {
      const [account] = await db
        .select()
        .from(loyaltyAccounts)
        .where(eq(loyaltyAccounts.deviceId, req.params.deviceId));

      if (!account) {
        const referralCode = generateReferralCode();
        const [newAccount] = await db
          .insert(loyaltyAccounts)
          .values({ deviceId: req.params.deviceId, referralCode })
          .returning();
        return res.json({
          ...newAccount,
          tiers: LOYALTY_TIERS,
          currentTierInfo: LOYALTY_TIERS[0],
          nextTierInfo: LOYALTY_TIERS[1],
          pointsToNextTier: LOYALTY_TIERS[1].minPoints,
        });
      }

      const currentTierIdx = LOYALTY_TIERS.findIndex((t) => t.name === account.tier);
      const nextTierIdx = currentTierIdx < LOYALTY_TIERS.length - 1 ? currentTierIdx + 1 : currentTierIdx;
      const pointsToNext = LOYALTY_TIERS[nextTierIdx].minPoints - (account.lifetimePoints || 0);

      res.json({
        ...account,
        tiers: LOYALTY_TIERS,
        currentTierInfo: LOYALTY_TIERS[currentTierIdx],
        nextTierInfo: LOYALTY_TIERS[nextTierIdx],
        pointsToNextTier: Math.max(0, pointsToNext),
      });
    } catch (error) {
      console.error("Get loyalty account error:", error);
      res.status(500).json({ message: "Failed to get loyalty account" });
    }
  });

  app.get("/api/loyalty/:deviceId/transactions", async (req, res) => {
    try {
      const [account] = await db
        .select()
        .from(loyaltyAccounts)
        .where(eq(loyaltyAccounts.deviceId, req.params.deviceId));
      if (!account) return res.json([]);

      const transactions = await db
        .select()
        .from(loyaltyTransactions)
        .where(eq(loyaltyTransactions.accountId, account.id));

      res.json(transactions);
    } catch (error) {
      console.error("Get loyalty transactions error:", error);
      res.status(500).json({ message: "Failed to get transactions" });
    }
  });

  app.post("/api/loyalty/:deviceId/earn", async (req, res) => {
    try {
      const { points, description, bookingId } = req.body;
      if (!points || !description) {
        return res.status(400).json({ message: "Missing points or description" });
      }

      let [account] = await db
        .select()
        .from(loyaltyAccounts)
        .where(eq(loyaltyAccounts.deviceId, req.params.deviceId));

      if (!account) {
        const referralCode = generateReferralCode();
        [account] = await db
          .insert(loyaltyAccounts)
          .values({ deviceId: req.params.deviceId, referralCode })
          .returning();
      }

      const newTotal = (account.totalPoints || 0) + points;
      const newLifetime = (account.lifetimePoints || 0) + points;
      const newTier = calculateTier(newLifetime);

      await db
        .update(loyaltyAccounts)
        .set({
          totalPoints: newTotal,
          lifetimePoints: newLifetime,
          tier: newTier,
          totalBookings: (account.totalBookings || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(loyaltyAccounts.id, account.id));

      await db.insert(loyaltyTransactions).values({
        accountId: account.id,
        type: "earned",
        points,
        description,
        bookingId,
      });

      res.json({
        pointsEarned: points,
        newTotal,
        newLifetime,
        tier: newTier,
        tierChanged: newTier !== account.tier,
      });
    } catch (error) {
      console.error("Earn points error:", error);
      res.status(500).json({ message: "Failed to earn points" });
    }
  });

  app.post("/api/loyalty/:deviceId/redeem", async (req, res) => {
    try {
      const { points, description } = req.body;
      if (!points || !description) {
        return res.status(400).json({ message: "Missing points or description" });
      }

      const [account] = await db
        .select()
        .from(loyaltyAccounts)
        .where(eq(loyaltyAccounts.deviceId, req.params.deviceId));

      if (!account) return res.status(404).json({ message: "Account not found" });
      if ((account.totalPoints || 0) < points) {
        return res.status(400).json({ message: "Insufficient points" });
      }

      const newTotal = (account.totalPoints || 0) - points;
      await db
        .update(loyaltyAccounts)
        .set({ totalPoints: newTotal, updatedAt: new Date() })
        .where(eq(loyaltyAccounts.id, account.id));

      await db.insert(loyaltyTransactions).values({
        accountId: account.id,
        type: "redeemed",
        points: -points,
        description,
      });

      res.json({ pointsRedeemed: points, newTotal });
    } catch (error) {
      console.error("Redeem points error:", error);
      res.status(500).json({ message: "Failed to redeem points" });
    }
  });

  // ============ REFERRAL PROGRAM ============

  app.post("/api/referral/apply", async (req, res) => {
    try {
      const { referralCode, deviceId } = req.body;
      if (!referralCode || !deviceId) {
        return res.status(400).json({ message: "Missing referral code or device ID" });
      }

      const [referrerAccount] = await db
        .select()
        .from(loyaltyAccounts)
        .where(eq(loyaltyAccounts.referralCode, referralCode.toUpperCase()));

      if (!referrerAccount) {
        return res.status(404).json({ message: "Invalid referral code" });
      }

      if (referrerAccount.deviceId === deviceId) {
        return res.status(400).json({ message: "Cannot use your own referral code" });
      }

      let [userAccount] = await db
        .select()
        .from(loyaltyAccounts)
        .where(eq(loyaltyAccounts.deviceId, deviceId));

      if (userAccount?.referredBy) {
        return res.status(400).json({ message: "Referral already applied" });
      }

      if (!userAccount) {
        const newCode = generateReferralCode();
        [userAccount] = await db
          .insert(loyaltyAccounts)
          .values({ deviceId, referralCode: newCode, referredBy: referralCode.toUpperCase() })
          .returning();
      } else {
        await db
          .update(loyaltyAccounts)
          .set({ referredBy: referralCode.toUpperCase() })
          .where(eq(loyaltyAccounts.id, userAccount.id));
      }

      const referrerBonus = 500;
      const referredBonus = 250;

      await db
        .update(loyaltyAccounts)
        .set({
          totalPoints: (referrerAccount.totalPoints || 0) + referrerBonus,
          lifetimePoints: (referrerAccount.lifetimePoints || 0) + referrerBonus,
          tier: calculateTier((referrerAccount.lifetimePoints || 0) + referrerBonus),
          updatedAt: new Date(),
        })
        .where(eq(loyaltyAccounts.id, referrerAccount.id));

      await db.insert(loyaltyTransactions).values({
        accountId: referrerAccount.id,
        type: "referral_bonus",
        points: referrerBonus,
        description: "Referral bonus - friend joined Tripsbnb",
        referralCode: referralCode.toUpperCase(),
      });

      await db
        .update(loyaltyAccounts)
        .set({
          totalPoints: (userAccount.totalPoints || 0) + referredBonus,
          lifetimePoints: (userAccount.lifetimePoints || 0) + referredBonus,
          tier: calculateTier((userAccount.lifetimePoints || 0) + referredBonus),
          updatedAt: new Date(),
        })
        .where(eq(loyaltyAccounts.id, userAccount.id));

      await db.insert(loyaltyTransactions).values({
        accountId: userAccount.id,
        type: "referral_welcome",
        points: referredBonus,
        description: "Welcome bonus from referral",
        referralCode: referralCode.toUpperCase(),
      });

      await db.insert(referralRedemptions).values({
        referralCode: referralCode.toUpperCase(),
        referrerId: referrerAccount.id,
        referredDeviceId: deviceId,
        referrerBonusPoints: referrerBonus,
        referredBonusPoints: referredBonus,
      });

      res.json({
        success: true,
        referrerBonus,
        referredBonus,
        message: `You earned ${referredBonus} points! Your friend earned ${referrerBonus} points.`,
      });
    } catch (error) {
      console.error("Apply referral error:", error);
      res.status(500).json({ message: "Failed to apply referral" });
    }
  });

  app.get("/api/referral/:deviceId/stats", async (req, res) => {
    try {
      const [account] = await db
        .select()
        .from(loyaltyAccounts)
        .where(eq(loyaltyAccounts.deviceId, req.params.deviceId));

      if (!account) return res.json({ referralCode: null, totalReferrals: 0, totalBonusEarned: 0 });

      const redemptions = await db
        .select()
        .from(referralRedemptions)
        .where(eq(referralRedemptions.referrerId, account.id));

      const totalBonusEarned = redemptions.reduce((sum, r) => sum + (r.referrerBonusPoints || 0), 0);

      res.json({
        referralCode: account.referralCode,
        totalReferrals: redemptions.length,
        totalBonusEarned,
        referrals: redemptions,
      });
    } catch (error) {
      console.error("Get referral stats error:", error);
      res.status(500).json({ message: "Failed to get referral stats" });
    }
  });

  // ============ BUNDLE PRICING ============

  app.get("/api/bundles/calculate", async (req, res) => {
    try {
      const { items } = req.query;
      if (!items) return res.status(400).json({ message: "Missing items" });

      const parsed = JSON.parse(items as string);
      if (!Array.isArray(parsed) || parsed.length < 2) {
        return res.status(400).json({ message: "Need at least 2 items for a bundle" });
      }

      const vendorTypes = new Set(parsed.map((i: any) => i.vendorType));
      let bundleDiscount = 0;
      if (vendorTypes.size >= 4) bundleDiscount = 20;
      else if (vendorTypes.size >= 3) bundleDiscount = 15;
      else if (vendorTypes.size >= 2) bundleDiscount = 10;

      const totalOriginal = parsed.reduce((sum: number, i: any) => sum + (i.price || 0), 0);
      const savings = Math.round(totalOriginal * (bundleDiscount / 100));
      const bundlePrice = totalOriginal - savings;

      res.json({
        originalTotal: totalOriginal,
        bundlePrice,
        savings,
        discountPercent: bundleDiscount,
        itemCount: parsed.length,
        vendorTypeCount: vendorTypes.size,
      });
    } catch (error) {
      console.error("Calculate bundle error:", error);
      res.status(500).json({ message: "Failed to calculate bundle" });
    }
  });

  // ============ PRICE NEGOTIATIONS ============

  const MIN_NEGOTIATION_PRICE = 10000;

  app.post("/api/negotiations", async (req, res) => {
    try {
      const { deviceId, vendorType, vendorId, vendorName, originalPrice, offerPrice, currency, message } = req.body;

      if (!deviceId || !vendorType || !vendorId || !vendorName || !originalPrice || !offerPrice) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (originalPrice < MIN_NEGOTIATION_PRICE) {
        return res.status(400).json({ message: "Price negotiation is only available for bookings $100 or above" });
      }

      const minAllowed = Math.floor(originalPrice * 0.7);
      if (offerPrice < minAllowed) {
        return res.status(400).json({ message: `Minimum offer is 70% of listed price ($${(minAllowed / 100).toFixed(0)})` });
      }

      if (offerPrice >= originalPrice) {
        return res.status(400).json({ message: "Offer must be less than the listed price" });
      }

      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const [negotiation] = await db.insert(priceNegotiations).values({
        deviceId,
        vendorType,
        vendorId,
        vendorName,
        originalPrice,
        currentOffer: offerPrice,
        currency: currency || "usd",
        buyerMessage: message || null,
        expiresAt,
        maxRounds: 3,
        minOfferPercent: 70,
      }).returning();

      res.json(negotiation);
    } catch (error) {
      console.error("Create negotiation error:", error);
      res.status(500).json({ message: "Failed to create negotiation" });
    }
  });

  app.get("/api/negotiations/:deviceId", async (req, res) => {
    try {
      const { deviceId } = req.params;
      const negotiations = await db.select().from(priceNegotiations)
        .where(eq(priceNegotiations.deviceId, deviceId))
        .orderBy(desc(priceNegotiations.createdAt));

      res.json(negotiations);
    } catch (error) {
      console.error("Get negotiations error:", error);
      res.status(500).json({ message: "Failed to get negotiations" });
    }
  });

  app.get("/api/negotiations/vendor/:vendorType/:vendorId", async (req, res) => {
    try {
      const { vendorType, vendorId } = req.params;
      const negotiations = await db.select().from(priceNegotiations)
        .where(and(
          eq(priceNegotiations.vendorType, vendorType),
          eq(priceNegotiations.vendorId, vendorId),
          eq(priceNegotiations.status, "pending")
        ))
        .orderBy(desc(priceNegotiations.createdAt));

      res.json(negotiations);
    } catch (error) {
      console.error("Get vendor negotiations error:", error);
      res.status(500).json({ message: "Failed to get vendor negotiations" });
    }
  });

  app.put("/api/negotiations/:id/counter", async (req, res) => {
    try {
      const { id } = req.params;
      const { counterPrice, counterOffer, message } = req.body;
      const price = counterPrice || counterOffer;

      if (!price) return res.status(400).json({ message: "Counter price is required" });

      const [existing] = await db.select().from(priceNegotiations).where(eq(priceNegotiations.id, id));
      if (!existing) return res.status(404).json({ message: "Negotiation not found" });
      if (existing.status !== "pending") return res.status(400).json({ message: "Negotiation is no longer active" });
      if ((existing.round || 1) >= (existing.maxRounds || 3)) return res.status(400).json({ message: "Maximum negotiation rounds reached" });

      const [updated] = await db.update(priceNegotiations)
        .set({
          counterOffer: price,
          vendorMessage: message || null,
          round: (existing.round || 1) + 1,
          status: "countered",
          updatedAt: new Date(),
        })
        .where(eq(priceNegotiations.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Counter offer error:", error);
      res.status(500).json({ message: "Failed to submit counter offer" });
    }
  });

  app.put("/api/negotiations/:id/respond", async (req, res) => {
    try {
      const { id } = req.params;
      const { newOffer, message } = req.body;

      const [existing] = await db.select().from(priceNegotiations).where(eq(priceNegotiations.id, id));
      if (!existing) return res.status(404).json({ message: "Negotiation not found" });
      if (existing.status !== "countered") return res.status(400).json({ message: "No counter-offer to respond to" });
      if ((existing.round || 1) >= (existing.maxRounds || 3)) return res.status(400).json({ message: "Maximum negotiation rounds reached" });

      const minAllowed = Math.floor(existing.originalPrice * 0.7);
      if (newOffer < minAllowed) return res.status(400).json({ message: `Minimum offer is $${(minAllowed / 100).toFixed(0)}` });

      const [updated] = await db.update(priceNegotiations)
        .set({
          currentOffer: newOffer,
          counterOffer: null,
          buyerMessage: message || null,
          status: "pending",
          updatedAt: new Date(),
        })
        .where(eq(priceNegotiations.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Respond to counter error:", error);
      res.status(500).json({ message: "Failed to respond" });
    }
  });

  app.put("/api/negotiations/:id/accept", async (req, res) => {
    try {
      const { id } = req.params;
      const { acceptedBy } = req.body;

      const [existing] = await db.select().from(priceNegotiations).where(eq(priceNegotiations.id, id));
      if (!existing) return res.status(404).json({ message: "Negotiation not found" });
      if (existing.status !== "pending" && existing.status !== "countered") {
        return res.status(400).json({ message: "Negotiation is no longer active" });
      }

      const finalPrice = existing.status === "countered" && existing.counterOffer
        ? existing.counterOffer
        : existing.currentOffer;

      const [updated] = await db.update(priceNegotiations)
        .set({
          currentOffer: finalPrice,
          status: "accepted",
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(priceNegotiations.id, id))
        .returning();

      res.json({ ...updated, agreedPrice: finalPrice, savings: existing.originalPrice - finalPrice });
    } catch (error) {
      console.error("Accept negotiation error:", error);
      res.status(500).json({ message: "Failed to accept negotiation" });
    }
  });

  app.put("/api/negotiations/:id/decline", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const [existing] = await db.select().from(priceNegotiations).where(eq(priceNegotiations.id, id));
      if (!existing) return res.status(404).json({ message: "Negotiation not found" });

      const [updated] = await db.update(priceNegotiations)
        .set({
          status: "declined",
          vendorMessage: reason || "Offer declined",
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(priceNegotiations.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Decline negotiation error:", error);
      res.status(500).json({ message: "Failed to decline negotiation" });
    }
  });

  // ============ PLATFORM COMPETITIVE INFO ============

  app.get("/api/platform/competitive-info", async (_req, res) => {
    res.json({
      platformFee: PLATFORM_SERVICE_FEE_PERCENT,
      competitorFees: {
        airbnb: { guestFee: 14.2, hostFee: 3, total: 17.2 },
        bookingCom: { guestFee: 15, hostFee: 15, total: 15 },
        vrbo: { guestFee: 12, hostFee: 5, total: 17 },
      },
      savingsVsAirbnb: Math.round(((17.2 - PLATFORM_SERVICE_FEE_PERCENT) / 17.2) * 100),
      uniqueFeatures: [
        { icon: "package", title: "Bundle & Save", description: "Save up to 20% booking stays + experiences together" },
        { icon: "award", title: "Loyalty Rewards", description: "Earn points on every booking, unlock tier discounts" },
        { icon: "users", title: "Refer Friends", description: "Earn 500 points for every friend who joins" },
        { icon: "globe", title: "All-in-One Platform", description: "Stays, safaris, dining, guides - one app for everything" },
        { icon: "shield", title: "Lower Fees", description: `Only ${PLATFORM_SERVICE_FEE_PERCENT}% total fee vs 17%+ on competitors` },
        { icon: "headphones", title: "AI Trip Listener", description: "Describe your dream trip and let AI plan it" },
      ],
    });
  });

  // ===================== VENDOR WALLET & PAYOUT SYSTEM =====================

  app.get("/api/vendor-wallet/:vendorType/:vendorId", async (req, res) => {
    try {
      const { vendorType, vendorId } = req.params;
      let wallet = await storage.getVendorWallet(vendorId, vendorType);
      if (!wallet) {
        let vendorName = vendorId;
        try {
          if (vendorType === "restaurant") {
            const r = await storage.getRestaurantById(vendorId);
            if (r) vendorName = r.name;
          } else if (vendorType === "safari") {
            const s = await storage.getSafariById(vendorId);
            if (s) vendorName = s.name;
          } else if (vendorType === "accommodation") {
            const a = await storage.getAccommodationById(vendorId);
            if (a) vendorName = a.name;
          } else if (vendorType === "companion") {
            const c = await storage.getCompanionById(vendorId);
            if (c) vendorName = c.name;
          }
        } catch (_) {}
        wallet = await storage.createVendorWallet({
          vendorId,
          vendorType,
          vendorName,
          currency: "usd",
        });
      }
      res.json(wallet);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/vendor-wallet/:vendorType/:vendorId/escrow", async (req, res) => {
    try {
      const { vendorType, vendorId } = req.params;
      const transactions = await storage.getEscrowTransactions(vendorId, vendorType);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/vendor-wallet/:vendorType/:vendorId/escrow", async (req, res) => {
    try {
      const { vendorType, vendorId } = req.params;
      const { bookingAmount, userId, platformFee, vendorPayout, description, stripeSessionId } = req.body;

      if (!bookingAmount || !vendorPayout || !platformFee) {
        return res.status(400).json({ message: "bookingAmount, platformFee, and vendorPayout are required" });
      }

      let wallet = await storage.getVendorWallet(vendorId, vendorType);
      if (!wallet) {
        let vendorName = vendorId;
        try {
          if (vendorType === "restaurant") { const r = await storage.getRestaurantById(vendorId); if (r) vendorName = r.name; }
          else if (vendorType === "safari") { const s = await storage.getSafariById(vendorId); if (s) vendorName = s.name; }
          else if (vendorType === "accommodation") { const a = await storage.getAccommodationById(vendorId); if (a) vendorName = a.name; }
          else if (vendorType === "companion") { const c = await storage.getCompanionById(vendorId); if (c) vendorName = c.name; }
        } catch (_) {}
        wallet = await storage.createVendorWallet({
          vendorId,
          vendorType,
          vendorName,
          currency: "usd",
        });
      }

      const escrow = await storage.createEscrowTransaction({
        walletId: wallet.id,
        vendorId,
        vendorType,
        bookingAmount: Math.round(bookingAmount),
        platformFee: Math.round(platformFee),
        vendorPayout: Math.round(vendorPayout),
        userId: userId || null,
        stripeSessionId: stripeSessionId || null,
        status: "held",
        description: description || "Booking payment held in escrow",
      });

      await storage.updateVendorWallet(wallet.id, {
        pendingBalance: (wallet.pendingBalance || 0) + Math.round(vendorPayout),
      });

      res.json(escrow);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/escrow/:escrowId/release", async (req, res) => {
    try {
      const { escrowId } = req.params;
      const escrow = await storage.getEscrowTransactionById(escrowId);
      if (!escrow) return res.status(404).json({ message: "Escrow transaction not found" });
      if (escrow.status !== "held") return res.status(400).json({ message: "Escrow is not in held status" });

      await storage.updateEscrowTransaction(escrowId, {
        status: "released",
        releasedAt: new Date(),
      });

      const wallet = await storage.getVendorWallet(escrow.vendorId, escrow.vendorType);
      if (wallet) {
        await storage.updateVendorWallet(wallet.id, {
          pendingBalance: Math.max(0, (wallet.pendingBalance || 0) - escrow.vendorPayout),
          availableBalance: (wallet.availableBalance || 0) + escrow.vendorPayout,
          totalEarned: (wallet.totalEarned || 0) + escrow.vendorPayout,
        });
      }

      res.json({ message: "Escrow released, funds available for payout", escrowId });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/escrow/:escrowId/refund", async (req, res) => {
    try {
      const { escrowId } = req.params;
      const escrow = await storage.getEscrowTransactionById(escrowId);
      if (!escrow) return res.status(404).json({ message: "Escrow transaction not found" });
      if (escrow.status !== "held") return res.status(400).json({ message: "Escrow is not in held status" });

      await storage.updateEscrowTransaction(escrowId, {
        status: "refunded",
      });

      const wallet = await storage.getVendorWallet(escrow.vendorId, escrow.vendorType);
      if (wallet) {
        await storage.updateVendorWallet(wallet.id, {
          pendingBalance: Math.max(0, (wallet.pendingBalance || 0) - escrow.vendorPayout),
        });
      }

      res.json({ message: "Escrow refunded to customer", escrowId });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/vendor-wallet/:vendorType/:vendorId/payouts", async (req, res) => {
    try {
      const { vendorType, vendorId } = req.params;
      const payouts = await storage.getPayoutRequests(vendorId, vendorType);
      res.json(payouts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/vendor-wallet/:vendorType/:vendorId/payouts", async (req, res) => {
    try {
      const { vendorType, vendorId } = req.params;
      const { amount, payoutMethod, payoutEmail } = req.body;

      if (!amount || !payoutMethod) {
        return res.status(400).json({ message: "amount and payoutMethod are required" });
      }

      const wallet = await storage.getVendorWallet(vendorId, vendorType);
      if (!wallet) return res.status(404).json({ message: "Vendor wallet not found" });

      const amountCents = Math.round(amount);
      if (amountCents < 1000) return res.status(400).json({ message: "Minimum payout is $10.00" });
      if (amountCents > (wallet.availableBalance || 0)) {
        return res.status(400).json({ message: "Insufficient available balance" });
      }

      const payout = await storage.createPayoutRequest({
        walletId: wallet.id,
        vendorId,
        vendorType,
        amount: amountCents,
        currency: wallet.currency || "usd",
        payoutMethod,
        payoutEmail: payoutEmail || wallet.payoutEmail || null,
        status: "pending",
      });

      await storage.updateVendorWallet(wallet.id, {
        availableBalance: (wallet.availableBalance || 0) - amountCents,
      });

      res.json(payout);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payouts/:payoutId/process", async (req, res) => {
    try {
      const { payoutId } = req.params;
      const target = await storage.getPayoutRequestById(payoutId);
      if (!target) return res.status(404).json({ message: "Payout request not found" });
      if (target.status !== "pending") return res.status(400).json({ message: "Payout is not pending" });

      await storage.updatePayoutRequest(payoutId, {
        status: "completed",
        processedAt: new Date(),
      });

      const wallet = await storage.getVendorWallet(target.vendorId, target.vendorType);
      if (wallet) {
        await storage.updateVendorWallet(wallet.id, {
          totalPaidOut: (wallet.totalPaidOut || 0) + target.amount,
        });
      }

      res.json({ message: "Payout processed successfully", payoutId });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/escrow/summary", async (req, res) => {
    try {
      const held = await db.select().from(escrowTransactions).where(eq(escrowTransactions.status, "held"));
      const released = await db.select().from(escrowTransactions).where(eq(escrowTransactions.status, "released"));
      const refunded = await db.select().from(escrowTransactions).where(eq(escrowTransactions.status, "refunded"));

      res.json({
        heldCount: held.length,
        heldTotal: held.reduce((sum, e) => sum + e.bookingAmount, 0),
        releasedCount: released.length,
        releasedTotal: released.reduce((sum, e) => sum + e.bookingAmount, 0),
        refundedCount: refunded.length,
        refundedTotal: refunded.reduce((sum, e) => sum + e.bookingAmount, 0),
        platformFeesCollected: released.reduce((sum, e) => sum + e.platformFee, 0),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ GROUP DISCOUNTS ============

  app.get("/api/group-discount/calculate", async (req, res) => {
    try {
      const { vendorType, vendorId, groupSize, basePrice } = req.query;
      if (!vendorType || !vendorId || !groupSize || !basePrice) {
        return res.status(400).json({ message: "Missing required params: vendorType, vendorId, groupSize, basePrice" });
      }
      const size = parseInt(groupSize as string, 10);
      const price = parseInt(basePrice as string, 10);
      if (size < 1) return res.status(400).json({ message: "Group size must be at least 1" });

      const discountPercent = await storage.calculateGroupDiscount(vendorId as string, vendorType as string, size);
      const discountAmount = Math.round(price * size * (discountPercent / 100));
      const originalTotal = price * size;
      const discountedTotal = originalTotal - discountAmount;
      const perPersonPrice = Math.round(discountedTotal / size);

      res.json({
        groupSize: size,
        basePrice: price,
        discountPercent,
        originalTotal,
        discountAmount,
        discountedTotal,
        perPersonPrice,
        savingsPerPerson: price - perPersonPrice,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/group-discount/tiers/:vendorType/:vendorId", async (req, res) => {
    try {
      const tiers = await storage.getGroupDiscountTiers(req.params.vendorId, req.params.vendorType);
      if (tiers.length === 0) {
        res.json([
          { minGroupSize: 2, maxGroupSize: 4, discountPercent: 10 },
          { minGroupSize: 5, maxGroupSize: 9, discountPercent: 15 },
          { minGroupSize: 10, maxGroupSize: 50, discountPercent: 20 },
        ]);
      } else {
        res.json(tiers);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/group-discount/tiers", async (req, res) => {
    try {
      const tier = await storage.createGroupDiscountTier(req.body);
      res.json(tier);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ PRICE ALERTS ============

  app.get("/api/price-alerts/:deviceId", async (req, res) => {
    try {
      const alerts = await storage.getPriceAlerts(req.params.deviceId);
      res.json(alerts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/price-alerts/:deviceId/triggered", async (req, res) => {
    try {
      const alerts = await storage.getTriggeredAlerts(req.params.deviceId);
      res.json(alerts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/price-alerts", async (req, res) => {
    try {
      const alert = await storage.createPriceAlert(req.body);
      res.json(alert);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/price-alerts/:id", async (req, res) => {
    try {
      await storage.deletePriceAlert(req.params.id);
      res.json({ message: "Alert deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ SEASONAL / OFF-PEAK PRICING ============

  app.get("/api/seasonal-deals", async (req, res) => {
    try {
      const deals = await storage.getAllSeasonalDeals();
      res.json(deals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/seasonal-pricing/:vendorType/:vendorId", async (req, res) => {
    try {
      const pricing = await storage.getSeasonalPricing(req.params.vendorId, req.params.vendorType);
      res.json(pricing);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/seasonal-pricing", async (req, res) => {
    try {
      const pricing = await storage.createSeasonalPricing(req.body);
      res.json(pricing);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ SMART SAVINGS SUMMARY ============

  app.get("/api/savings/summary", async (req, res) => {
    try {
      const { vendorType, vendorId, groupSize, basePrice } = req.query;
      const savings: any = {
        groupDiscount: null,
        seasonalDiscount: null,
        flashDeal: null,
        bundleSavings: null,
        totalPotentialSavings: 0,
      };

      if (vendorType && vendorId && basePrice) {
        const price = parseInt(basePrice as string, 10);

        if (groupSize) {
          const size = parseInt(groupSize as string, 10);
          const groupPct = await storage.calculateGroupDiscount(vendorId as string, vendorType as string, size);
          if (groupPct > 0) {
            savings.groupDiscount = {
              percent: groupPct,
              savings: Math.round(price * size * (groupPct / 100)),
            };
            savings.totalPotentialSavings += savings.groupDiscount.savings;
          }
        }

        const seasonal = await storage.getSeasonalPricing(vendorId as string, vendorType as string);
        if (seasonal.length > 0) {
          const best = seasonal.reduce((a, b) => a.discountPercent > b.discountPercent ? a : b);
          savings.seasonalDiscount = {
            type: best.seasonType,
            percent: best.discountPercent,
            savings: Math.round(price * (best.discountPercent / 100)),
          };
          savings.totalPotentialSavings += savings.seasonalDiscount.savings;
        }
      }

      res.json(savings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ SEED COMPETITIVE DEALS (demo data) ============

  app.post("/api/seed-competitive-deals", async (_req, res) => {
    try {
      const now = new Date();
      const lastMinuteDeals = [
        {
          vendorType: "safari",
          vendorId: "lm-safari-1",
          vendorName: "Sunset Safari Co.",
          title: "Last-Minute Game Drive - 40% OFF",
          description: "Unsold seats on tomorrow's premium game drive! See the Big Five at sunset.",
          originalPrice: 25000,
          dealPrice: 15000,
          discountPercent: 40,
          city: "Nairobi",
          country: "Kenya",
          startsAt: now,
          expiresAt: new Date(now.getTime() + 36 * 60 * 60 * 1000),
          maxRedemptions: 4,
          isActive: true,
        },
        {
          vendorType: "accommodation",
          vendorId: "lm-stay-1",
          vendorName: "Coastal Breeze Resort",
          title: "Tonight's Room - 50% OFF",
          description: "Luxury oceanview room available tonight only! Perfect for spontaneous travelers.",
          originalPrice: 35000,
          dealPrice: 17500,
          discountPercent: 50,
          city: "Mombasa",
          country: "Kenya",
          startsAt: now,
          expiresAt: new Date(now.getTime() + 18 * 60 * 60 * 1000),
          maxRedemptions: 2,
          isActive: true,
        },
        {
          vendorType: "restaurant",
          vendorId: "lm-dining-1",
          vendorName: "Spice Garden Kitchen",
          title: "Flash Dinner Special - 35% OFF",
          description: "Chef's tasting menu tonight! Fresh catch and farm-to-table sides.",
          originalPrice: 8500,
          dealPrice: 5525,
          discountPercent: 35,
          city: "Zanzibar",
          country: "Tanzania",
          startsAt: now,
          expiresAt: new Date(now.getTime() + 8 * 60 * 60 * 1000),
          maxRedemptions: 10,
          isActive: true,
        },
        {
          vendorType: "companion",
          vendorId: "lm-guide-1",
          vendorName: "Expert City Guide Anna",
          title: "Walking Tour - 30% OFF",
          description: "Join a guided heritage walking tour of Stone Town. Limited spots!",
          originalPrice: 6000,
          dealPrice: 4200,
          discountPercent: 30,
          city: "Zanzibar",
          country: "Tanzania",
          startsAt: now,
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          maxRedemptions: 6,
          isActive: true,
        },
      ];

      const earlyBirdDeals = [
        {
          vendorType: "safari",
          vendorId: "eb-safari-1",
          vendorName: "Serengeti Expeditions",
          title: "Early Bird: Great Migration Safari - 25% OFF",
          description: "Book 60+ days ahead for the ultimate migration experience! Best seats guaranteed.",
          originalPrice: 45000,
          dealPrice: 33750,
          discountPercent: 25,
          city: "Arusha",
          country: "Tanzania",
          startsAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
          maxRedemptions: 20,
          isActive: true,
        },
        {
          vendorType: "accommodation",
          vendorId: "eb-stay-1",
          vendorName: "Mountain Lodge Retreat",
          title: "Early Bird: Holiday Season Stay - 20% OFF",
          description: "Reserve your holiday lodge early and save big! Includes breakfast.",
          originalPrice: 28000,
          dealPrice: 22400,
          discountPercent: 20,
          city: "Cape Town",
          country: "South Africa",
          startsAt: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000),
          maxRedemptions: 15,
          isActive: true,
        },
      ];

      const createdDeals = [];
      for (const deal of [...lastMinuteDeals, ...earlyBirdDeals]) {
        const created = await storage.createFlashDeal(deal);
        createdDeals.push(created);
      }

      const seasonalDeals = [
        {
          vendorType: "accommodation",
          vendorId: "seasonal-stay-1",
          vendorName: "Savanna Lodge",
          seasonType: "off_peak",
          discountPercent: 30,
          startDate: now,
          endDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
        {
          vendorType: "safari",
          vendorId: "seasonal-safari-1",
          vendorName: "Bush Adventures",
          seasonType: "rainy_season",
          discountPercent: 25,
          startDate: now,
          endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
        {
          vendorType: "restaurant",
          vendorId: "seasonal-dining-1",
          vendorName: "Harbor View Restaurant",
          seasonType: "weekday_special",
          discountPercent: 15,
          startDate: now,
          endDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      ];

      for (const deal of seasonalDeals) {
        await storage.createSeasonalPricing(deal);
      }

      res.json({
        message: "Competitive deals seeded successfully!",
        lastMinuteDeals: lastMinuteDeals.length,
        earlyBirdDeals: earlyBirdDeals.length,
        seasonalDeals: seasonalDeals.length,
        totalDeals: createdDeals.length + seasonalDeals.length,
      });
    } catch (error: any) {
      console.error("Seed competitive deals error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============ TRAVEL TOOLKIT & DESTINATION GUIDES ============

  app.post("/api/destination-guide", async (req, res) => {
    try {
      const { destination, country } = req.body;
      if (!destination) {
        return res.status(400).json({ error: "Destination is required" });
      }

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 4096,
        messages: [
          {
            role: "system",
            content: `You are an expert travel guide for Tripsbnb, a travel platform that helps travelers save money and have incredible experiences. Provide practical, honest, insider-level travel advice. Focus on making trips affordable, memorable, and beautiful. Always include budget-friendly options. Return valid JSON only.`,
          },
          {
            role: "user",
            content: `Create a comprehensive travel guide for ${destination}${country ? `, ${country}` : ""}. Return JSON with this exact structure:
{
  "destination": "city/region name",
  "country": "country name",
  "tagline": "A short compelling one-line description",
  "bestTimeToVisit": {
    "peak": "month range and why",
    "budget": "month range - cheapest time and why",
    "recommended": "best balance of weather and price"
  },
  "weather": {
    "overview": "general climate description",
    "avgTempHigh": "in celsius",
    "avgTempLow": "in celsius",
    "rainyMonths": "which months"
  },
  "budgetTips": [
    { "tip": "specific money-saving tip", "savingsEstimate": "how much you could save" }
  ],
  "hiddenGems": [
    { "name": "place name", "description": "why it's special", "cost": "free/cheap/moderate", "category": "nature/culture/food/adventure" }
  ],
  "localTransport": [
    { "type": "transport type", "cost": "typical cost", "tip": "how to use it smartly" }
  ],
  "foodGuide": [
    { "item": "dish or food type", "where": "where to find it", "cost": "typical price range", "tip": "insider tip" }
  ],
  "safetyTips": [
    "specific safety tip for this destination"
  ],
  "culturalEtiquette": [
    { "topic": "custom/etiquette area", "advice": "what to do or avoid" }
  ],
  "topExperiences": [
    { "name": "experience name", "description": "why it's worth it", "cost": "price range", "duration": "how long" }
  ],
  "currencyInfo": {
    "code": "currency code",
    "name": "currency name",
    "tipPercentage": "typical tip percentage",
    "avgMealCost": "average meal cost for one person",
    "avgTransportDaily": "average daily transport cost"
  }
}
Provide 5 budget tips, 6 hidden gems, 4 transport options, 5 food items, 5 safety tips, 5 cultural etiquette items, and 5 top experiences. Make all costs realistic and specific.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const guide = JSON.parse(response.choices[0]?.message?.content || "{}");
      res.json(guide);
    } catch (error: any) {
      console.error("Destination guide error:", error);
      res.status(500).json({ error: "Failed to generate destination guide" });
    }
  });

  app.post("/api/travel-toolkit/packing-list", async (req, res) => {
    try {
      const { destination, duration, activities, season } = req.body;
      if (!destination) {
        return res.status(400).json({ error: "Destination is required" });
      }

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 2048,
        messages: [
          {
            role: "system",
            content: `You are a smart packing assistant for Tripsbnb. Generate practical packing lists based on destination, duration, weather, and activities. Be specific and helpful. Return valid JSON only.`,
          },
          {
            role: "user",
            content: `Create a packing checklist for a trip to ${destination}, duration: ${duration || "7 days"}, activities: ${activities || "general sightseeing"}, season: ${season || "current"}. Return JSON:
{
  "categories": [
    {
      "name": "category name",
      "icon": "feather icon name",
      "items": [
        { "item": "item name", "essential": true/false, "tip": "optional helpful tip" }
      ]
    }
  ],
  "proTips": ["general packing tip"]
}
Categories should include: Essentials, Clothing, Toiletries, Electronics, Documents, Activity-Specific. Include 4-8 items per category and 3 pro tips.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const packingList = JSON.parse(response.choices[0]?.message?.content || "{}");
      res.json(packingList);
    } catch (error: any) {
      console.error("Packing list error:", error);
      res.status(500).json({ error: "Failed to generate packing list" });
    }
  });

  app.get("/api/travel-toolkit/exchange-rates", async (_req, res) => {
    try {
      const rates: Record<string, number> = {
        USD: 1, EUR: 0.92, GBP: 0.79, JPY: 149.50, CNY: 7.24, AUD: 1.53,
        CAD: 1.36, CHF: 0.88, INR: 83.12, KES: 153.50, ZAR: 18.62,
        AED: 3.67, SGD: 1.34, HKD: 7.82, NZD: 1.67, MXN: 17.15,
        BRL: 4.97, THB: 35.50, MYR: 4.72, PHP: 56.20, IDR: 15650,
        VND: 24500, KRW: 1325, TWD: 31.50, EGP: 30.85, TZS: 2510,
        NGN: 1550, GHS: 12.50, MAD: 10.05, TND: 3.12, RWF: 1260,
        UGX: 3780, ETB: 56.50, COP: 3950, PEN: 3.72, CLP: 890,
        ARS: 835, TRY: 32.50, PLN: 4.05, CZK: 23.20, HUF: 360,
        SEK: 10.55, NOK: 10.75, DKK: 6.88, ISK: 138,
      };
      res.json({ base: "USD", rates, lastUpdated: new Date().toISOString() });
    } catch (error: any) {
      console.error("Exchange rates error:", error);
      res.status(500).json({ error: "Failed to fetch exchange rates" });
    }
  });

  app.post("/api/travel-toolkit/emergency-info", async (req, res) => {
    try {
      const { destination, country } = req.body;
      if (!destination && !country) {
        return res.status(400).json({ error: "Destination or country is required" });
      }

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 1024,
        messages: [
          {
            role: "system",
            content: `You are a travel safety expert. Provide emergency and practical info for travelers. Return valid JSON only.`,
          },
          {
            role: "user",
            content: `Provide emergency and essential travel info for ${destination || country}. Return JSON:
{
  "emergencyNumbers": { "police": "number", "ambulance": "number", "fire": "number", "tourist_police": "number or null" },
  "usefulPhrases": [
    { "english": "phrase in english", "local": "translation", "pronunciation": "how to say it" }
  ],
  "visaInfo": "brief visa requirements for most nationalities",
  "plugType": "electrical plug type",
  "voltage": "voltage info",
  "waterSafety": "is tap water safe to drink?",
  "timezone": "timezone info"
}
Include 10 essential phrases (hello, thank you, please, help, how much, where is, excuse me, yes, no, goodbye).`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const info = JSON.parse(response.choices[0]?.message?.content || "{}");
      res.json(info);
    } catch (error: any) {
      console.error("Emergency info error:", error);
      res.status(500).json({ error: "Failed to generate emergency info" });
    }
  });

  // ==================== DESTINATION EVENTS ====================

  // Get events for a destination
  app.get("/api/destination-events", async (req, res) => {
    try {
      const { destination, country } = req.query;
      if (!destination) {
        return res.status(400).json({ error: "Destination is required" });
      }

      const dest = (destination as string).toLowerCase();
      const allEvents = await db.select().from(destinationEvents)
        .where(eq(destinationEvents.isActive, true))
        .orderBy(desc(destinationEvents.isPromoted), desc(destinationEvents.startDate));

      const filtered = allEvents.filter(e =>
        e.destination.toLowerCase().includes(dest) ||
        (country && e.country.toLowerCase().includes((country as string).toLowerCase()))
      );

      res.json(filtered);
    } catch (error: any) {
      console.error("Get destination events error:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // AI-powered event discovery - generates events for any destination
  app.post("/api/destination-events/discover", async (req, res) => {
    try {
      const { destination, country } = req.body;
      if (!destination) {
        return res.status(400).json({ error: "Destination is required" });
      }

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 2048,
        messages: [
          {
            role: "system",
            content: `You are a travel event expert for Tripsbnb. Find real mega events, festivals, cultural celebrations, and major happenings at travel destinations. Focus on events that travelers would plan trips around. Return valid JSON only.`,
          },
          {
            role: "user",
            content: `List the top upcoming and recurring mega events, festivals, and celebrations in ${destination}${country ? `, ${country}` : ""}. Return JSON with this structure:
{
  "events": [
    {
      "title": "event name",
      "description": "brief compelling 2-sentence description of what makes this event special",
      "eventType": "festival|concert|sports|cultural|exhibition|conference|carnival|food_festival",
      "venue": "venue or area name",
      "monthsActive": "e.g. March, December-January",
      "estimatedAttendance": "e.g. 500,000+",
      "ticketInfo": "free / from $XX / varies",
      "highlights": ["highlight 1", "highlight 2", "highlight 3"],
      "insiderTip": "practical tip for attending",
      "category": "music|art|food|sports|culture|nature|tech"
    }
  ]
}
Provide 4-6 events. Include mix of free and paid, seasonal and year-round. Focus on events worth traveling for.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const data = JSON.parse(response.choices[0]?.message?.content || '{"events":[]}');
      const events = data.events || [];
      res.json({ events });
    } catch (error: any) {
      console.error("Event discovery error:", error);
      res.status(500).json({ error: "Failed to discover events" });
    }
  });

  // Submit event for advertising (organizer pays to promote)
  app.post("/api/destination-events", async (req, res) => {
    try {
      const body = { ...req.body };
      if (typeof body.startDate === "string") body.startDate = new Date(body.startDate);
      if (typeof body.endDate === "string") body.endDate = new Date(body.endDate);

      const parsed = insertDestinationEventSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid event data", details: parsed.error.issues });
      }

      const [event] = await db.insert(destinationEvents).values(parsed.data).returning();
      res.status(201).json(event);
    } catch (error: any) {
      console.error("Create event error:", error);
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  // Get promotion pricing tiers (must be before /:id route)
  app.get("/api/destination-events/promotion-tiers", async (_req, res) => {
    res.json({
      tiers: [
        {
          id: "standard",
          name: "Standard Listing",
          price: 2999, // $29.99
          currency: "usd",
          features: ["Listed in destination events", "Basic event card", "30-day listing"],
        },
        {
          id: "featured",
          name: "Featured Placement",
          price: 7999, // $79.99
          currency: "usd",
          features: ["Top placement in results", "Highlighted card design", "60-day listing", "View analytics"],
        },
        {
          id: "premium",
          name: "Premium Spotlight",
          price: 14999, // $149.99
          currency: "usd",
          features: ["Hero banner placement", "Premium badge", "90-day listing", "Full analytics", "Push notifications to travelers"],
        },
      ],
      travelerUnlock: {
        price: 199, // $1.99
        currency: "usd",
        features: ["Full event details", "Insider tips", "Ticket links", "Venue directions"],
      },
    });
  });

  // Get single event details (tracks views)
  app.get("/api/destination-events/:id", async (req, res) => {
    try {
      const [event] = await db.select().from(destinationEvents)
        .where(eq(destinationEvents.id, req.params.id));

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Increment view count
      await db.update(destinationEvents)
        .set({ viewCount: (event.viewCount || 0) + 1 })
        .where(eq(destinationEvents.id, req.params.id));

      res.json(event);
    } catch (error: any) {
      console.error("Get event error:", error);
      res.status(500).json({ error: "Failed to fetch event" });
    }
  });

  app.post("/api/destination-events/:id/checkout", async (req, res) => {
    try {
      const { tier, deviceId } = req.body;
      const [event] = await db.select().from(destinationEvents)
        .where(eq(destinationEvents.id, req.params.id));

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const tierPricing: Record<string, { price: number; name: string }> = {
        standard: { price: 2999, name: "Standard Listing" },
        featured: { price: 7999, name: "Featured Placement" },
        premium: { price: 14999, name: "Premium Spotlight" },
      };

      const selectedTier = tierPricing[tier];
      if (!selectedTier) {
        return res.status(400).json({ error: "Invalid promotion tier" });
      }

      const stripeResult = await stripeService.createVendorProduct({
        vendorType: "restaurant",
        vendorId: `event_promo_${event.id}`,
        name: `Event Promotion: ${event.title} (${selectedTier.name})`,
        description: `${selectedTier.name} promotion for event: ${event.title}`,
        priceInCents: selectedTier.price,
        currency: "usd",
        metadata: {
          type: "event_promotion",
          eventId: event.id,
          tier,
        },
      });

      await db.update(destinationEvents)
        .set({
          stripeProductId: stripeResult.productId,
          stripePriceId: stripeResult.priceId,
          promotionTier: tier,
          promotionPrice: selectedTier.price,
        })
        .where(eq(destinationEvents.id, event.id));

      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const baseUrl = `${protocol}://${host}`;

      const session = await stripeService.createCheckoutSession({
        priceId: stripeResult.priceId,
        successUrl: `${baseUrl}/event-promotion/success?session_id={CHECKOUT_SESSION_ID}&event_id=${event.id}`,
        cancelUrl: `${baseUrl}/event-promotion/cancel?event_id=${event.id}`,
        mode: 'payment',
        metadata: {
          type: 'event_promotion',
          eventId: event.id,
          tier,
          organizerEmail: event.organizerEmail || '',
        },
      });

      res.json({
        url: session.url,
        sessionId: session.id,
        tier,
        amount: selectedTier.price,
      });
    } catch (error: any) {
      console.error("Event promotion checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/destination-events/:id/unlock", async (req, res) => {
    try {
      const [event] = await db.select().from(destinationEvents)
        .where(eq(destinationEvents.id, req.params.id));

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const unlockPrice = 199;

      const stripeResult = await stripeService.createVendorProduct({
        vendorType: "restaurant",
        vendorId: `event_unlock_${event.id}_${Date.now()}`,
        name: `Unlock Event: ${event.title}`,
        description: `Full access to event details, insider tips, and ticket links for: ${event.title}`,
        priceInCents: unlockPrice,
        currency: "usd",
        metadata: {
          type: "event_unlock",
          eventId: event.id,
        },
      });

      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const baseUrl = `${protocol}://${host}`;

      const session = await stripeService.createCheckoutSession({
        priceId: stripeResult.priceId,
        successUrl: `${baseUrl}/event-unlock/success?session_id={CHECKOUT_SESSION_ID}&event_id=${event.id}`,
        cancelUrl: `${baseUrl}/event-unlock/cancel?event_id=${event.id}`,
        mode: 'payment',
        metadata: {
          type: 'event_unlock',
          eventId: event.id,
          deviceId: req.body.deviceId || '',
        },
      });

      res.json({
        url: session.url,
        sessionId: session.id,
        amount: unlockPrice,
      });
    } catch (error: any) {
      console.error("Event unlock checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
