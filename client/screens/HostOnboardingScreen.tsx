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

const PROPERTY_TYPES = [
  { id: "house", emoji: "🏠", label: "House" },
  { id: "apartment", emoji: "🏢", label: "Apartment" },
  { id: "guesthouse", emoji: "🏡", label: "Guesthouse" },
  { id: "hotel", emoji: "🏨", label: "Hotel" },
  { id: "villa", emoji: "🏰", label: "Villa" },
  { id: "cottage", emoji: "🛖", label: "Cottage" },
  { id: "cabin", emoji: "🪵", label: "Cabin" },
  { id: "resort", emoji: "🌴", label: "Resort" },
  { id: "lodge", emoji: "🏔️", label: "Lodge" },
  { id: "camp", emoji: "⛺", label: "Camp" },
  { id: "hostel", emoji: "🛏️", label: "Hostel" },
  { id: "treehouse", emoji: "🌳", label: "Treehouse" },
];

const PLACE_TYPES = [
  { id: "entire", emoji: "🏠", label: "An entire place", desc: "Guests have the whole place to themselves" },
  { id: "private", emoji: "🚪", label: "A private room", desc: "Guests have their own room with shared spaces" },
  { id: "shared", emoji: "🛏️", label: "A shared room", desc: "Guests sleep in a shared space" },
];

const AMENITIES = [
  { id: "wifi", emoji: "📶", label: "Wi-Fi" },
  { id: "tv", emoji: "📺", label: "TV" },
  { id: "kitchen", emoji: "🍳", label: "Kitchen" },
  { id: "washer", emoji: "🧺", label: "Washer" },
  { id: "parking", emoji: "🅿️", label: "Free parking" },
  { id: "ac", emoji: "❄️", label: "Air conditioning" },
  { id: "heating", emoji: "🔥", label: "Heating" },
  { id: "pool", emoji: "🏊", label: "Pool" },
  { id: "hot_tub", emoji: "🛁", label: "Hot tub" },
  { id: "gym", emoji: "💪", label: "Gym" },
  { id: "bbq", emoji: "🍖", label: "BBQ grill" },
  { id: "balcony", emoji: "🌅", label: "Balcony" },
  { id: "garden", emoji: "🌿", label: "Garden" },
  { id: "security", emoji: "🔒", label: "Security" },
  { id: "workspace", emoji: "💻", label: "Workspace" },
  { id: "breakfast", emoji: "🥐", label: "Breakfast" },
];

const STANDOUT_AMENITIES = [
  { id: "ocean_view", emoji: "🌊", label: "Ocean view" },
  { id: "mountain_view", emoji: "🏔️", label: "Mountain view" },
  { id: "beachfront", emoji: "🏖️", label: "Beachfront" },
  { id: "fireplace", emoji: "🔥", label: "Fireplace" },
  { id: "piano", emoji: "🎹", label: "Piano" },
  { id: "sauna", emoji: "🧖", label: "Sauna" },
  { id: "game_room", emoji: "🎮", label: "Game room" },
  { id: "library", emoji: "📚", label: "Library" },
];

const TOTAL_STEPS = 8;

interface HostOnboardingScreenProps {
  onComplete?: () => void;
}

export function HostOnboardingScreen({ onComplete }: HostOnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [propertyType, setPropertyType] = useState("");
  const [placeType, setPlaceType] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [guests, setGuests] = useState(1);
  const [bedrooms, setBedrooms] = useState(1);
  const [beds, setBeds] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedStandout, setSelectedStandout] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pricePerNight, setPricePerNight] = useState("");

  const progressWidth = useSharedValue(0);

  useEffect(() => {
    progressWidth.value = withSpring(((step + 1) / TOTAL_STEPS) * 100, { damping: 15, stiffness: 100 });
  }, [step]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%` as any,
  }));

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return propertyType.length > 0;
      case 1: return placeType.length > 0;
      case 2: return country.trim().length > 0 && city.trim().length > 0 && address.trim().length > 0;
      case 3: return guests > 0 && bedrooms > 0 && beds > 0 && bathrooms > 0;
      case 4: return selectedAmenities.length > 0;
      case 5: return true;
      case 6: return title.trim().length > 0 && description.trim().length > 0;
      case 7: return pricePerNight.trim().length > 0 && parseInt(pricePerNight) > 0;
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

  const toggleAmenity = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleStandout = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStandout((prev) =>
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
      const allAmenities = [...selectedAmenities, ...selectedStandout].join(",");
      const roomTypes = `${placeType},${guests} guests,${bedrooms} bedrooms,${beds} beds,${bathrooms} bathrooms`;
      const priceInCents = Math.round(parseFloat(pricePerNight) * 100);

      const baseUrl = getApiUrl();
      const url = new URL("/api/accommodations", baseUrl);
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: title,
          description,
          propertyType,
          amenities: allAmenities,
          roomTypes,
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

  const Counter = ({ label, value, onIncrement, onDecrement, min = 0 }: { label: string; value: number; onIncrement: () => void; onDecrement: () => void; min?: number }) => (
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
          style={[styles.counterBtn, { borderColor: theme.textSecondary }]}
        >
          <Feather name="plus" size={18} color={theme.textSecondary} />
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
              emoji="🏠"
              title="Which of these best describes your place?"
              subtitle="Choose the type that matches your property"
            />
            <View style={styles.optionsGrid}>
              {PROPERTY_TYPES.map((type) => (
                <Pressable
                  key={type.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPropertyType(type.id); }}
                  style={[
                    styles.propertyOption,
                    { borderColor: propertyType === type.id ? "#DAA520" : theme.border, backgroundColor: propertyType === type.id ? "rgba(218,165,32,0.1)" : theme.backgroundDefault },
                  ]}
                >
                  <ThemedText style={styles.optionEmoji}>{type.emoji}</ThemedText>
                  <ThemedText style={[styles.optionLabel, { color: propertyType === type.id ? "#DAA520" : theme.text }]}>{type.label}</ThemedText>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        );

      case 1:
        return (
          <Animated.View key="step1" entering={entering} exiting={exiting} style={styles.stepContainer}>
            <StepHeader
              emoji="🚪"
              title="What type of place will guests have?"
              subtitle="Pick the option that best describes your listing"
            />
            <View style={styles.placeTypeList}>
              {PLACE_TYPES.map((type) => (
                <Pressable
                  key={type.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPlaceType(type.id); }}
                  style={[
                    styles.placeTypeCard,
                    { borderColor: placeType === type.id ? "#DAA520" : theme.border, backgroundColor: placeType === type.id ? "rgba(218,165,32,0.1)" : theme.backgroundDefault },
                  ]}
                >
                  <View style={styles.placeTypeLeft}>
                    <ThemedText style={styles.placeTypeEmoji}>{type.emoji}</ThemedText>
                    <View style={styles.placeTypeText}>
                      <ThemedText style={[styles.placeTypeLabel, { color: placeType === type.id ? "#DAA520" : theme.text }]}>{type.label}</ThemedText>
                      <ThemedText style={[styles.placeTypeDesc, { color: theme.textSecondary }]}>{type.desc}</ThemedText>
                    </View>
                  </View>
                  <View style={[styles.radioOuter, { borderColor: placeType === type.id ? "#DAA520" : theme.border }]}>
                    {placeType === type.id ? <View style={styles.radioInner} /> : null}
                  </View>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        );

      case 2:
        return (
          <Animated.View key="step2" entering={entering} exiting={exiting} style={styles.stepContainer}>
            <StepHeader
              emoji="📍"
              title="Where's your place located?"
              subtitle="Your address is only shared with guests after they book"
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
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary, marginTop: Spacing.md }]}>Street address</ThemedText>
              <TextInput
                style={[styles.textInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. 123 Safari Road"
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
              emoji="🛏️"
              title="Share some basics about your place"
              subtitle="You'll add more details later, like bed types"
            />
            <View style={styles.countersContainer}>
              <Counter label="Guests" value={guests} onIncrement={() => setGuests(g => g + 1)} onDecrement={() => setGuests(g => Math.max(1, g - 1))} min={1} />
              <Counter label="Bedrooms" value={bedrooms} onIncrement={() => setBedrooms(b => b + 1)} onDecrement={() => setBedrooms(b => Math.max(1, b - 1))} min={1} />
              <Counter label="Beds" value={beds} onIncrement={() => setBeds(b => b + 1)} onDecrement={() => setBeds(b => Math.max(1, b - 1))} min={1} />
              <Counter label="Bathrooms" value={bathrooms} onIncrement={() => setBathrooms(b => b + 1)} onDecrement={() => setBathrooms(b => Math.max(1, b - 1))} min={1} />
            </View>
          </Animated.View>
        );

      case 4:
        return (
          <Animated.View key="step4" entering={entering} exiting={exiting} style={styles.stepContainer}>
            <StepHeader
              emoji="✨"
              title="Tell guests what your place has to offer"
              subtitle="Select all amenities available at your property"
            />
            <ThemedText style={[styles.amenitySection, { color: theme.text }]}>Essentials</ThemedText>
            <View style={styles.amenityGrid}>
              {AMENITIES.map((amenity) => (
                <Pressable
                  key={amenity.id}
                  onPress={() => toggleAmenity(amenity.id)}
                  style={[
                    styles.amenityChip,
                    { borderColor: selectedAmenities.includes(amenity.id) ? "#DAA520" : theme.border, backgroundColor: selectedAmenities.includes(amenity.id) ? "rgba(218,165,32,0.1)" : theme.backgroundDefault },
                  ]}
                >
                  <ThemedText style={styles.amenityEmoji}>{amenity.emoji}</ThemedText>
                  <ThemedText style={[styles.amenityLabel, { color: selectedAmenities.includes(amenity.id) ? "#DAA520" : theme.text }]}>{amenity.label}</ThemedText>
                </Pressable>
              ))}
            </View>
            <ThemedText style={[styles.amenitySection, { color: theme.text, marginTop: Spacing.lg }]}>Standout amenities</ThemedText>
            <View style={styles.amenityGrid}>
              {STANDOUT_AMENITIES.map((amenity) => (
                <Pressable
                  key={amenity.id}
                  onPress={() => toggleStandout(amenity.id)}
                  style={[
                    styles.amenityChip,
                    { borderColor: selectedStandout.includes(amenity.id) ? "#DAA520" : theme.border, backgroundColor: selectedStandout.includes(amenity.id) ? "rgba(218,165,32,0.1)" : theme.backgroundDefault },
                  ]}
                >
                  <ThemedText style={styles.amenityEmoji}>{amenity.emoji}</ThemedText>
                  <ThemedText style={[styles.amenityLabel, { color: selectedStandout.includes(amenity.id) ? "#DAA520" : theme.text }]}>{amenity.label}</ThemedText>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        );

      case 5:
        return (
          <Animated.View key="step5" entering={entering} exiting={exiting} style={styles.stepContainer}>
            <StepHeader
              emoji="📸"
              title="Add some photos of your place"
              subtitle="You'll need at least 1 photo to get started. You can add more later."
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

      case 6:
        return (
          <Animated.View key="step6" entering={entering} exiting={exiting} style={styles.stepContainer}>
            <StepHeader
              emoji="✏️"
              title="Now, let's give your place a title"
              subtitle="Short titles work best. Have fun with it!"
            />
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.textInput, styles.titleInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}
                value={title}
                onChangeText={(t) => setTitle(t.slice(0, 50))}
                placeholder="e.g. Cozy treehouse with ocean view"
                placeholderTextColor={theme.textSecondary}
                maxLength={50}
                testID="input-title"
              />
              <ThemedText style={[styles.charCount, { color: theme.textSecondary }]}>{title.length}/50</ThemedText>

              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary, marginTop: Spacing.xl }]}>Description</ThemedText>
              <ThemedText style={[styles.inputHint, { color: theme.textSecondary }]}>Share what makes your place special and what guests can expect</ThemedText>
              <TextInput
                style={[styles.textInput, styles.descInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}
                value={description}
                onChangeText={(t) => setDescription(t.slice(0, 500))}
                placeholder="Tell guests about your space, neighborhood, and what makes it unique..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={500}
                testID="input-description"
              />
              <ThemedText style={[styles.charCount, { color: theme.textSecondary }]}>{description.length}/500</ThemedText>
            </View>
          </Animated.View>
        );

      case 7:
        return (
          <Animated.View key="step7" entering={entering} exiting={exiting} style={styles.stepContainer}>
            <StepHeader
              emoji="💰"
              title="Now, set your price"
              subtitle="You can change it anytime"
            />
            <View style={styles.priceContainer}>
              <View style={[styles.priceInputWrapper, { borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}>
                <ThemedText style={[styles.priceCurrency, { color: "#DAA520" }]}>{getCurrencySymbol("usd")}</ThemedText>
                <TextInput
                  style={[styles.priceInput, { color: theme.text }]}
                  value={pricePerNight}
                  onChangeText={(t) => setPricePerNight(t.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  testID="input-price"
                />
              </View>
              <ThemedText style={[styles.priceLabel, { color: theme.textSecondary }]}>per night</ThemedText>

              {pricePerNight.length > 0 ? (
                <View style={[styles.priceSummary, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                  <ThemedText style={[styles.priceSummaryTitle, { color: theme.text }]}>💵 Price breakdown</ThemedText>
                  <View style={styles.priceSummaryRow}>
                    <ThemedText style={[styles.priceSummaryLabel, { color: theme.textSecondary }]}>Base price</ThemedText>
                    <ThemedText style={[styles.priceSummaryValue, { color: theme.text }]}>{getCurrencySymbol("usd")}{pricePerNight}</ThemedText>
                  </View>
                  <View style={styles.priceSummaryRow}>
                    <ThemedText style={[styles.priceSummaryLabel, { color: theme.textSecondary }]}>Tripsbnb service fee (12%)</ThemedText>
                    <ThemedText style={[styles.priceSummaryValue, { color: theme.textSecondary }]}>{getCurrencySymbol("usd")}{(parseFloat(pricePerNight || "0") * 0.12).toFixed(2)}</ThemedText>
                  </View>
                  <View style={[styles.priceSummaryRow, styles.priceSummaryTotal]}>
                    <ThemedText style={[styles.priceSummaryLabel, { color: theme.text, fontWeight: "700" }]}>Guest pays</ThemedText>
                    <ThemedText style={[styles.priceSummaryValue, { color: "#DAA520", fontWeight: "700" }]}>{getCurrencySymbol("usd")}{(parseFloat(pricePerNight || "0") * 1.12).toFixed(2)}</ThemedText>
                  </View>
                  <View style={styles.priceSummaryRow}>
                    <ThemedText style={[styles.priceSummaryLabel, { color: "#1A4D2E", fontWeight: "600" }]}>You earn</ThemedText>
                    <ThemedText style={[styles.priceSummaryValue, { color: "#1A4D2E", fontWeight: "700" }]}>{getCurrencySymbol("usd")}{pricePerNight}</ThemedText>
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
            <ThemedText style={styles.successEmoji}>🎉</ThemedText>
            <ThemedText style={styles.successTitle}>Your listing is live!</ThemedText>
            <ThemedText style={styles.successSubtitle}>
              Congratulations! Your property is now visible to travelers worldwide on Tripsbnb.
            </ThemedText>

            <View style={styles.successDetails}>
              <View style={styles.successDetailRow}>
                <ThemedText style={styles.successDetailEmoji}>{PROPERTY_TYPES.find(t => t.id === propertyType)?.emoji}</ThemedText>
                <ThemedText style={styles.successDetailText}>{title}</ThemedText>
              </View>
              <View style={styles.successDetailRow}>
                <ThemedText style={styles.successDetailEmoji}>📍</ThemedText>
                <ThemedText style={styles.successDetailText}>{city}, {country}</ThemedText>
              </View>
              <View style={styles.successDetailRow}>
                <ThemedText style={styles.successDetailEmoji}>💰</ThemedText>
                <ThemedText style={styles.successDetailText}>{getCurrencySymbol("usd")}{pricePerNight}/night</ThemedText>
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
              <ThemedText style={styles.successBtnText}>Start Hosting 🏡</ThemedText>
            </Pressable>
          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  const stepLabels = ["Property", "Type", "Location", "Basics", "Amenities", "Photos", "Details", "Price"];

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
              {isSubmitting ? "Publishing..." : step === TOTAL_STEPS - 1 ? "Publish Listing 🚀" : "Next"}
            </ThemedText>
            {step < TOTAL_STEPS - 1 ? <Feather name="arrow-right" size={20} color="#FFF" /> : null}
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

export default HostOnboardingScreen;

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
  placeTypeList: {
    gap: Spacing.md,
  },
  placeTypeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
  },
  placeTypeLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  placeTypeEmoji: {
    fontSize: 36,
    marginRight: Spacing.md,
  },
  placeTypeText: {
    flex: 1,
  },
  placeTypeLabel: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  placeTypeDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.md,
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#DAA520",
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
  amenitySection: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: Spacing.md,
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
