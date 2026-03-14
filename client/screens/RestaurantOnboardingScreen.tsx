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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

interface RestaurantFormData {
  name: string;
  description: string;
  cuisineType: string;
  priceRange: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
}

const CUISINE_TYPES = [
  "African",
  "American",
  "Asian",
  "Chinese",
  "French",
  "Indian",
  "Italian",
  "Japanese",
  "Mediterranean",
  "Mexican",
  "Middle Eastern",
  "Seafood",
  "Steakhouse",
  "Thai",
  "Vegetarian",
  "Other",
];

const PRICE_RANGES = [
  { label: "Budget Friendly", value: "$" },
  { label: "Moderate", value: "$$" },
  { label: "Upscale", value: "$$$" },
  { label: "Fine Dining", value: "$$$$" },
];

export function RestaurantOnboardingScreen({ navigation }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [formData, setFormData] = useState<RestaurantFormData>({
    name: "",
    description: "",
    cuisineType: "",
    priceRange: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    city: "",
    country: "",
    latitude: "",
    longitude: "",
  });

  const createRestaurantMutation = useMutation({
    mutationFn: async (data: RestaurantFormData) => {
      const response = await apiRequest("POST", "/api/restaurants", data);
      return response.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Success!",
        "Your restaurant has been registered successfully. It will appear in listings once verified.",
        [{ text: "Done", onPress: () => navigation.goBack() }]
      );
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to register restaurant");
    },
  });

  const detectLocation = async () => {
    setIsDetectingLocation(true);
    setLocationError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== "granted") {
        setLocationError("Location permission denied. Please enter location manually.");
        setIsDetectingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [reverseGeocode] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode) {
        setFormData((prev) => ({
          ...prev,
          city: reverseGeocode.city || reverseGeocode.subregion || "",
          country: reverseGeocode.country || "",
          address: [
            reverseGeocode.streetNumber,
            reverseGeocode.street,
            reverseGeocode.district,
          ]
            .filter(Boolean)
            .join(" ") || "",
          latitude: location.coords.latitude.toString(),
          longitude: location.coords.longitude.toString(),
        }));
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Location detection error:", error);
      setLocationError("Failed to detect location. Please enter manually.");
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const updateField = (field: keyof RestaurantFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.name.trim()) {
          Alert.alert("Required", "Please enter the restaurant name");
          return false;
        }
        if (!formData.cuisineType) {
          Alert.alert("Required", "Please select a cuisine type");
          return false;
        }
        if (!formData.priceRange) {
          Alert.alert("Required", "Please select a price range");
          return false;
        }
        return true;
      case 2:
        if (!formData.address.trim()) {
          Alert.alert("Required", "Please enter the address");
          return false;
        }
        if (!formData.city.trim()) {
          Alert.alert("Required", "Please enter the city");
          return false;
        }
        if (!formData.country.trim()) {
          Alert.alert("Required", "Please enter the country");
          return false;
        }
        return true;
      case 3:
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
      } else {
        createRestaurantMutation.mutate(formData);
      }
    }
  };

  const prevStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step > 1) {
      setStep(step - 1);
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
                backgroundColor: s <= step ? theme.primary : theme.border,
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
          {s < 3 && (
            <View
              style={[
                styles.stepLine,
                { backgroundColor: s < step ? theme.primary : theme.border },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <ThemedText type="h2" style={styles.stepTitle}>
        Restaurant Details
      </ThemedText>
      <ThemedText type="body" style={styles.stepSubtitle}>
        Tell us about your restaurant
      </ThemedText>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Restaurant Name *
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.backgroundSecondary, color: theme.text },
          ]}
          placeholder="Enter restaurant name"
          placeholderTextColor={theme.textSecondary}
          value={formData.name}
          onChangeText={(v) => updateField("name", v)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Description
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            { backgroundColor: theme.backgroundSecondary, color: theme.text },
          ]}
          placeholder="Brief description of your restaurant"
          placeholderTextColor={theme.textSecondary}
          value={formData.description}
          onChangeText={(v) => updateField("description", v)}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Cuisine Type *
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
        >
          {CUISINE_TYPES.map((cuisine) => (
            <Pressable
              key={cuisine}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateField("cuisineType", cuisine);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    formData.cuisineType === cuisine
                      ? theme.primary
                      : theme.backgroundSecondary,
                },
              ]}
            >
              <ThemedText
                type="caption"
                style={{
                  color:
                    formData.cuisineType === cuisine ? "#FFFFFF" : theme.text,
                }}
              >
                {cuisine}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Price Range *
        </ThemedText>
        <View style={styles.priceRangeContainer}>
          {PRICE_RANGES.map((price) => (
            <Pressable
              key={price.value}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateField("priceRange", price.value);
              }}
              style={[
                styles.priceChip,
                {
                  backgroundColor:
                    formData.priceRange === price.value
                      ? theme.primary
                      : theme.backgroundSecondary,
                  borderColor:
                    formData.priceRange === price.value
                      ? theme.primary
                      : theme.border,
                },
              ]}
            >
              <ThemedText
                type="label"
                style={{
                  color:
                    formData.priceRange === price.value
                      ? "#FFFFFF"
                      : theme.accent,
                }}
              >
                {price.value}
              </ThemedText>
              <ThemedText
                type="caption"
                style={{
                  color:
                    formData.priceRange === price.value
                      ? "rgba(255,255,255,0.8)"
                      : theme.textSecondary,
                }}
              >
                {price.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <ThemedText type="h2" style={styles.stepTitle}>
        Location
      </ThemedText>
      <ThemedText type="body" style={styles.stepSubtitle}>
        Your restaurant will be categorized by country and city
      </ThemedText>

      <Pressable
        onPress={detectLocation}
        disabled={isDetectingLocation}
        style={[
          styles.detectButton,
          { backgroundColor: theme.primary },
          isDetectingLocation && { opacity: 0.7 },
        ]}
      >
        {isDetectingLocation ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Feather name="map-pin" size={20} color="#FFFFFF" />
            <ThemedText type="label" style={styles.detectButtonText}>
              Auto-Detect Location
            </ThemedText>
          </>
        )}
      </Pressable>

      {locationError ? (
        <ThemedText type="caption" style={styles.errorText}>
          {locationError}
        </ThemedText>
      ) : null}

      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        <ThemedText type="caption" style={styles.dividerText}>
          or enter manually
        </ThemedText>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Country *
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.backgroundSecondary, color: theme.text },
          ]}
          placeholder="e.g., Kenya, Tanzania, South Africa"
          placeholderTextColor={theme.textSecondary}
          value={formData.country}
          onChangeText={(v) => updateField("country", v)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          City *
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.backgroundSecondary, color: theme.text },
          ]}
          placeholder="e.g., Nairobi, Dar es Salaam, Cape Town"
          placeholderTextColor={theme.textSecondary}
          value={formData.city}
          onChangeText={(v) => updateField("city", v)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Street Address *
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.backgroundSecondary, color: theme.text },
          ]}
          placeholder="Enter full address"
          placeholderTextColor={theme.textSecondary}
          value={formData.address}
          onChangeText={(v) => updateField("address", v)}
        />
      </View>

      {formData.latitude && formData.longitude ? (
        <View style={[styles.locationConfirm, { backgroundColor: theme.success + "20" }]}>
          <Feather name="check-circle" size={18} color={theme.success} />
          <ThemedText type="caption" style={{ color: theme.success, marginLeft: Spacing.sm }}>
            GPS coordinates captured
          </ThemedText>
        </View>
      ) : null}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <ThemedText type="h2" style={styles.stepTitle}>
        Contact Info
      </ThemedText>
      <ThemedText type="body" style={styles.stepSubtitle}>
        How can customers reach you? (Optional)
      </ThemedText>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Phone Number
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.backgroundSecondary, color: theme.text },
          ]}
          placeholder="+254 700 000 000"
          placeholderTextColor={theme.textSecondary}
          value={formData.phone}
          onChangeText={(v) => updateField("phone", v)}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Email
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.backgroundSecondary, color: theme.text },
          ]}
          placeholder="restaurant@example.com"
          placeholderTextColor={theme.textSecondary}
          value={formData.email}
          onChangeText={(v) => updateField("email", v)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="label" style={styles.inputLabel}>
          Website
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.backgroundSecondary, color: theme.text },
          ]}
          placeholder="https://www.yourrestaurant.com"
          placeholderTextColor={theme.textSecondary}
          value={formData.website}
          onChangeText={(v) => updateField("website", v)}
          keyboardType="url"
          autoCapitalize="none"
        />
      </View>

      <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSecondary }, Shadows.card]}>
        <ThemedText type="h4" style={styles.summaryTitle}>
          Summary
        </ThemedText>
        <View style={styles.summaryRow}>
          <Feather name="home" size={16} color={theme.textSecondary} />
          <ThemedText type="body" style={styles.summaryText}>
            {formData.name || "Restaurant Name"}
          </ThemedText>
        </View>
        <View style={styles.summaryRow}>
          <Feather name="map-pin" size={16} color={theme.textSecondary} />
          <ThemedText type="body" style={styles.summaryText}>
            {formData.city && formData.country
              ? `${formData.city}, ${formData.country}`
              : "Location"}
          </ThemedText>
        </View>
        <View style={styles.summaryRow}>
          <Feather name="tag" size={16} color={theme.textSecondary} />
          <ThemedText type="body" style={styles.summaryText}>
            {formData.cuisineType || "Cuisine"} {formData.priceRange ? `• ${formData.priceRange}` : ""}
          </ThemedText>
        </View>
      </View>
    </View>
  );

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
          {renderStepIndicator()}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
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
                onPress={prevStep}
                style={[styles.backButton, { borderColor: theme.border }]}
              >
                <Feather name="arrow-left" size={20} color={theme.text} />
                <ThemedText type="label">Back</ThemedText>
              </Pressable>
            ) : (
              <View style={styles.backButtonPlaceholder} />
            )}

            <Pressable
              onPress={nextStep}
              disabled={createRestaurantMutation.isPending}
              style={[styles.nextButton, { opacity: createRestaurantMutation.isPending ? 0.7 : 1 }]}
            >
              <LinearGradient
                colors={["#1A4D2E", "#2D6A4F"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextButtonGradient}
              >
                {createRestaurantMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <ThemedText type="label" style={styles.nextButtonText}>
                      {step === 3 ? "Submit" : "Continue"}
                    </ThemedText>
                    <Feather
                      name={step === 3 ? "check" : "arrow-right"}
                      size={20}
                      color="#FFFFFF"
                    />
                  </>
                )}
              </LinearGradient>
            </Pressable>
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
  priceRangeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  priceChip: {
    flex: 1,
    minWidth: "45%",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  detectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  detectButtonText: {
    color: "#FFFFFF",
  },
  errorText: {
    color: "#FF3B30",
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    opacity: 0.6,
  },
  locationConfirm: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  summaryCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xl,
  },
  summaryTitle: {
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  summaryText: {
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
});
