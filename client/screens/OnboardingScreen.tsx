import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  Pressable,
  FlatList,
  ViewToken,
  TextInput,
  ScrollView,
  Text,
  Platform,
  Image,
  ImageBackground,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
  FadeIn,
  SlideInRight,
  SlideInLeft,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

const { width, height } = Dimensions.get("window");

const ONBOARDING_KEY = "@tripverse_onboarding_complete";
const DEVICE_ID_KEY = "@tripverse_device_id";

const SLIDES = [
  {
    id: "1",
    title: "Explore the World",
    subtitle: "Discover breathtaking destinations and create memories that last a lifetime",
    image: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&q=80",
  },
  {
    id: "2",
    title: "Everything in One Place",
    subtitle: "Stays, safaris, dining, companions, car hire & more — seamlessly connected",
    image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80",
    features: [
      { icon: "home" as const, label: "Luxury Stays" },
      { icon: "sunrise" as const, label: "Safari Adventures" },
      { icon: "coffee" as const, label: "Fine Dining" },
      { icon: "users" as const, label: "Companions" },
      { icon: "navigation" as const, label: "Car Hire" },
      { icon: "message-circle" as const, label: "In-App Chat" },
    ],
  },
  {
    id: "3",
    title: "Travel with Confidence",
    subtitle: "Verified vendors, secure payments powered by Stripe, and 24/7 support",
    image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80",
  },
];

export type UserRole = "traveller" | "host" | "restaurant" | "safari" | "companion";

const USER_ROLES: { id: UserRole; icon: keyof typeof Feather.glyphMap; title: string; desc: string }[] = [
  { id: "traveller", icon: "globe", title: "Traveller", desc: "Find stays, safaris, dining & more" },
  { id: "host", icon: "home", title: "Accommodation Host", desc: "List your property for guests" },
  { id: "restaurant", icon: "coffee", title: "Restaurant Owner", desc: "Showcase your dining experience" },
  { id: "safari", icon: "sunrise", title: "Safari Operator", desc: "Offer unforgettable safari adventures" },
  { id: "companion", icon: "users", title: "Companion / Guide", desc: "Connect with travellers as a guide or companion" },
];

const AVATAR_OPTIONS = ["🧳", "👨‍✈️", "🌺", "🏔️", "🌊", "🦋", "🌙", "🔥"];

const TRAVEL_STYLES = [
  { id: "relaxation", icon: "sun" as const, title: "Relaxation", desc: "Beach resorts, spa retreats, slow travel" },
  { id: "adventure", icon: "compass" as const, title: "Adventure", desc: "Hiking, safaris, extreme sports" },
  { id: "cultural", icon: "book-open" as const, title: "Cultural", desc: "Museums, history, local traditions" },
  { id: "luxury", icon: "star" as const, title: "Luxury", desc: "Five-star hotels, fine dining, VIP experiences" },
];

const INTERESTS = [
  { id: "wildlife", icon: "sunrise" as const, label: "Wildlife & Safaris" },
  { id: "food", icon: "coffee" as const, label: "Food & Wine" },
  { id: "beach", icon: "anchor" as const, label: "Beach & Islands" },
  { id: "mountains", icon: "triangle" as const, label: "Mountains & Hiking" },
  { id: "nightlife", icon: "moon" as const, label: "Nightlife" },
  { id: "photography", icon: "camera" as const, label: "Photography" },
  { id: "arts", icon: "pen-tool" as const, label: "Arts & Culture" },
  { id: "wellness", icon: "heart" as const, label: "Wellness & Spa" },
  { id: "family", icon: "users" as const, label: "Family" },
  { id: "romantic", icon: "heart" as const, label: "Romantic" },
  { id: "fishing", icon: "activity" as const, label: "Fishing & Nature" },
  { id: "watersports", icon: "wind" as const, label: "Water Sports" },
];

const TRAVEL_FREQUENCIES = [
  { id: "starting", icon: "map" as const, title: "Just Starting", desc: "Planning my first big trip" },
  { id: "few_times", icon: "map-pin" as const, title: "A Few Times a Year", desc: "I love a good getaway" },
  { id: "monthly", icon: "globe" as const, title: "Monthly Explorer", desc: "Always on the move" },
  { id: "nomad", icon: "navigation" as const, title: "Nomad Life", desc: "Travel is my lifestyle" },
];

interface OnboardingScreenProps {
  onComplete: (selectedRole?: UserRole) => void;
}

type Phase = "slides" | "role_select" | "traveller_profile";

async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const newId = `device_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  } catch {
    return `device_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
  }
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const flatListRef = useRef<FlatList>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const currentSlideRef = useRef(0);

  const [phase, setPhase] = useState<Phase>("slides");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [profileStep, setProfileStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const [displayName, setDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [travelStyle, setTravelStyle] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [travelFrequency, setTravelFrequency] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const progressWidth = useSharedValue(0);

  useEffect(() => {
    if (phase === "traveller_profile") {
      progressWidth.value = withSpring(((profileStep + 1) / 4) * 100, { damping: 15, stiffness: 100 });
    }
  }, [profileStep, phase]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%` as any,
  }));

  const handleSlideNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const idx = currentSlideRef.current;
    if (idx >= SLIDES.length - 1) {
      setPhase("role_select");
    } else {
      const nextIndex = idx + 1;
      currentSlideRef.current = nextIndex;
      setCurrentSlide(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedRole(role);
  };

  const handleRoleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!selectedRole) return;

    if (selectedRole === "traveller") {
      setPhase("traveller_profile");
    } else {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
      onComplete(selectedRole);
    }
  };

  const handleProfileNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (profileStep < 3) {
      setDirection("forward");
      setProfileStep((s) => s + 1);
    } else {
      await submitProfile();
    }
  };

  const handleProfileBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (profileStep > 0) {
      setDirection("back");
      setProfileStep((s) => s - 1);
    } else {
      setPhase("role_select");
    }
  };

  const submitProfile = async () => {
    setIsSubmitting(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      const baseUrl = getApiUrl();
      const url = new URL("/api/traveller-profile", baseUrl);
      await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          displayName,
          travelStyle,
          interests: selectedInterests.join(","),
          travelFrequency,
          avatar: selectedAvatar,
        }),
      });
    } catch (e) {
    }
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    await AsyncStorage.setItem("@tripverse_user_name", displayName.trim());
    setIsSubmitting(false);
    onComplete("traveller");
  };

  const canProceed = (): boolean => {
    if (profileStep === 0) return displayName.trim().length > 0;
    if (profileStep === 1) return travelStyle.length > 0;
    if (profileStep === 2) return selectedInterests.length >= 2;
    if (profileStep === 3) return travelFrequency.length > 0;
    return false;
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        currentSlideRef.current = viewableItems[0].index;
        setCurrentSlide(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const toggleInterest = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const renderSlide = ({ item, index }: { item: typeof SLIDES[0]; index: number }) => (
    <View style={styles.slide}>
      <ImageBackground
        source={{ uri: item.image }}
        style={styles.slideBackground}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.3)", "rgba(15,45,26,0.85)", "rgba(15,45,26,0.98)"]}
          locations={[0, 0.3, 0.65, 1]}
          style={styles.slideOverlay}
        >
          <View style={[styles.slideContent, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 140 }]}>
            <View style={styles.slideTop} />

            <View style={styles.slideBottom}>
              {item.features ? (
                <View style={styles.featureGrid}>
                  {item.features.map((feature, i) => (
                    <View key={i} style={styles.featureItem}>
                      <View style={styles.featureIconBg}>
                        <Feather name={feature.icon} size={20} color="#DAA520" />
                      </View>
                      <Text style={styles.featureLabel}>{feature.label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.slideTextContainer}>
                <Text style={styles.slideTitle}>{item.title}</Text>
                <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );

  const renderProfileStep = () => {
    const entering = direction === "forward" ? SlideInRight.duration(350) : SlideInLeft.duration(350);

    return (
      <Animated.View key={`step-${profileStep}`} entering={entering} style={styles.profileStepContainer}>
        {profileStep === 0 ? renderNameStep() : null}
        {profileStep === 1 ? renderStyleStep() : null}
        {profileStep === 2 ? renderInterestsStep() : null}
        {profileStep === 3 ? renderFrequencyStep() : null}
      </Animated.View>
    );
  };

  const renderNameStep = () => (
    <ScrollView
      style={styles.stepScrollView}
      contentContainerStyle={[styles.stepContent, { paddingBottom: insets.bottom + 120 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.stepIconCircle}>
        <Feather name="user" size={32} color="#DAA520" />
      </View>
      <Text style={styles.stepTitle}>What's your name?</Text>
      <Text style={styles.stepDescription}>We'll use this to personalize your experience</Text>

      <View style={styles.inputContainer}>
        <Feather name="edit-3" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="Enter your name"
          placeholderTextColor="rgba(255,255,255,0.35)"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          testID="input-display-name"
        />
      </View>

      <Text style={styles.sectionLabel}>Pick an avatar</Text>
      <View style={styles.avatarRow}>
        {AVATAR_OPTIONS.map((avatar) => {
          const isSelected = selectedAvatar === avatar;
          return (
            <Pressable
              key={avatar}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedAvatar(avatar);
              }}
              style={[
                styles.avatarOption,
                isSelected ? styles.avatarOptionSelected : null,
              ]}
              testID={`avatar-${avatar}`}
            >
              <Text style={styles.avatarEmoji}>{avatar}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderStyleStep = () => (
    <ScrollView
      style={styles.stepScrollView}
      contentContainerStyle={[styles.stepContent, { paddingBottom: insets.bottom + 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepIconCircle}>
        <Feather name="compass" size={32} color="#DAA520" />
      </View>
      <Text style={styles.stepTitle}>Your travel style</Text>
      <Text style={styles.stepDescription}>Pick the one that fits you best</Text>

      {TRAVEL_STYLES.map((style) => {
        const isSelected = travelStyle === style.id;
        return (
          <OptionCard
            key={style.id}
            icon={style.icon}
            title={style.title}
            desc={style.desc}
            isSelected={isSelected}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setTravelStyle(style.id);
            }}
          />
        );
      })}
    </ScrollView>
  );

  const renderInterestsStep = () => (
    <ScrollView
      style={styles.stepScrollView}
      contentContainerStyle={[styles.stepContent, { paddingBottom: insets.bottom + 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepIconCircle}>
        <Feather name="heart" size={32} color="#DAA520" />
      </View>
      <Text style={styles.stepTitle}>What excites you?</Text>
      <Text style={styles.stepDescription}>Select at least 2 interests</Text>

      <View style={styles.chipsContainer}>
        {INTERESTS.map((interest) => {
          const isSelected = selectedInterests.includes(interest.id);
          return (
            <Pressable
              key={interest.id}
              onPress={() => toggleInterest(interest.id)}
              style={[
                styles.chip,
                isSelected ? styles.chipSelected : null,
              ]}
              testID={`interest-${interest.id}`}
            >
              <Feather
                name={interest.icon}
                size={16}
                color={isSelected ? "#DAA520" : "rgba(255,255,255,0.6)"}
              />
              <Text style={[styles.chipLabel, isSelected ? styles.chipLabelSelected : null]}>
                {interest.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.selectionCountContainer}>
        <Feather
          name={selectedInterests.length >= 2 ? "check-circle" : "info"}
          size={14}
          color={selectedInterests.length >= 2 ? "#DAA520" : "rgba(255,255,255,0.4)"}
        />
        <Text style={[styles.selectionCount, selectedInterests.length >= 2 ? styles.selectionCountDone : null]}>
          {selectedInterests.length < 2
            ? `${selectedInterests.length}/2 minimum selected`
            : `${selectedInterests.length} interests selected`}
        </Text>
      </View>
    </ScrollView>
  );

  const renderFrequencyStep = () => (
    <ScrollView
      style={styles.stepScrollView}
      contentContainerStyle={[styles.stepContent, { paddingBottom: insets.bottom + 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepIconCircle}>
        <Feather name="calendar" size={32} color="#DAA520" />
      </View>
      <Text style={styles.stepTitle}>How often do you travel?</Text>
      <Text style={styles.stepDescription}>This helps us personalize your experience</Text>

      {TRAVEL_FREQUENCIES.map((freq) => {
        const isSelected = travelFrequency === freq.id;
        return (
          <OptionCard
            key={freq.id}
            icon={freq.icon}
            title={freq.title}
            desc={freq.desc}
            isSelected={isSelected}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setTravelFrequency(freq.id);
            }}
          />
        );
      })}
    </ScrollView>
  );

  if (phase === "slides") {
    return (
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          bounces={false}
        />

        <View style={[styles.slideFooter, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <View style={styles.pagination}>
            {SLIDES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentSlide ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          <Pressable
            onPress={handleSlideNext}
            style={({ pressed }) => [
              styles.nextButton,
              pressed ? { opacity: 0.9, transform: [{ scale: 0.97 }] } : null,
            ]}
            testID="button-next-slide"
          >
            <LinearGradient
              colors={["#DAA520", "#B8860B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>
                {currentSlide === SLIDES.length - 1 ? "Get Started" : "Next"}
              </Text>
              <Feather name={currentSlide === SLIDES.length - 1 ? "arrow-right" : "chevron-right"} size={20} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => { setPhase("role_select"); }} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (phase === "role_select") {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#0F2D1A", "#1A4D2E"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <ScrollView
          style={styles.stepScrollView}
          contentContainerStyle={[
            styles.roleSelectContent,
            { paddingTop: insets.top + Spacing["2xl"], paddingBottom: insets.bottom + 120 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(400)}>
            <View style={styles.stepIconCircle}>
              <Feather name="zap" size={32} color="#DAA520" />
            </View>
            <Text style={styles.stepTitle}>How will you use Tripsbnb?</Text>
            <Text style={styles.stepDescription}>Choose how you'd like to get started. You can always explore other options later.</Text>

            <View style={styles.roleCardsContainer}>
              {USER_ROLES.map((role) => {
                const isSelected = selectedRole === role.id;
                return (
                  <Pressable
                    key={role.id}
                    onPress={() => handleRoleSelect(role.id)}
                    testID={`role-${role.id}`}
                  >
                    <Animated.View
                      style={[
                        styles.roleCard,
                        isSelected ? styles.roleCardSelected : null,
                      ]}
                    >
                      <View style={[styles.roleIconContainer, isSelected ? styles.roleIconContainerSelected : null]}>
                        <Feather name={role.icon} size={24} color={isSelected ? "#DAA520" : "rgba(255,255,255,0.6)"} />
                      </View>
                      <View style={styles.roleTextContainer}>
                        <Text style={[styles.roleTitle, isSelected ? styles.roleTitleSelected : null]}>
                          {role.title}
                        </Text>
                        <Text style={styles.roleDesc}>{role.desc}</Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.checkmark}>
                          <Feather name="check" size={16} color="#FFFFFF" />
                        </View>
                      ) : (
                        <View style={styles.roleArrow}>
                          <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.25)" />
                        </View>
                      )}
                    </Animated.View>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>

        <View style={[styles.profileFooter, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <Pressable
            onPress={handleRoleContinue}
            disabled={!selectedRole}
            style={({ pressed }) => [
              styles.continueButton,
              !selectedRole ? styles.continueButtonDisabled : null,
              pressed && selectedRole ? { opacity: 0.9, transform: [{ scale: 0.97 }] } : null,
            ]}
            testID="button-role-continue"
          >
            <LinearGradient
              colors={selectedRole ? ["#DAA520", "#B8860B"] : ["#555555", "#444444"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.continueButtonGradient}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0F2D1A", "#1A4D2E"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={[styles.profileHeader, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={handleProfileBack} style={styles.backButton} testID="button-back">
          <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
        </Pressable>
        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBarFill, progressBarStyle]} />
        </View>
        <Text style={styles.stepIndicator}>{`${profileStep + 1}/4`}</Text>
      </View>

      {renderProfileStep()}

      <View style={[styles.profileFooter, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Pressable
          onPress={handleProfileNext}
          disabled={!canProceed() || isSubmitting}
          style={({ pressed }) => [
            styles.continueButton,
            (!canProceed() || isSubmitting) ? styles.continueButtonDisabled : null,
            pressed && canProceed() ? { opacity: 0.9, transform: [{ scale: 0.97 }] } : null,
          ]}
          testID="button-continue"
        >
          <LinearGradient
            colors={canProceed() ? ["#DAA520", "#B8860B"] : ["#555555", "#444444"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.continueButtonGradient}
          >
            <Text style={styles.continueButtonText}>
              {isSubmitting ? "Setting up..." : profileStep === 3 ? "Complete Setup" : "Continue"}
            </Text>
            {!isSubmitting ? (
              <Feather name={profileStep === 3 ? "check" : "arrow-right"} size={18} color="#FFFFFF" />
            ) : null}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function OptionCard({
  icon,
  title,
  desc,
  isSelected,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  desc: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.02 : 1, { damping: 12, stiffness: 150 });
  }, [isSelected]);

  return (
    <Pressable onPress={onPress} testID={`card-${title.toLowerCase().replace(/\s/g, "-")}`}>
      <Animated.View
        style={[
          styles.styleCard,
          isSelected ? styles.styleCardSelected : null,
          animatedStyle,
        ]}
      >
        <View style={[styles.styleCardIcon, isSelected ? styles.styleCardIconSelected : null]}>
          <Feather name={icon} size={22} color={isSelected ? "#DAA520" : "rgba(255,255,255,0.6)"} />
        </View>
        <View style={styles.styleCardText}>
          <Text style={[styles.styleCardTitle, isSelected ? styles.styleCardTitleSelected : null]}>
            {title}
          </Text>
          <Text style={styles.styleCardDesc}>{desc}</Text>
        </View>
        {isSelected ? (
          <View style={styles.checkmark}>
            <Feather name="check" size={16} color="#FFFFFF" />
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

export async function checkOnboardingComplete(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_KEY);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F2D1A",
  },
  slide: {
    width,
    height,
  },
  slideBackground: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  slideOverlay: {
    flex: 1,
  },
  slideContent: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: Spacing["2xl"],
  },
  slideTop: {
    flex: 1,
  },
  slideBottom: {
    paddingBottom: Spacing.lg,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  featureItem: {
    alignItems: "center",
    width: (width - 80) / 3,
  },
  featureIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(218,165,32,0.2)",
  },
  featureLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  slideTextContainer: {
    alignItems: "flex-start",
  },
  slideTitle: {
    color: "#FFFFFF",
    fontSize: 36,
    lineHeight: 44,
    fontWeight: "700",
    fontFamily: "CormorantGaramond_700Bold",
    marginBottom: Spacing.md,
  },
  slideSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
  },
  slideFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing.lg,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    backgroundColor: "#DAA520",
    width: 28,
  },
  dotInactive: {
    backgroundColor: "rgba(255,255,255,0.35)",
    width: 8,
  },
  nextButton: {
    width: "100%",
    marginBottom: Spacing.md,
  },
  nextButtonGradient: {
    paddingVertical: 16,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
  },
  skipButton: {
    paddingVertical: Spacing.sm,
  },
  skipText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "500",
  },
  roleSelectContent: {
    paddingHorizontal: Spacing["2xl"],
  },
  roleCardsContainer: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
  },
  roleCardSelected: {
    borderColor: "rgba(218,165,32,0.5)",
    backgroundColor: "rgba(218,165,32,0.08)",
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.lg,
  },
  roleIconContainerSelected: {
    backgroundColor: "rgba(218,165,32,0.15)",
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 3,
  },
  roleTitleSelected: {
    color: "#DAA520",
  },
  roleDesc: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    lineHeight: 18,
  },
  roleArrow: {
    marginLeft: Spacing.sm,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#DAA520",
    borderRadius: 2,
  },
  stepIndicator: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontWeight: "600",
    minWidth: 30,
    textAlign: "right",
  },
  profileStepContainer: {
    flex: 1,
  },
  stepScrollView: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing["3xl"],
  },
  stepIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(218,165,32,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(218,165,32,0.25)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: Spacing.xl,
  },
  stepTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  stepDescription: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  inputContainer: {
    marginBottom: Spacing["2xl"],
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: Spacing.lg,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  textInput: {
    flex: 1,
    paddingVertical: Spacing.lg,
    fontSize: 17,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  sectionLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  avatarRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.md,
  },
  avatarOption: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  avatarOptionSelected: {
    borderColor: "#DAA520",
    backgroundColor: "rgba(218,165,32,0.12)",
  },
  avatarEmoji: {
    fontSize: 28,
  },
  styleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
  },
  styleCardSelected: {
    borderColor: "rgba(218,165,32,0.5)",
    backgroundColor: "rgba(218,165,32,0.08)",
  },
  styleCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.lg,
  },
  styleCardIconSelected: {
    backgroundColor: "rgba(218,165,32,0.15)",
  },
  styleCardText: {
    flex: 1,
  },
  styleCardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 3,
  },
  styleCardTitleSelected: {
    color: "#DAA520",
  },
  styleCardDesc: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    lineHeight: 18,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DAA520",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: Spacing.sm,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
    gap: Spacing.sm,
  },
  chipSelected: {
    borderColor: "rgba(218,165,32,0.5)",
    backgroundColor: "rgba(218,165,32,0.1)",
  },
  chipLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  chipLabelSelected: {
    color: "#DAA520",
  },
  selectionCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: Spacing.xl,
  },
  selectionCount: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    fontWeight: "500",
  },
  selectionCountDone: {
    color: "#DAA520",
  },
  profileFooter: {
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing.md,
  },
  continueButton: {
    width: "100%",
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: Spacing["2xl"],
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
  },
});
