import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { getApiUrl } from "@/lib/query-client";
import { getCurrencySymbol } from "@/lib/currency";

const { width } = Dimensions.get("window");

const SAFARI_TYPES = [
  { id: "game_drive", emoji: "\u{1F981}", label: "Game Drive" },
  { id: "walking", emoji: "\u{1F97E}", label: "Walking Safari" },
  { id: "bird_watching", emoji: "\u{1F985}", label: "Bird Watching" },
  { id: "night", emoji: "\u{1F319}", label: "Night Safari" },
  { id: "photography", emoji: "\u{1F4F8}", label: "Photography Safari" },
  { id: "multi_day", emoji: "\u{1F3D5}\uFE0F", label: "Multi-Day Expedition" },
  { id: "marine", emoji: "\u{1F40B}", label: "Marine Safari" },
  { id: "cultural", emoji: "\u{1F3DB}\uFE0F", label: "Cultural Safari" },
];

const DURATION_OPTIONS = [
  "2 Hours",
  "Half Day",
  "Full Day",
  "2 Days",
  "3 Days",
  "5 Days",
  "7 Days",
  "Custom",
];

const INCLUSIONS = [
  { id: "transport", emoji: "\u{1F697}", label: "Transport" },
  { id: "meals", emoji: "\u{1F37D}\uFE0F", label: "Meals" },
  { id: "drinks", emoji: "\u{1F4A7}", label: "Drinks" },
  { id: "accommodation", emoji: "\u{1F3E8}", label: "Accommodation" },
  { id: "photography_equipment", emoji: "\u{1F4F7}", label: "Photography Equipment" },
  { id: "gear", emoji: "\u{1F392}", label: "Gear Provided" },
  { id: "guide", emoji: "\u{1F464}", label: "Guide" },
  { id: "binoculars", emoji: "\u{1F52D}", label: "Binoculars" },
  { id: "sunscreen", emoji: "\u{1F9F4}", label: "Sunscreen" },
  { id: "park_fees", emoji: "\u{1F3AB}", label: "Park Fees" },
  { id: "first_aid", emoji: "\u{1F3E5}", label: "First Aid" },
  { id: "wifi", emoji: "\u{1F4F6}", label: "WiFi" },
];

const TOTAL_STEPS = 7;

interface SafariOnboardingScreenProps {
  onComplete?: () => void;
}

export function SafariOnboardingScreen({ onComplete }: SafariOnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [safariType, setSafariType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [customDuration, setCustomDuration] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [groupSize, setGroupSize] = useState(1);
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedInclusions, setSelectedInclusions] = useState<string[]>([]);
  const [pricePerPerson, setPricePerPerson] = useState("");

  const progressWidth = useSharedValue(0);

  useEffect(() => {
    progressWidth.value = withSpring(((step + 1) / TOTAL_STEPS) * 100, { damping: 15, stiffness: 100 });
  }, [step]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%` as any,
  }));

  const getEffectiveDuration = (): string => {
    if (duration === "Custom") {
      return customDuration.trim();
    }
    return duration;
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return safariType.length > 0;
      case 1: return title.trim().length > 0 && getEffectiveDuration().length > 0;
      case 2: return country.trim().length > 0 && city.trim().length > 0 && address.trim().length > 0;
      case 3: return groupSize > 0;
      case 4: return true;
      case 5: return true;
      case 6: return pricePerPerson.trim().length > 0 && parseInt(pricePerPerson) > 0;
      default: return false;
    }
  };

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < TOTAL_STEPS - 1) {
      setDirection("forward");
      setStep((s) => s + 1);
    } else {
      await submitListing();
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step > 0) {
      setDirection("back");
      setStep((s) => s - 1);
    } else {
      navigation.goBack();
    }
  };

  const toggleInclusion = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedInclusions((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const pickPhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 10 - photos.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 10));
    }
  };

  const removePhoto = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const submitListing = async () => {
    setIsSubmitting(true);
    try {
      const inclusionLabels = selectedInclusions
        .map((id) => INCLUSIONS.find((inc) => inc.id === id)?.label)
        .filter(Boolean)
        .join(", ");
      const fullDescription = description.trim().length > 0
        ? `${description}\n\nIncluded: ${inclusionLabels}`
        : `Included: ${inclusionLabels}`;
      const priceInCents = Math.round(parseFloat(pricePerPerson) * 100);

      const baseUrl = getApiUrl();
      const url = new URL("/api/safaris", baseUrl);
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: title,
          description: fullDescription,
          safariType,
          duration: getEffectiveDuration(),
          groupSize,
          imageUrl: photos.length > 0 ? photos[0] : null,
          address,
          city,
          country,
          bookingPrice: priceInCents,
          bookingCurrency: "usd",
        }),
      });

      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStep(TOTAL_STEPS);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setIsSubmitting(false);
  };

  const StepHeader = ({ emoji, title: stepTitle, subtitle }: { emoji: string; title: string; subtitle: string }) => (
    <View style={styles.stepHeader}>
      <ThemedText style={styles.stepEmoji}>{emoji}</ThemedText>
      <ThemedText style={[styles.stepTitle, { color: theme.text }]}>{stepTitle}</ThemedText>
      <ThemedText style={[styles.stepSubtitle, { color: theme.textSecondary }]}>{subtitle}</ThemedText>
    </View>
  );

  const Counter = ({ label, value, onIncrement, onDecrement, min = 0, max }: { label: string; value: number; onIncrement: () => void; onDecrement: () => void; min?: number; max?: number }) => (
    <View style={[styles.counterRow, { borderBottomColor: theme.border }]}>
      <ThemedText style={[styles.counterLabel, { color: theme.text }]}>{label}</ThemedText>
      <View style={styles.counterControls}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onDecrement(); }}
          style={[styles.counterBtn, { borderColor: value <= min ? theme.border : theme.textSecondary, opacity: value <= min ? 0.3 : 1 }]}
          disabled={value <= min}
        >
          <Feather name="minus" size={18} color={value <= min ? theme.border : theme.textSecondary} />
        </Pressable>
        <ThemedText style={[styles.counterValue, { color: theme.text }]}>{value}</ThemedText>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onIncrement(); }}
          style={[styles.counterBtn, { borderColor: max !== undefined && value >= max ? theme.border : theme.textSecondary, opacity: max !== undefined && value >= max ? 0.3 : 1 }]}
          disabled={max !== undefined && value >= max}
        >
          <Feather name="plus" size={18} color={max !== undefined && value >= max ? theme.border : theme.textSecondary} />
        </Pressable>
      </View>
    </View>
  );

  const renderStep = () => {
    const entering = direction === "forward" ? SlideInRight : SlideInLeft;
    const exiting = direction === "forward" ? SlideOutLeft : SlideOutRight;

    switch (step) {
      case 0:
        return (
          <Animated.View key="step0" entering={entering} exiting={exiting} style={styles.stepContainer}>
            <StepHeader
              emoji={"\u{1F981}"}
              title="What type of safari do you offer?"
              subtitle="Choose the experience that best describes your safari"
            />
            <View style={styles.optionsGrid}>
              {SAFARI_TYPES.map((type) => (
                <Pressable
                  key={type.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSafariType(type.id); }}
                  style={[
                    styles.propertyOption,
                    { borderColor: safariType === type.id ? "#DAA520" : theme.border, backgroundColor: safariType === type.id ? "rgba(218,165,32,0.1)" : theme.backgroundDefault },
                  ]}
                >
                  <ThemedText style={styles.optionEmoji}>{type.emoji}</ThemedText>
                  <ThemedText style={[styles.optionLabel, { color: safariType === type.id ? "#DAA520" : theme.text }]}>{type.label}</ThemedText>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        );

      case 1:
        return (
          <Animated.View key="step1" entering={entering} exiting={exiting} style={styles.stepContainer}>
            <StepHeader
              emoji={"\u270F\uFE0F"}
              title="Tell us about your safari"
              subtitle="Give your safari a name and describe the experience"
            />
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.textInput, styles.titleInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}
                value={title}
                onChangeText={(t) => setTitle(t.slice(0, 50))}
                placeholder="e.g. Masai Mara Big Five Safari"
                placeholderTextColor={theme.textSecondary}
                maxLength={50}
                testID="input-title"
              />
              <ThemedText style={[styles.charCount, { color: theme.textSecondary }]}>{title.length}/50</ThemedText>

              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary, marginTop: Spacing.xl }]}>Description</ThemedText>
              <ThemedText style={[styles.inputHint, { color: theme.textSecondary }]}>Share what makes your safari unique and what guests can expect</ThemedText>
              <TextInput
                style={[styles.textInput, styles.descInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}
                value={description}
                onChangeText={(t) => setDescription(t.slice(0, 500))}
                placeholder="Describe the wildlife, landscapes, and unique experiences..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={500}
                testID="input-description"
              />
              <ThemedText style={[styles.charCount, { color: theme.textSecondary }]}>{description.length}/500</ThemedText>

              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary, marginTop: Spacing.xl }]}>Duration</ThemedText>
              <View style={styles.amenityGrid}>
                {DURATION_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDuration(opt); }}
                    style={[
                      styles.amenityChip,
                      { borderColor: duration === opt ? "#DAA520" : theme.border, backgroundColor: duration === opt ? "rgba(218,165,32,0.1)" : theme.backgroundDefault },
                    ]}
                  >
                    <ThemedText style={[styles.amenityLabel, { color: duration === opt ? "#DAA520" : theme.text }]}>{opt}</ThemedText>
                  </Pressable>
                ))}
              </View>
              {duration === "Custom" ? (
                <TextInput
                  style={[styles.textInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundDefault, marginTop: Spacing.md }]}
                  value={customDuration}
                  onChangeText={setCustomDuration}
                  placeholder="e.g. 4 Hours, 10 Days"
                  placeholderTextColor={theme.textSecondary}
                  testID="input-custom-duration"
                />
              ) : null}
            </View>
          </Animated.View>
        );

      case 2:
        return (
          <Animated.View key="step2" entering={entering} exiting={exiting} style={styles.stepContainer}>
            <StepHeader
              emoji={"\u{1F4CD}"}
              title="Where does your safari take place?"
              subtitle="Help travelers find your safari experience"
            />
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Country</ThemedText>
              <TextInput
                style={[styles.textInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}
                value={country}
                onChangeText={setCountry}
                placeholder="e.g. Kenya"
                placeholderTextColor={theme.textSecondary}
                testID="input-country"
              />
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary, marginTop: Spacing.md }]}>City</ThemedText>
              <TextInput
                style={[styles.textInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Nairobi"
                placeholderTextColor={theme.textSecondary}
                testID="input-city"
              />
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary, marginTop: Spacing.md }]}>Meeting point / Address</ThemedText>
              <TextInput
                style={[styles.textInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. Masai Mara National Reserve Gate"
                placeholderTextColor={theme.textSecondary}
                testID="input-address"
              />
            </View>
          </Animated.View>
        );

      case 3:
        return (
          <Animated.View key="step3" entering={entering} exiting={exiting} style={styles.stepContainer}>
            <StepHeader
              emoji={"\u{1F465}"}
              title="Group size"
              subtitle="Set the maximum number of participants per safari"
            />
            <View style={styles.countersContainer}>
              <Counter
                label="Max group size"
                value={groupSize}
                onIncrement={() => setGroupSize((g) => Math.min(50, g + 1))}
                onDecrement={() => setGroupSize((g) => Math.max(1, g - 1))}
                min={1}
                max={50}
              />
            </View>
          </Animated.View>
        );

      case 4:
        return (
          <Animated.View key="step4" entering={entering} exiting={exiting} style={styles.stepContainer}>
            <StepHeader
              emoji={"\u{1F4F8}"}
              title="Add photos of your safari"
              subtitle="Show travelers what they'll experience. You can add up to 10 photos."
            />
            <View style={styles.photosContainer}>
              {photos.map((uri, index) => (
                <View key={index} style={styles.photoWrapper}>
                  <Image source={{ uri }} style={styles.photoImage} />
                  <Pressable
                    onPress={() => removePhoto(index)}
                    style={styles.photoRemoveBtn}
                  >
                    <Feather name="x" size={14} color="#FFF" />
                  </Pressable>
                  {index === 0 ? (
                    <View style={styles.coverBadge}>
                      <ThemedText style={styles.coverBadgeText}>Cover</ThemedText>
                    </View>
                  ) : null}
                </View>
              ))}
              {photos.length < 10 ? (
                <Pressable
                  onPress={pickPhoto}
                  style={[styles.addPhotoBtn, { borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}
                >
                  <Feather name="plus" size={32} color="#DAA520" />
                  <ThemedText style={[styles.addPhotoText, { color: theme.textSecondary }]}>Add photos</ThemedText>
                </Pressable>
              ) : null}
            </View>
          </Animated.View>
        );

      case 5:
        return (
          <Animated.View key="step5" entering={entering} exiting={exiting} style={styles.stepContainer}>
            <StepHeader
              emoji={"\u2705"}
              title="What's included in your safari?"
              subtitle="Select everything that's part of the experience"
            />
            <View style={styles.amenityGrid}>
              {INCLUSIONS.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => toggleInclusion(item.id)}
                  style={[
                    styles.amenityChip,
                    { borderColor: selectedInclusions.includes(item.id) ? "#DAA520" : theme.border, backgroundColor: selectedInclusions.includes(item.id) ? "rgba(218,165,32,0.1)" : theme.backgroundDefault },
                  ]}
                >
                  <ThemedText style={styles.amenityEmoji}>{item.emoji}</ThemedText>
                  <ThemedText style={[styles.amenityLabel, { color: selectedInclusions.includes(item.id) ? "#DAA520" : theme.text }]}>{item.label}</ThemedText>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        );

      case 6:
        return (
          <Animated.View key="step6" entering={entering} exiting={exiting} style={styles.stepContainer}>
            <StepHeader
              emoji={"\u{1F4B0}"}
              title="Set your price per person"
              subtitle="You can change it anytime"
            />
            <View style={styles.priceContainer}>
              <View style={[styles.priceInputWrapper, { borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}>
                <ThemedText style={[styles.priceCurrency, { color: "#DAA520" }]}>{getCurrencySymbol("usd")}</ThemedText>
                <TextInput
                  style={[styles.priceInput, { color: theme.text }]}
                  value={pricePerPerson}
                  onChangeText={(t) => setPricePerPerson(t.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  testID="input-price"
                />
              </View>
              <ThemedText style={[styles.priceLabel, { color: theme.textSecondary }]}>per person</ThemedText>

              {pricePerPerson.length > 0 ? (
                <View style={[styles.priceSummary, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                  <ThemedText style={[styles.priceSummaryTitle, { color: theme.text }]}>{"\u{1F4B5}"} Price breakdown</ThemedText>
                  <View style={styles.priceSummaryRow}>
                    <ThemedText style={[styles.priceSummaryLabel, { color: theme.textSecondary }]}>Base price</ThemedText>
                    <ThemedText style={[styles.priceSummaryValue, { color: theme.text }]}>{getCurrencySymbol("usd")}{pricePerPerson}</ThemedText>
                  </View>
                  <View style={styles.priceSummaryRow}>
                    <ThemedText style={[styles.priceSummaryLabel, { color: theme.textSecondary }]}>Tripsbnb service fee (12%)</ThemedText>
                    <ThemedText style={[styles.priceSummaryValue, { color: theme.textSecondary }]}>{getCurrencySymbol("usd")}{(parseFloat(pricePerPerson || "0") * 0.12).toFixed(2)}</ThemedText>
                  </View>
                  <View style={[styles.priceSummaryRow, styles.priceSummaryTotal]}>
                    <ThemedText style={[styles.priceSummaryLabel, { color: theme.text, fontWeight: "700" }]}>Guest pays</ThemedText>
                    <ThemedText style={[styles.priceSummaryValue, { color: "#DAA520", fontWeight: "700" }]}>{getCurrencySymbol("usd")}{(parseFloat(pricePerPerson || "0") * 1.12).toFixed(2)}</ThemedText>
                  </View>
                  <View style={styles.priceSummaryRow}>
                    <ThemedText style={[styles.priceSummaryLabel, { color: "#1A4D2E", fontWeight: "600" }]}>You earn</ThemedText>
                    <ThemedText style={[styles.priceSummaryValue, { color: "#1A4D2E", fontWeight: "700" }]}>{getCurrencySymbol("usd")}{pricePerPerson}</ThemedText>
                  </View>
                </View>
              ) : null}
            </View>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  if (step === TOTAL_STEPS) {
    return (
      <View style={[styles.successContainer, { backgroundColor: theme.backgroundRoot }]}>
        <LinearGradient
          colors={["#1A4D2E", "#2D6A4F"]}
          style={styles.successGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View entering={FadeIn.duration(600)} style={styles.successContent}>
            <ThemedText style={styles.successEmoji}>{"\u{1F981}"}</ThemedText>
            <ThemedText style={styles.successTitle}>Safari Listed!</ThemedText>
            <ThemedText style={styles.successSubtitle}>
              Congratulations! Your safari experience is now visible to travelers worldwide on Tripsbnb.
            </ThemedText>

            <View style={styles.successDetails}>
              <View style={styles.successDetailRow}>
                <ThemedText style={styles.successDetailEmoji}>{SAFARI_TYPES.find(t => t.id === safariType)?.emoji}</ThemedText>
                <ThemedText style={styles.successDetailText}>{SAFARI_TYPES.find(t => t.id === safariType)?.label}</ThemedText>
              </View>
              <View style={styles.successDetailRow}>
                <ThemedText style={styles.successDetailEmoji}>{"\u23F1\uFE0F"}</ThemedText>
                <ThemedText style={styles.successDetailText}>{getEffectiveDuration()}</ThemedText>
              </View>
              <View style={styles.successDetailRow}>
                <ThemedText style={styles.successDetailEmoji}>{"\u{1F4CD}"}</ThemedText>
                <ThemedText style={styles.successDetailText}>{city}, {country}</ThemedText>
              </View>
              <View style={styles.successDetailRow}>
                <ThemedText style={styles.successDetailEmoji}>{"\u{1F4B0}"}</ThemedText>
                <ThemedText style={styles.successDetailText}>{getCurrencySymbol("usd")}{pricePerPerson}/person</ThemedText>
              </View>
            </View>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if (onComplete) {
                  onComplete();
                } else {
                  navigation.goBack();
                }
              }}
              style={styles.successBtn}
            >
              <ThemedText style={styles.successBtnText}>Start Your Adventure {"\u{1F30D}"}</ThemedText>
            </Pressable>
          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  const stepLabels = ["Safari Type", "Details", "Location", "Group", "Photos", "Inclusions", "Price"];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={handleBack} style={styles.backBtn} testID="button-back">
          <Feather name={step === 0 ? "x" : "arrow-left"} size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText style={[styles.stepIndicator, { color: theme.textSecondary }]}>
            Step {step + 1} of {TOTAL_STEPS}
          </ThemedText>
          <ThemedText style={[styles.stepLabel, { color: theme.text }]}>{stepLabels[step]}</ThemedText>
        </View>
        <View style={styles.backBtn} />
      </View>

      <View style={[styles.progressBarContainer, { backgroundColor: theme.border }]}>
        <Animated.View style={[styles.progressBar, progressBarStyle]} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={[styles.scrollContentContainer, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStep()}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md, backgroundColor: theme.backgroundRoot, borderTopColor: theme.border }]}>
        <Pressable
          onPress={handleNext}
          disabled={!canProceed() || isSubmitting}
          style={[styles.nextBtn, { opacity: canProceed() && !isSubmitting ? 1 : 0.4 }]}
          testID="button-next"
        >
          <LinearGradient
            colors={["#1A4D2E", "#2D6A4F"]}
            style={styles.nextBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <ThemedText style={styles.nextBtnText}>
              {isSubmitting ? "Publishing..." : step === TOTAL_STEPS - 1 ? "Publish Safari \u{1F680}" : "Next"}
            </ThemedText>
            {step < TOTAL_STEPS - 1 ? <Feather name="arrow-right" size={20} color="#FFF" /> : null}
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

export default SafariOnboardingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    alignItems: "center",
  },
  stepIndicator: {
    fontSize: 12,
    fontWeight: "500",
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "CormorantGaramond_700Bold",
  },
  progressBarContainer: {
    height: 3,
    marginHorizontal: Spacing.lg,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#DAA520",
    borderRadius: 2,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  stepContainer: {
    flex: 1,
  },
  stepHeader: {
    marginBottom: Spacing.xl,
  },
  stepEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "CormorantGaramond_700Bold",
    lineHeight: 32,
    marginBottom: Spacing.sm,
  },
  stepSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  propertyOption: {
    width: (width - Spacing.lg * 2 - Spacing.sm * 2) / 3,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  optionEmoji: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  inputHint: {
    fontSize: 13,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  titleInput: {
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "CormorantGaramond_700Bold",
  },
  descInput: {
    minHeight: 140,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  countersContainer: {
    gap: 0,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  counterLabel: {
    fontSize: 17,
    fontWeight: "500",
  },
  counterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  counterValue: {
    fontSize: 18,
    fontWeight: "600",
    minWidth: 24,
    textAlign: "center",
  },
  amenityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  amenityEmoji: {
    fontSize: 18,
  },
  amenityLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  photosContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  photoWrapper: {
    width: (width - Spacing.lg * 2 - Spacing.sm) / 2,
    height: 150,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    position: "relative",
  },
  photoImage: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.lg,
  },
  photoRemoveBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  coverBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(218,165,32,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  coverBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
  },
  addPhotoBtn: {
    width: (width - Spacing.lg * 2 - Spacing.sm) / 2,
    height: 150,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  addPhotoText: {
    fontSize: 13,
    fontWeight: "500",
  },
  priceContainer: {
    alignItems: "center",
    paddingTop: Spacing.lg,
  },
  priceInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  priceCurrency: {
    fontSize: 40,
    fontWeight: "700",
    fontFamily: "CormorantGaramond_700Bold",
    marginRight: Spacing.sm,
  },
  priceInput: {
    fontSize: 48,
    fontWeight: "700",
    fontFamily: "CormorantGaramond_700Bold",
    minWidth: 100,
    textAlign: "center",
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: Spacing.xl,
  },
  priceSummary: {
    width: "100%",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  priceSummaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  priceSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceSummaryTotal: {
    borderTopWidth: 1,
    borderTopColor: "rgba(218,165,32,0.3)",
    paddingTop: Spacing.md,
    marginTop: Spacing.xs,
  },
  priceSummaryLabel: {
    fontSize: 14,
  },
  priceSummaryValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  nextBtn: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  nextBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md + 2,
    gap: Spacing.sm,
  },
  nextBtnText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "700",
  },
  successContainer: {
    flex: 1,
  },
  successGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  successContent: {
    alignItems: "center",
    width: "100%",
  },
  successEmoji: {
    fontSize: 80,
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: "700",
    fontFamily: "CormorantGaramond_700Bold",
    color: "#FFF",
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  successDetails: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: "100%",
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  successDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  successDetailEmoji: {
    fontSize: 24,
  },
  successDetailText: {
    fontSize: 16,
    color: "#FFF",
    fontWeight: "500",
    flex: 1,
  },
  successBtn: {
    backgroundColor: "#DAA520",
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xl * 2,
    width: "100%",
    alignItems: "center",
  },
  successBtnText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
