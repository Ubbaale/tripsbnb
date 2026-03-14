import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface EventFormData {
  title: string;
  description: string;
  eventType: string;
  venue: string;
  destination: string;
  country: string;
  startDate: string;
  endDate: string;
  ticketPrice: string;
  ticketCurrency: string;
  ticketUrl: string;
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
}

const EVENT_TYPES = [
  "festival",
  "concert",
  "sports",
  "cultural",
  "exhibition",
  "conference",
  "carnival",
  "food_festival",
];

const CURRENCIES = ["USD", "EUR", "GBP", "KES", "ZAR"];

interface TierInfo {
  id: string;
  name: string;
  price: number;
  priceLabel: string;
  features: string[];
}

const TIERS: TierInfo[] = [
  {
    id: "standard",
    name: "Standard",
    price: 2999,
    priceLabel: "$29.99",
    features: ["Listed in destination events", "Basic event card", "30-day listing"],
  },
  {
    id: "featured",
    name: "Featured",
    price: 7999,
    priceLabel: "$79.99",
    features: [
      "Top placement in results",
      "Highlighted card design",
      "60-day listing",
      "View analytics",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 14999,
    priceLabel: "$149.99",
    features: [
      "Hero banner placement",
      "Premium badge",
      "90-day listing",
      "Full analytics",
      "Push notifications to travelers",
    ],
  },
];

export function EventSubmissionScreen({ navigation, route }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [selectedTier, setSelectedTier] = useState("featured");
  const [successData, setSuccessData] = useState<{
    checkoutUrl?: string;
    eventId?: number;
  } | null>(null);

  const passedDestination = route?.params?.destination || "";

  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    eventType: "",
    venue: "",
    destination: passedDestination,
    country: "",
    startDate: "",
    endDate: "",
    ticketPrice: "",
    ticketCurrency: "USD",
    ticketUrl: "",
    organizerName: "",
    organizerEmail: "",
    organizerPhone: "",
  });

  const updateField = (field: keyof EventFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const priceInCents = formData.ticketPrice
        ? Math.round(parseFloat(formData.ticketPrice) * 100)
        : 0;

      const eventPayload = {
        title: formData.title,
        description: formData.description,
        eventType: formData.eventType,
        venue: formData.venue,
        destination: formData.destination,
        country: formData.country,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        ticketPrice: priceInCents,
        ticketCurrency: formData.ticketCurrency,
        ticketUrl: formData.ticketUrl || null,
        organizerName: formData.organizerName,
        organizerEmail: formData.organizerEmail,
        organizerPhone: formData.organizerPhone || null,
        tier: selectedTier,
      };

      const eventRes = await apiRequest("POST", "/api/destination-events", eventPayload);
      const eventData = await eventRes.json();
      const eventId = eventData.id;

      const checkoutRes = await apiRequest(
        "POST",
        `/api/destination-events/${eventId}/checkout`,
        { tier: selectedTier, deviceId: "web" }
      );
      const checkoutData = await checkoutRes.json();

      return { eventId, checkoutUrl: checkoutData.url || checkoutData.checkoutUrl };
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessData(data);
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to submit event");
    },
  });

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.title.trim()) {
          Alert.alert("Required", "Please enter the event title");
          return false;
        }
        if (!formData.eventType) {
          Alert.alert("Required", "Please select an event type");
          return false;
        }
        if (!formData.venue.trim()) {
          Alert.alert("Required", "Please enter the venue name");
          return false;
        }
        if (!formData.destination.trim()) {
          Alert.alert("Required", "Please enter the destination city");
          return false;
        }
        if (!formData.country.trim()) {
          Alert.alert("Required", "Please enter the country");
          return false;
        }
        if (!formData.startDate.trim()) {
          Alert.alert("Required", "Please enter the start date");
          return false;
        }
        return true;
      case 2:
        if (!formData.organizerName.trim()) {
          Alert.alert("Required", "Please enter the organizer name");
          return false;
        }
        if (!formData.organizerEmail.trim()) {
          Alert.alert("Required", "Please enter the organizer email");
          return false;
        }
        return true;
      case 3:
        if (!selectedTier) {
          Alert.alert("Required", "Please select a promotion tier");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (step < 3) {
        setStep(step + 1);
      }
    }
  };

  const prevStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = () => {
    if (validateStep(3)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      submitMutation.mutate();
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((s) => (
        <View key={s} style={styles.stepContainer}>
          <View
            style={[
              styles.stepDot,
              {
                backgroundColor: s <= step ? "#1A4D2E" : theme.border,
              },
            ]}
          >
            {s < step ? (
              <Feather name="check" size={14} color="#FFFFFF" />
            ) : (
              <ThemedText
                type="caption"
                style={{ color: s <= step ? "#FFFFFF" : theme.textSecondary }}
              >
                {s}
              </ThemedText>
            )}
          </View>
          {s < 3 ? (
            <View
              style={[
                styles.stepLine,
                { backgroundColor: s < step ? "#1A4D2E" : theme.border },
              ]}
            />
          ) : null}
        </View>
      ))}
    </View>
  );

  const renderHero = () => (
    <LinearGradient
      colors={["#1A4D2E", "#2D6B45"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroGradient}
    >
      <View style={styles.heroIconWrap}>
        <Feather name="trending-up" size={28} color="#DAA520" />
      </View>
      <ThemedText type="h2" style={styles.heroTitle}>
        Promote Your Event
      </ThemedText>
      <ThemedText type="small" style={styles.heroSubtitle}>
        Reach travelers exploring destination guides
      </ThemedText>
    </LinearGradient>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <ThemedText type="h2" style={styles.stepTitle}>
        Event Details
      </ThemedText>
      <ThemedText type="body" style={styles.stepSubtitle}>
        Tell us about your event
      </ThemedText>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Event Title *
        </ThemedText>
        <TextInput
          testID="input-event-title"
          style={[
            styles.input,
            { backgroundColor: theme.backgroundSecondary, color: theme.text },
          ]}
          placeholder="Enter event title"
          placeholderTextColor={theme.textSecondary}
          value={formData.title}
          onChangeText={(v) => updateField("title", v)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Description
        </ThemedText>
        <TextInput
          testID="input-event-description"
          style={[
            styles.input,
            styles.textArea,
            { backgroundColor: theme.backgroundSecondary, color: theme.text },
          ]}
          placeholder="Describe your event"
          placeholderTextColor={theme.textSecondary}
          value={formData.description}
          onChangeText={(v) => updateField("description", v)}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Event Type *
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
        >
          {EVENT_TYPES.map((type) => (
            <Pressable
              key={type}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateField("eventType", type);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    formData.eventType === type
                      ? "#1A4D2E"
                      : theme.backgroundSecondary,
                },
              ]}
            >
              <ThemedText
                type="caption"
                style={{
                  color: formData.eventType === type ? "#FFFFFF" : theme.text,
                }}
              >
                {type.replace("_", " ")}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Venue Name *
        </ThemedText>
        <TextInput
          testID="input-venue"
          style={[
            styles.input,
            { backgroundColor: theme.backgroundSecondary, color: theme.text },
          ]}
          placeholder="Enter venue name"
          placeholderTextColor={theme.textSecondary}
          value={formData.venue}
          onChangeText={(v) => updateField("venue", v)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Destination / City *
        </ThemedText>
        <TextInput
          testID="input-destination"
          style={[
            styles.input,
            { backgroundColor: theme.backgroundSecondary, color: theme.text },
          ]}
          placeholder="e.g., Nairobi, Cape Town"
          placeholderTextColor={theme.textSecondary}
          value={formData.destination}
          onChangeText={(v) => updateField("destination", v)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Country *
        </ThemedText>
        <TextInput
          testID="input-country"
          style={[
            styles.input,
            { backgroundColor: theme.backgroundSecondary, color: theme.text },
          ]}
          placeholder="e.g., Kenya, South Africa"
          placeholderTextColor={theme.textSecondary}
          value={formData.country}
          onChangeText={(v) => updateField("country", v)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Start Date *
        </ThemedText>
        <TextInput
          testID="input-start-date"
          style={[
            styles.input,
            { backgroundColor: theme.backgroundSecondary, color: theme.text },
          ]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.textSecondary}
          value={formData.startDate}
          onChangeText={(v) => updateField("startDate", v)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          End Date (optional)
        </ThemedText>
        <TextInput
          testID="input-end-date"
          style={[
            styles.input,
            { backgroundColor: theme.backgroundSecondary, color: theme.text },
          ]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.textSecondary}
          value={formData.endDate}
          onChangeText={(v) => updateField("endDate", v)}
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <ThemedText type="h2" style={styles.stepTitle}>
        Ticketing & Contact
      </ThemedText>
      <ThemedText type="body" style={styles.stepSubtitle}>
        Pricing and organizer information
      </ThemedText>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Ticket Price (in dollars)
        </ThemedText>
        <TextInput
          testID="input-ticket-price"
          style={[
            styles.input,
            { backgroundColor: theme.backgroundSecondary, color: theme.text },
          ]}
          placeholder="0.00"
          placeholderTextColor={theme.textSecondary}
          value={formData.ticketPrice}
          onChangeText={(v) => updateField("ticketPrice", v)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Ticket Currency
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
        >
          {CURRENCIES.map((cur) => (
            <Pressable
              key={cur}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateField("ticketCurrency", cur);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    formData.ticketCurrency === cur
                      ? "#1A4D2E"
                      : theme.backgroundSecondary,
                },
              ]}
            >
              <ThemedText
                type="caption"
                style={{
                  color: formData.ticketCurrency === cur ? "#FFFFFF" : theme.text,
                }}
              >
                {cur}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Ticket URL (optional)
        </ThemedText>
        <TextInput
          testID="input-ticket-url"
          style={[
            styles.input,
            { backgroundColor: theme.backgroundSecondary, color: theme.text },
          ]}
          placeholder="https://tickets.example.com"
          placeholderTextColor={theme.textSecondary}
          value={formData.ticketUrl}
          onChangeText={(v) => updateField("ticketUrl", v)}
          keyboardType="url"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Organizer Name *
        </ThemedText>
        <TextInput
          testID="input-organizer-name"
          style={[
            styles.input,
            { backgroundColor: theme.backgroundSecondary, color: theme.text },
          ]}
          placeholder="Your name or organization"
          placeholderTextColor={theme.textSecondary}
          value={formData.organizerName}
          onChangeText={(v) => updateField("organizerName", v)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Organizer Email *
        </ThemedText>
        <TextInput
          testID="input-organizer-email"
          style={[
            styles.input,
            { backgroundColor: theme.backgroundSecondary, color: theme.text },
          ]}
          placeholder="organizer@example.com"
          placeholderTextColor={theme.textSecondary}
          value={formData.organizerEmail}
          onChangeText={(v) => updateField("organizerEmail", v)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Organizer Phone (optional)
        </ThemedText>
        <TextInput
          testID="input-organizer-phone"
          style={[
            styles.input,
            { backgroundColor: theme.backgroundSecondary, color: theme.text },
          ]}
          placeholder="+1 555 000 0000"
          placeholderTextColor={theme.textSecondary}
          value={formData.organizerPhone}
          onChangeText={(v) => updateField("organizerPhone", v)}
          keyboardType="phone-pad"
        />
      </View>
    </View>
  );

  const renderTierCard = (tier: TierInfo) => {
    const isSelected = selectedTier === tier.id;
    const isFeatured = tier.id === "featured";
    const isPremium = tier.id === "premium";
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const cardContent = (
      <View style={styles.tierCardInner}>
        <View style={styles.tierHeader}>
          <View style={styles.tierTitleRow}>
            <ThemedText type="h4" style={isPremium ? { color: "#FFFFFF" } : undefined}>
              {tier.name}
            </ThemedText>
            {isSelected ? (
              <View style={[styles.radioOuter, { borderColor: isPremium ? "#DAA520" : "#1A4D2E" }]}>
                <View style={[styles.radioInner, { backgroundColor: isPremium ? "#DAA520" : "#1A4D2E" }]} />
              </View>
            ) : (
              <View style={[styles.radioOuter, { borderColor: isPremium ? "rgba(255,255,255,0.4)" : theme.border }]} />
            )}
          </View>
          <ThemedText
            type="h2"
            style={isPremium ? { color: "#DAA520" } : { color: "#DAA520" }}
          >
            {tier.priceLabel}
          </ThemedText>
        </View>
        <View style={styles.tierFeatures}>
          {tier.features.map((feature, idx) => (
            <View key={idx} style={styles.tierFeatureRow}>
              <Feather
                name="check-circle"
                size={16}
                color={isPremium ? "#DAA520" : "#1A4D2E"}
              />
              <ThemedText
                type="small"
                style={[
                  styles.tierFeatureText,
                  isPremium ? { color: "rgba(255,255,255,0.9)" } : undefined,
                ]}
              >
                {feature}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
    );

    return (
      <AnimatedPressable
        key={tier.id}
        testID={`tier-${tier.id}`}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedTier(tier.id);
        }}
        style={[animatedStyle, { marginBottom: Spacing.lg }]}
      >
        {isPremium ? (
          <LinearGradient
            colors={isDark ? ["#1A4D2E", "#0D2617"] : ["#1A4D2E", "#2D6B45"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.tierCard,
              isSelected ? { borderWidth: 2, borderColor: "#DAA520" } : null,
            ]}
          >
            {cardContent}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.tierCard,
              { backgroundColor: theme.backgroundDefault },
              Shadows.card,
              isFeatured ? { borderWidth: 1.5, borderColor: "#DAA520" } : null,
              isSelected && !isFeatured
                ? { borderWidth: 1.5, borderColor: "#1A4D2E" }
                : null,
            ]}
          >
            {cardContent}
          </View>
        )}
      </AnimatedPressable>
    );
  };

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <ThemedText type="h2" style={styles.stepTitle}>
        Choose Promotion Tier
      </ThemedText>
      <ThemedText type="body" style={styles.stepSubtitle}>
        Select how you want your event promoted
      </ThemedText>

      {TIERS.map((tier) => renderTierCard(tier))}
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <View style={[styles.successIconWrap, { backgroundColor: "#1A4D2E" }]}>
        <Feather name="check" size={40} color="#FFFFFF" />
      </View>
      <ThemedText type="h2" style={styles.successTitle}>
        Event Submitted
      </ThemedText>
      <ThemedText type="body" style={styles.successMessage}>
        Your event has been submitted for promotion. Complete the checkout to activate your listing.
      </ThemedText>
      {successData?.checkoutUrl ? (
        <Pressable
          onPress={() => {
            Linking.openURL(successData.checkoutUrl!);
          }}
          style={styles.checkoutButton}
        >
          <LinearGradient
            colors={["#1A4D2E", "#2D6B45"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.checkoutButtonGradient}
          >
            <Feather name="external-link" size={20} color="#FFFFFF" />
            <ThemedText type="label" style={{ color: "#FFFFFF" }}>
              Complete Checkout
            </ThemedText>
          </LinearGradient>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => navigation.goBack()}
        style={[styles.doneButton, { borderColor: theme.border }]}
      >
        <ThemedText type="label">Done</ThemedText>
      </Pressable>
    </View>
  );

  if (successData) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Spacing.lg, paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {renderSuccess()}
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Spacing.lg, paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {renderHero()}
          {renderStepIndicator()}

          {step === 1 ? renderStep1() : null}
          {step === 2 ? renderStep2() : null}
          {step === 3 ? renderStep3() : null}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: theme.backgroundRoot },
          ]}
        >
          <View style={styles.footerButtons}>
            {step > 1 ? (
              <Pressable
                testID="button-prev-step"
                onPress={prevStep}
                style={[styles.backButton, { borderColor: theme.border }]}
              >
                <Feather name="arrow-left" size={20} color={theme.text} />
                <ThemedText type="label">Back</ThemedText>
              </Pressable>
            ) : (
              <View style={styles.backButtonPlaceholder} />
            )}

            {step < 3 ? (
              <Pressable
                testID="button-next-step"
                onPress={nextStep}
                style={styles.nextButton}
              >
                <LinearGradient
                  colors={["#1A4D2E", "#2D6A4F"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.nextButtonGradient}
                >
                  <ThemedText type="label" style={styles.nextButtonText}>
                    Continue
                  </ThemedText>
                  <Feather name="arrow-right" size={20} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable
                testID="button-submit-event"
                onPress={handleSubmit}
                disabled={submitMutation.isPending}
                style={[styles.nextButton, { opacity: submitMutation.isPending ? 0.7 : 1 }]}
              >
                <LinearGradient
                  colors={["#1A4D2E", "#2D6A4F"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.nextButtonGradient}
                >
                  {submitMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <ThemedText type="label" style={styles.nextButtonText}>
                        Submit Event
                      </ThemedText>
                      <Feather name="check" size={20} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  heroGradient: {
    borderRadius: BorderRadius.lg,
    padding: Spacing["2xl"],
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  heroTitle: {
    color: "#FFFFFF",
    textAlign: "center",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  stepLine: {
    width: 40,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: Spacing.xs,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    marginBottom: Spacing.xs,
  },
  stepSubtitle: {
    opacity: 0.7,
    marginBottom: Spacing["2xl"],
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    marginBottom: Spacing.sm,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: Spacing.md,
    textAlignVertical: "top",
  },
  chipScroll: {
    marginLeft: -Spacing.lg,
    paddingLeft: Spacing.lg,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  tierCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    overflow: "hidden",
  },
  tierCardInner: {
    gap: Spacing.lg,
  },
  tierHeader: {
    gap: Spacing.xs,
  },
  tierTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tierFeatures: {
    gap: Spacing.sm,
  },
  tierFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  tierFeatureText: {
    flex: 1,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  footerButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  backButtonPlaceholder: {
    width: 100,
  },
  nextButton: {
    flex: 1,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  nextButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  nextButtonText: {
    color: "#FFFFFF",
  },
  successContainer: {
    alignItems: "center",
    paddingTop: Spacing["4xl"],
    paddingHorizontal: Spacing.lg,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  successTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  successMessage: {
    textAlign: "center",
    opacity: 0.7,
    marginBottom: Spacing["2xl"],
  },
  checkoutButton: {
    width: "100%",
    borderRadius: BorderRadius.full,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  checkoutButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  doneButton: {
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
});
