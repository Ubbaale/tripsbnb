import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNavigation } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { formatPrice, getCurrencySymbol } from "@/lib/currency";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

const SERVICE_TYPES = [
  { value: "tour_guide", label: "Tour Guide", icon: "compass" as const },
  { value: "translator", label: "Translator", icon: "globe" as const },
  { value: "driver", label: "Driver", icon: "truck" as const },
  { value: "travel_buddy", label: "Travel Buddy", icon: "users" as const },
  { value: "escort", label: "Escort / Social Companion", icon: "heart" as const },
];

const ESCORT_SERVICE_CATEGORIES = [
  { value: "dinner_date", label: "Dinner Date", icon: "coffee" as const },
  { value: "city_tour", label: "City Tour", icon: "map-pin" as const },
  { value: "event_companion", label: "Event Companion", icon: "star" as const },
  { value: "social_companion", label: "Social Companion", icon: "smile" as const },
  { value: "travel_partner", label: "Travel Partner", icon: "navigation" as const },
];

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];

const INTEREST_OPTIONS = [
  "Photography", "Hiking", "Food", "History", "Art",
  "Music", "Nature", "Architecture", "Shopping", "Nightlife",
  "Sports", "Beach", "Culture", "Wildlife", "Adventure",
];

const LANGUAGE_OPTIONS = [
  "English", "Spanish", "French", "German", "Italian",
  "Portuguese", "Mandarin", "Japanese", "Korean", "Arabic",
  "Hindi", "Russian", "Swahili", "Turkish",
];

export function CompanionOnboardingScreen() {
  const insets = useSafeAreaInsets();

  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [availability, setAvailability] = useState("");
  const [bookingPrice, setBookingPrice] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedServiceCategories, setSelectedServiceCategories] = useState<string[]>([]);
  const [serviceDescription, setServiceDescription] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [minimumHours, setMinimumHours] = useState("2");
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      const isEscort = serviceType === "escort";
      const payload: any = {
        name,
        age: age ? parseInt(age) : null,
        gender: gender || null,
        serviceType,
        city,
        country,
        bio: bio || null,
        interests: JSON.stringify(selectedInterests),
        languages: JSON.stringify(selectedLanguages),
        availability: availability || null,
        bookingPrice: isEscort
          ? (hourlyRate ? Math.round(parseFloat(hourlyRate) * 100) * (parseInt(minimumHours) || 2) : null)
          : (bookingPrice ? Math.round(parseFloat(bookingPrice) * 100) : null),
        photos: JSON.stringify(uploadedPhotos),
        isActive: true,
        ...(isEscort ? {
          isEscort: true,
          serviceCategories: JSON.stringify(selectedServiceCategories),
          serviceDescription: serviceDescription || null,
          hourlyRate: hourlyRate ? Math.round(parseFloat(hourlyRate) * 100) : null,
          minimumHours: parseInt(minimumHours) || 2,
          platformFeePercent: 20,
        } : {}),
      };
      await apiRequest("POST", "/api/companions", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companions/discover"] });
      Alert.alert("Profile Created", "Your companion profile is now live!", [
        {
          text: "OK",
          onPress: () => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.reset({
                index: 0,
                routes: [{ name: "Main" as never }],
              });
            }
          },
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert("Error", error?.message || "Failed to create profile. Please try again.");
    },
  });

  const isEscortType = serviceType === "escort";

  const STEPS = isEscortType ? [
    { title: "Basic Info", subtitle: "Tell us about yourself" },
    { title: "Your Service", subtitle: "What type of companion are you?" },
    { title: "Your Services", subtitle: "What experiences do you offer?" },
    { title: "Location", subtitle: "Where are you based?" },
    { title: "About You", subtitle: "Share your story" },
    { title: "Photos", subtitle: "Add your best photos" },
    { title: "Languages", subtitle: "What languages do you speak?" },
    { title: "Interests", subtitle: "What are you passionate about?" },
    { title: "Rates & Availability", subtitle: "Set your pricing" },
    { title: "Terms & Safety", subtitle: "Review and accept our terms" },
  ] : [
    { title: "Basic Info", subtitle: "Tell us about yourself" },
    { title: "Your Service", subtitle: "What do you offer travelers?" },
    { title: "Location", subtitle: "Where are you based?" },
    { title: "About You", subtitle: "Share your story" },
    { title: "Photos", subtitle: "Add your best photos" },
    { title: "Languages", subtitle: "What languages do you speak?" },
    { title: "Interests", subtitle: "What are you passionate about?" },
    { title: "Availability", subtitle: "When are you available?" },
    { title: "Terms & Safety", subtitle: "Review and accept our terms" },
  ];

  const canGoNext = () => {
    if (isEscortType) {
      switch (step) {
        case 0: return name.trim().length > 0;
        case 1: return serviceType.length > 0;
        case 2: return selectedServiceCategories.length > 0;
        case 3: return city.trim().length > 0 && country.trim().length > 0;
        case 4: return true;
        case 5: return uploadedPhotos.length > 0;
        case 6: return selectedLanguages.length > 0;
        case 7: return true;
        case 8: return hourlyRate.trim().length > 0;
        case 9: return termsAccepted;
        default: return false;
      }
    }
    switch (step) {
      case 0: return name.trim().length > 0;
      case 1: return serviceType.length > 0;
      case 2: return city.trim().length > 0 && country.trim().length > 0;
      case 3: return true;
      case 4: return uploadedPhotos.length > 0;
      case 5: return selectedLanguages.length > 0;
      case 6: return true;
      case 7: return true;
      case 8: return termsAccepted;
      default: return false;
    }
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      createMutation.mutate();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: "Main" as never }],
      });
    }
  };

  const toggleInterest = (interest: string) => {
    Haptics.selectionAsync();
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const toggleLanguage = (lang: string) => {
    Haptics.selectionAsync();
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const pickAndUploadPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      setUploading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const asset = result.assets[0];
      const formData = new FormData();

      if (Platform.OS === "web") {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        formData.append("photo", blob, "photo.jpg");
      } else {
        const uriParts = asset.uri.split(".");
        const fileType = uriParts[uriParts.length - 1] || "jpg";
        formData.append("photo", {
          uri: asset.uri,
          name: `photo.${fileType}`,
          type: `image/${fileType === "jpg" ? "jpeg" : fileType}`,
        } as any);
      }

      const baseUrl = getApiUrl();
      const uploadUrl = new URL("/api/companions/upload-photo", baseUrl);
      const res = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setUploadedPhotos((prev) => [...prev, data.url]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Photo upload error:", error);
      Alert.alert("Upload Failed", "Could not upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Needed", "Camera access is required to take photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      setUploading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const asset = result.assets[0];
      const formData = new FormData();

      if (Platform.OS === "web") {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        formData.append("photo", blob, "selfie.jpg");
      } else {
        const uriParts = asset.uri.split(".");
        const fileType = uriParts[uriParts.length - 1] || "jpg";
        formData.append("photo", {
          uri: asset.uri,
          name: `photo.${fileType}`,
          type: `image/${fileType === "jpg" ? "jpeg" : fileType}`,
        } as any);
      }

      const baseUrl = getApiUrl();
      const uploadUrl = new URL("/api/companions/upload-photo", baseUrl);
      const res = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setUploadedPhotos((prev) => [...prev, data.url]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Photo upload error:", error);
      Alert.alert("Upload Failed", "Could not upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleServiceCategory = (cat: string) => {
    Haptics.selectionAsync();
    setSelectedServiceCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const renderBasicInfoStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.inputGroup}>
        <ThemedText type="label">Name</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
          value={name}
          onChangeText={setName}
          placeholder="Your full name"
          placeholderTextColor={theme.textSecondary}
          testID="input-name"
        />
      </View>
      <View style={styles.inputGroup}>
        <ThemedText type="label">Age</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
          value={age}
          onChangeText={setAge}
          placeholder="Your age"
          placeholderTextColor={theme.textSecondary}
          keyboardType="numeric"
          testID="input-age"
        />
      </View>
      <View style={styles.inputGroup}>
        <ThemedText type="label">Gender</ThemedText>
        <View style={styles.optionGrid}>
          {GENDER_OPTIONS.map((g) => (
            <Pressable
              key={g}
              onPress={() => { Haptics.selectionAsync(); setGender(g); }}
              style={[
                styles.optionChip,
                { backgroundColor: gender === g ? theme.primary : theme.backgroundSecondary },
              ]}
              testID={`option-gender-${g.toLowerCase().replace(/\s/g, "-")}`}
            >
              <ThemedText type="small" style={{ color: gender === g ? "#FFFFFF" : theme.text }}>
                {g}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );

  const renderServiceTypeStep = () => (
    <View style={styles.stepContent}>
      {SERVICE_TYPES.map((s) => (
        <Pressable
          key={s.value}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setServiceType(s.value); }}
          style={[
            styles.serviceCard,
            { backgroundColor: theme.backgroundDefault, borderColor: serviceType === s.value ? theme.primary : theme.border },
            Shadows.card,
          ]}
          testID={`option-service-${s.value}`}
        >
          <LinearGradient
            colors={serviceType === s.value ? ["#1A4D2E", "#2D6A4F"] : (s.value === "escort" ? ["#8B0000", "#C41E3A"] : ["#6B3FA0", "#8E5CC5"])}
            style={styles.serviceIcon}
          >
            <Feather name={s.icon} size={22} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.serviceInfo}>
            <ThemedText type="h4">{s.label}</ThemedText>
            {s.value === "escort" ? (
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>Premium companion services</ThemedText>
            ) : null}
          </View>
          {serviceType === s.value ? (
            <Feather name="check-circle" size={22} color={theme.primary} />
          ) : null}
        </Pressable>
      ))}
    </View>
  );

  const renderEscortServicesStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
        Select the experiences you offer
      </ThemedText>
      {ESCORT_SERVICE_CATEGORIES.map((cat) => (
        <Pressable
          key={cat.value}
          onPress={() => toggleServiceCategory(cat.value)}
          style={[
            styles.serviceCard,
            { backgroundColor: theme.backgroundDefault, borderColor: selectedServiceCategories.includes(cat.value) ? "#DAA520" : theme.border },
            Shadows.card,
          ]}
          testID={`option-escort-${cat.value}`}
        >
          <LinearGradient
            colors={selectedServiceCategories.includes(cat.value) ? ["#DAA520", "#B8860B"] : ["#6B3FA0", "#8E5CC5"]}
            style={styles.serviceIcon}
          >
            <Feather name={cat.icon} size={22} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.serviceInfo}>
            <ThemedText type="h4">{cat.label}</ThemedText>
          </View>
          {selectedServiceCategories.includes(cat.value) ? (
            <Feather name="check-circle" size={22} color="#DAA520" />
          ) : null}
        </Pressable>
      ))}
      <View style={[styles.inputGroup, { marginTop: Spacing.lg }]}>
        <ThemedText type="label">Describe Your Services</ThemedText>
        <TextInput
          style={[styles.textArea, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
          value={serviceDescription}
          onChangeText={setServiceDescription}
          placeholder="Describe the experiences you provide in detail..."
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          testID="input-service-description"
        />
      </View>
    </View>
  );

  const renderLocationStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.inputGroup}>
        <ThemedText type="label">City</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
          value={city}
          onChangeText={setCity}
          placeholder="e.g. Nairobi"
          placeholderTextColor={theme.textSecondary}
          testID="input-city"
        />
      </View>
      <View style={styles.inputGroup}>
        <ThemedText type="label">Country</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
          value={country}
          onChangeText={setCountry}
          placeholder="e.g. Kenya"
          placeholderTextColor={theme.textSecondary}
          testID="input-country"
        />
      </View>
    </View>
  );

  const renderBioStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.inputGroup}>
        <ThemedText type="label">Bio</ThemedText>
        <TextInput
          style={[styles.textArea, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell travelers about yourself..."
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          testID="input-bio"
        />
      </View>
    </View>
  );

  const renderPhotosStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
        Add at least 1 photo so travelers can see who you are. Professional photos and clear selfies work best.
      </ThemedText>

      <View style={styles.photoGrid}>
        {uploadedPhotos.map((uri, index) => (
          <View key={index} style={[styles.photoSlot, { borderColor: theme.border }]}>
            <Image source={{ uri }} style={styles.photoImage} contentFit="cover" />
            <Pressable
              onPress={() => removePhoto(index)}
              style={styles.photoRemoveButton}
              testID={`button-remove-photo-${index}`}
            >
              <View style={styles.photoRemoveCircle}>
                <Feather name="x" size={14} color="#FFFFFF" />
              </View>
            </Pressable>
            {index === 0 ? (
              <View style={styles.mainPhotoBadge}>
                <ThemedText type="caption" style={{ color: "#FFFFFF", fontSize: 10 }}>Main</ThemedText>
              </View>
            ) : null}
          </View>
        ))}

        {uploadedPhotos.length < 6 ? (
          <Pressable
            onPress={pickAndUploadPhoto}
            disabled={uploading}
            style={[styles.photoSlot, styles.photoAddSlot, { borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}
            testID="button-add-photo"
          >
            {uploading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                <Feather name="plus" size={28} color={theme.textSecondary} />
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
                  Add Photo
                </ThemedText>
              </>
            )}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.photoActions}>
        <Pressable
          onPress={pickAndUploadPhoto}
          disabled={uploading || uploadedPhotos.length >= 6}
          style={[styles.photoActionButton, { backgroundColor: theme.primary + "12", borderColor: theme.primary + "30" }]}
          testID="button-gallery"
        >
          <Feather name="image" size={20} color={theme.primary} />
          <ThemedText type="label" style={{ color: theme.primary }}>Gallery</ThemedText>
        </Pressable>

        {Platform.OS !== "web" ? (
          <Pressable
            onPress={takePhoto}
            disabled={uploading || uploadedPhotos.length >= 6}
            style={[styles.photoActionButton, { backgroundColor: "#DAA520" + "12", borderColor: "#DAA520" + "30" }]}
            testID="button-selfie"
          >
            <Feather name="camera" size={20} color="#DAA520" />
            <ThemedText type="label" style={{ color: "#DAA520" }}>Selfie</ThemedText>
          </Pressable>
        ) : null}
      </View>

      <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
        Up to 6 photos. First photo will be your main profile picture.
      </ThemedText>
    </View>
  );

  const renderLanguagesStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.chipGrid}>
        {LANGUAGE_OPTIONS.map((lang) => (
          <Pressable
            key={lang}
            onPress={() => toggleLanguage(lang)}
            style={[
              styles.selectionChip,
              { backgroundColor: selectedLanguages.includes(lang) ? theme.primary : theme.backgroundSecondary },
            ]}
            testID={`chip-lang-${lang.toLowerCase()}`}
          >
            <Feather name="globe" size={14} color={selectedLanguages.includes(lang) ? "#FFFFFF" : theme.textSecondary} />
            <ThemedText type="small" style={{ color: selectedLanguages.includes(lang) ? "#FFFFFF" : theme.text }}>
              {lang}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderInterestsStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.chipGrid}>
        {INTEREST_OPTIONS.map((interest) => (
          <Pressable
            key={interest}
            onPress={() => toggleInterest(interest)}
            style={[
              styles.selectionChip,
              { backgroundColor: selectedInterests.includes(interest) ? theme.primary : theme.backgroundSecondary },
            ]}
            testID={`chip-interest-${interest.toLowerCase()}`}
          >
            <ThemedText type="small" style={{ color: selectedInterests.includes(interest) ? "#FFFFFF" : theme.text }}>
              {interest}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderAvailabilityStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.inputGroup}>
        <ThemedText type="label">Availability</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
          value={availability}
          onChangeText={setAvailability}
          placeholder="e.g. Weekdays 9am-5pm"
          placeholderTextColor={theme.textSecondary}
          testID="input-availability"
        />
      </View>
      <View style={styles.inputGroup}>
        <ThemedText type="label">Session Price (USD)</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
          value={bookingPrice}
          onChangeText={setBookingPrice}
          placeholder="e.g. 50"
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          testID="input-price"
        />
      </View>
    </View>
  );

  const renderEscortRatesStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.inputGroup}>
        <ThemedText type="label">Hourly Rate (USD)</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
          value={hourlyRate}
          onChangeText={setHourlyRate}
          placeholder="e.g. 75"
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          testID="input-hourly-rate"
        />
      </View>
      <View style={styles.inputGroup}>
        <ThemedText type="label">Minimum Hours per Booking</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
          value={minimumHours}
          onChangeText={setMinimumHours}
          placeholder="e.g. 2"
          placeholderTextColor={theme.textSecondary}
          keyboardType="numeric"
          testID="input-minimum-hours"
        />
      </View>
      <View style={styles.inputGroup}>
        <ThemedText type="label">Availability</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
          value={availability}
          onChangeText={setAvailability}
          placeholder="e.g. Evenings & Weekends"
          placeholderTextColor={theme.textSecondary}
          testID="input-availability"
        />
      </View>
      <View style={[styles.feeNotice, { backgroundColor: "rgba(218,165,32,0.1)", borderColor: "rgba(218,165,32,0.3)" }]}>
        <Feather name="info" size={16} color="#DAA520" />
        <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}>
          A 20% platform fee applies to escort bookings. {hourlyRate ? `Your rate: ${getCurrencySymbol("usd")}${hourlyRate}/hr. You receive: ${getCurrencySymbol("usd")}${(parseFloat(hourlyRate) * 0.8).toFixed(2)}/hr after fees.` : ""}
        </ThemedText>
      </View>
    </View>
  );

  const renderStep = () => {
    if (isEscortType) {
      switch (step) {
        case 0: return renderBasicInfoStep();
        case 1: return renderServiceTypeStep();
        case 2: return renderEscortServicesStep();
        case 3: return renderLocationStep();
        case 4: return renderBioStep();
        case 5: return renderPhotosStep();
        case 6: return renderLanguagesStep();
        case 7: return renderInterestsStep();
        case 8: return renderEscortRatesStep();
        case 9: return renderTermsStep();
      }
    } else {
      switch (step) {
        case 0: return renderBasicInfoStep();
        case 1: return renderServiceTypeStep();
        case 2: return renderLocationStep();
        case 3: return renderBioStep();
        case 4: return renderPhotosStep();
        case 5: return renderLanguagesStep();
        case 6: return renderInterestsStep();
        case 7: return renderAvailabilityStep();
        case 8: return renderTermsStep();
      }
    }
    return null;
  };

  const renderTermsStep = () => (
    <View style={styles.stepContent}>
      <View style={[styles.termsCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
        <View style={styles.termsHeader}>
          <Feather name="shield" size={24} color="#DAA520" />
          <ThemedText type="label">Platform Agreement</ThemedText>
        </View>
        <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 20 }}>
          By creating a {isEscortType ? "escort" : "companion"} profile on Tripsbnb, you acknowledge and agree to the following:
        </ThemedText>
        <View style={styles.termsList}>
          <View style={styles.termItem}>
            <Feather name="check" size={14} color={theme.primary} />
            <ThemedText type="small" style={{ flex: 1, color: theme.textSecondary, lineHeight: 20 }}>
              Tripsbnb is an intermediary platform only and does not control or supervise interactions between users.
            </ThemedText>
          </View>
          <View style={styles.termItem}>
            <Feather name="check" size={14} color={theme.primary} />
            <ThemedText type="small" style={{ flex: 1, color: theme.textSecondary, lineHeight: 20 }}>
              You are solely responsible for your interactions with travelers and assume all associated risks.
            </ThemedText>
          </View>
          <View style={styles.termItem}>
            <Feather name="check" size={14} color={theme.primary} />
            <ThemedText type="small" style={{ flex: 1, color: theme.textSecondary, lineHeight: 20 }}>
              Tripsbnb is not liable for any damages, injuries, or losses arising from user interactions.
            </ThemedText>
          </View>
          <View style={styles.termItem}>
            <Feather name="check" size={14} color={theme.primary} />
            <ThemedText type="small" style={{ flex: 1, color: theme.textSecondary, lineHeight: 20 }}>
              You agree to abide by community guidelines, treat all travelers with respect, and follow local laws.
            </ThemedText>
          </View>
          {isEscortType ? (
            <View style={styles.termItem}>
              <Feather name="check" size={14} color="#DAA520" />
              <ThemedText type="small" style={{ flex: 1, color: theme.textSecondary, lineHeight: 20 }}>
                A 20% platform fee applies to all escort bookings processed through Tripsbnb.
              </ThemedText>
            </View>
          ) : null}
          <View style={styles.termItem}>
            <Feather name="check" size={14} color={theme.primary} />
            <ThemedText type="small" style={{ flex: 1, color: theme.textSecondary, lineHeight: 20 }}>
              You agree to our Terms of Service, Privacy Policy, and Platform Liability Disclaimer.
            </ThemedText>
          </View>
        </View>
      </View>

      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          setTermsAccepted(!termsAccepted);
        }}
        style={[
          styles.termsCheckbox,
          {
            backgroundColor: termsAccepted ? theme.primary + "10" : theme.backgroundDefault,
            borderColor: termsAccepted ? theme.primary : theme.border,
          },
        ]}
        testID="checkbox-terms"
      >
        <View
          style={[
            styles.checkboxIcon,
            {
              backgroundColor: termsAccepted ? theme.primary : "transparent",
              borderColor: termsAccepted ? theme.primary : theme.textSecondary,
            },
          ]}
        >
          {termsAccepted ? (
            <Feather name="check" size={14} color="#FFFFFF" />
          ) : null}
        </View>
        <ThemedText type="body" style={{ flex: 1 }}>
          I have read and agree to all terms, conditions, and the liability disclaimer
        </ThemedText>
      </Pressable>
    </View>
  );

  const renderCurrentStep = () => {
    const lastStep = STEPS.length - 1;
    if (step === lastStep) return renderTermsStep();
    return renderStep();
  };

  const progress = (step + 1) / STEPS.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.progressBar, { top: 0 }]}>
        <View style={[styles.progressTrack, { backgroundColor: theme.backgroundTertiary }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%`, backgroundColor: theme.primary },
            ]}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: Spacing["3xl"], paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <ThemedText type="h1">{STEPS[step].title}</ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
            {STEPS[step].subtitle}
          </ThemedText>
        </View>

        {renderCurrentStep()}
      </ScrollView>

      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + Spacing.sm, backgroundColor: theme.backgroundRoot }]}>
        <Pressable
          onPress={handleBack}
          style={[styles.backButton, { borderColor: theme.border }]}
          testID="button-back"
        >
          <Feather name="arrow-left" size={20} color={theme.text} />
        </Pressable>
        <Pressable
          onPress={handleNext}
          disabled={!canGoNext() || createMutation.isPending}
          style={[
            styles.nextButton,
            {
              backgroundColor: canGoNext() ? theme.primary : theme.backgroundTertiary,
            },
          ]}
          testID="button-next"
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <ThemedText type="label" style={{ color: canGoNext() ? "#FFFFFF" : theme.textSecondary }}>
                {step === STEPS.length - 1 ? "Create Profile" : "Continue"}
              </ThemedText>
              {step < STEPS.length - 1 ? (
                <Feather name="arrow-right" size={18} color={canGoNext() ? "#FFFFFF" : theme.textSecondary} />
              ) : null}
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressBar: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  scrollView: { flex: 1 },
  stepHeader: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing["2xl"],
  },
  stepContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  input: {
    height: Spacing.inputHeight,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  optionChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    gap: Spacing.md,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  serviceInfo: { flex: 1 },
  feeNotice: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  selectionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
  },
  bottomActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  backButton: {
    width: Spacing.buttonHeight,
    height: Spacing.buttonHeight,
    borderRadius: Spacing.buttonHeight / 2,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  nextButton: {
    flex: 1,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  termsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  termsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  termsList: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  termItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    paddingTop: 2,
  },
  termsCheckbox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
  },
  checkboxIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  photoSlot: {
    width: "30.5%" as any,
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
  },
  photoAddSlot: {
    borderStyle: "dashed" as any,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoRemoveButton: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 10,
  },
  photoRemoveCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  mainPhotoBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(218,165,32,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  photoActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  photoActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
});
