import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRoute, useNavigation } from "@react-navigation/native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { SafetyAcknowledgmentModal } from "@/components/SafetyAcknowledgmentModal";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius, Shadows, Typography } from "@/constants/theme";
import { formatPrice } from "@/lib/currency";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PHOTO_HEIGHT = SCREEN_WIDTH * 1.1;
const USER_ID = "traveler-" + Platform.OS;

interface CompanionDetail {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  bio: string | null;
  city: string;
  country: string;
  serviceType: string;
  photos: string | null;
  interests: string | null;
  availability: string | null;
  responseTime: string | null;
  verified: boolean;
  averageRating: string;
  totalRatings: number;
  languages: string | null;
  description: string | null;
  bookingPrice: number | null;
  lat: string | null;
  lng: string | null;
  isEscort: boolean | null;
  hourlyRate: number | null;
  minimumHours: number | null;
  serviceCategories: string | null;
  serviceDescription: string | null;
  platformFeePercent: number | null;
}

export function CompanionProfileScreen() {
  const insets = useSafeAreaInsets();

  const { theme } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { companionId } = route.params;
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showSafetyModal, setShowSafetyModal] = useState(false);

  const { data: profile, isLoading } = useQuery<CompanionDetail>({
    queryKey: ["/api/companions", companionId],
  });

  const likeMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiRequest("POST", `/api/companions/${companionId}/like`, {
        likedBy: USER_ID,
        status,
      });
    },
    onSuccess: () => {
      navigation.goBack();
    },
  });

  if (isLoading || !profile) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const photos: string[] = (() => {
    try {
      return profile.photos ? JSON.parse(profile.photos) : [];
    } catch {
      return [];
    }
  })();

  const interests: string[] = (() => {
    try {
      return profile.interests ? JSON.parse(profile.interests) : [];
    } catch {
      return [];
    }
  })();

  const languages: string[] = (() => {
    try {
      return profile.languages ? JSON.parse(profile.languages) : [];
    } catch {
      return [];
    }
  })();

  const rating = parseFloat(profile.averageRating) || 0;
  const price = profile.bookingPrice ? formatPrice(profile.bookingPrice) : null;
  const isEscort = profile.isEscort || profile.serviceType === "escort";
  const hourlyRateDisplay = profile.hourlyRate ? formatPrice(profile.hourlyRate) : null;

  const escortCategories: string[] = (() => {
    try {
      return profile.serviceCategories ? JSON.parse(profile.serviceCategories) : [];
    } catch {
      return [];
    }
  })();

  const categoryLabels: Record<string, string> = {
    dinner_date: "Dinner Date",
    city_tour: "City Tour",
    event_companion: "Event Companion",
    social_companion: "Social Companion",
    travel_partner: "Travel Partner",
  };

  const handleConnect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowSafetyModal(true);
  };

  const handleConfirmConnect = () => {
    setShowSafetyModal(false);
    likeMutation.mutate("liked");
  };

  const handlePass = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    likeMutation.mutate("passed");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: 120 }}
      >
        <View style={styles.photoSection}>
          {photos.length > 0 ? (
            <>
              <Image
                source={{ uri: photos[activePhotoIndex] }}
                style={styles.photo}
                contentFit="cover"
              />
              {photos.length > 1 ? (
                <>
                  <View style={styles.photoProgressBar}>
                    {photos.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.photoSegment,
                          {
                            backgroundColor:
                              i === activePhotoIndex
                                ? "#FFFFFF"
                                : "rgba(255,255,255,0.35)",
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Pressable
                    style={styles.photoTapLeft}
                    onPress={() => {
                      if (activePhotoIndex > 0) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setActivePhotoIndex(activePhotoIndex - 1);
                      }
                    }}
                  />
                  <Pressable
                    style={styles.photoTapRight}
                    onPress={() => {
                      if (activePhotoIndex < photos.length - 1) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setActivePhotoIndex(activePhotoIndex + 1);
                      }
                    }}
                  />
                </>
              ) : null}
              <View style={styles.photoCounter}>
                <ThemedText type="caption" style={{ color: "#FFFFFF" }}>
                  {activePhotoIndex + 1}/{photos.length}
                </ThemedText>
              </View>
            </>
          ) : (
            <LinearGradient
              colors={["#6B3FA0", "#8E5CC5"]}
              style={[styles.photo, { justifyContent: "center", alignItems: "center" }]}
            >
              <Feather name="user" size={80} color="rgba(255,255,255,0.3)" />
            </LinearGradient>
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.15)", "transparent", "transparent", "rgba(0,0,0,0.6)"]}
            locations={[0, 0.15, 0.5, 1]}
            style={styles.photoOverlay}
          />
          <View style={styles.photoInfo}>
            <View style={styles.nameRow}>
              <ThemedText type="hero" style={styles.nameText}>
                {profile.name}
                {profile.age ? `, ${profile.age}` : ""}
              </ThemedText>
              {profile.verified ? (
                <View style={styles.verifiedBadge}>
                  <Feather name="check" size={14} color="#FFFFFF" />
                </View>
              ) : null}
            </View>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={14} color="rgba(255,255,255,0.9)" />
              <ThemedText type="body" style={styles.locationText}>
                {profile.city}, {profile.country}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
              <Feather name="star" size={18} color="#DAA520" />
              <ThemedText type="h4">{rating > 0 ? rating.toFixed(1) : "New"}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {profile.totalRatings} reviews
              </ThemedText>
            </View>
            {isEscort && hourlyRateDisplay ? (
              <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
                <Feather name="tag" size={18} color="#DAA520" />
                <ThemedText type="h4">{hourlyRateDisplay}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  per hour
                </ThemedText>
              </View>
            ) : price ? (
              <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
                <Feather name="tag" size={18} color={theme.primary} />
                <ThemedText type="h4">{price}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  per session
                </ThemedText>
              </View>
            ) : null}
            {profile.responseTime ? (
              <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
                <Feather name="clock" size={18} color={theme.primary} />
                <ThemedText type="h4">{profile.responseTime}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  response
                </ThemedText>
              </View>
            ) : null}
          </View>

          {profile.serviceType ? (
            <View style={styles.section}>
              <View style={[styles.serviceTypeBadge, { backgroundColor: theme.primary + "15" }]}>
                <Feather name="briefcase" size={16} color={theme.primary} />
                <ThemedText type="label" style={{ color: theme.primary, textTransform: "capitalize" }}>
                  {profile.serviceType.replace(/_/g, " ")}
                </ThemedText>
              </View>
            </View>
          ) : null}

          {profile.bio || profile.description ? (
            <View style={styles.section}>
              <ThemedText type="h3">About</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                {profile.bio || profile.description}
              </ThemedText>
            </View>
          ) : null}

          {isEscort && profile.serviceDescription ? (
            <View style={styles.section}>
              <ThemedText type="h3">Services Offered</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                {profile.serviceDescription}
              </ThemedText>
            </View>
          ) : null}

          {isEscort && escortCategories.length > 0 ? (
            <View style={styles.section}>
              <ThemedText type="h3">Experience Types</ThemedText>
              <View style={styles.tagGrid}>
                {escortCategories.map((cat, i) => (
                  <View key={i} style={[styles.interestTag, { backgroundColor: "rgba(218,165,32,0.12)" }]}>
                    <ThemedText type="small" style={{ color: "#B8860B" }}>{categoryLabels[cat] || cat}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {isEscort && profile.minimumHours ? (
            <View style={styles.section}>
              <ThemedText type="h3">Booking Details</ThemedText>
              <View style={[styles.availabilityCard, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
                <Feather name="clock" size={18} color="#DAA520" />
                <View style={{ flex: 1 }}>
                  <ThemedText type="body">Minimum {profile.minimumHours} hours per booking</ThemedText>
                  {hourlyRateDisplay ? (
                    <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
                      {hourlyRateDisplay}/hr {profile.minimumHours > 1 ? `(from ${formatPrice((profile.hourlyRate || 0) * profile.minimumHours)})` : ""}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}

          {interests.length > 0 ? (
            <View style={styles.section}>
              <ThemedText type="h3">Interests</ThemedText>
              <View style={styles.tagGrid}>
                {interests.map((interest, i) => (
                  <View key={i} style={[styles.interestTag, { backgroundColor: theme.backgroundSecondary }]}>
                    <ThemedText type="small">{interest}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {languages.length > 0 ? (
            <View style={styles.section}>
              <ThemedText type="h3">Languages</ThemedText>
              <View style={styles.tagGrid}>
                {languages.map((lang, i) => (
                  <View key={i} style={[styles.languageTag, { backgroundColor: "#1A4D2E15" }]}>
                    <Feather name="globe" size={14} color="#1A4D2E" />
                    <ThemedText type="small" style={{ color: "#1A4D2E" }}>{lang}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {profile.availability ? (
            <View style={styles.section}>
              <ThemedText type="h3">Availability</ThemedText>
              <View style={[styles.availabilityCard, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
                <Feather name="calendar" size={18} color={theme.primary} />
                <ThemedText type="body" style={{ color: theme.textSecondary, flex: 1 }}>
                  {profile.availability}
                </ThemedText>
              </View>
            </View>
          ) : null}

          <View style={[styles.disclaimerBanner, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="info" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ flex: 1, color: theme.textSecondary, lineHeight: 18 }}>
              Tripsbnb is a connection platform only. We do not employ, endorse, or guarantee companions. You are responsible for your own safety when meeting in person.
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      <SafetyAcknowledgmentModal
        visible={showSafetyModal}
        onAccept={handleConfirmConnect}
        onDecline={() => setShowSafetyModal(false)}
        companionName={profile.name}
      />

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.sm, backgroundColor: theme.backgroundRoot }]}>
        <Pressable
          onPress={handlePass}
          style={[styles.bottomButton, styles.passBottomButton, { borderColor: theme.error }]}
          testID="button-pass-profile"
        >
          <Feather name="x" size={22} color={theme.error} />
          <ThemedText type="label" style={{ color: theme.error }}>Pass</ThemedText>
        </Pressable>
        <Pressable
          onPress={handleConnect}
          style={[styles.bottomButton, styles.connectBottomButton, { backgroundColor: theme.primary }]}
          testID="button-connect-profile"
        >
          <Feather name="heart" size={22} color="#FFFFFF" />
          <ThemedText type="label" style={{ color: "#FFFFFF" }}>Connect</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  photoSection: { position: "relative" },
  photo: { width: SCREEN_WIDTH, height: PHOTO_HEIGHT },
  photoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: PHOTO_HEIGHT * 0.4,
  },
  photoInfo: {
    position: "absolute",
    bottom: Spacing.xl,
    left: Spacing.xl,
    right: Spacing.xl,
  },
  photoProgressBar: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    gap: 4,
    zIndex: 20,
  },
  photoSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  photoTapLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "40%",
    height: "70%",
    zIndex: 15,
  },
  photoTapRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "40%",
    height: "70%",
    zIndex: 15,
  },
  photoCounter: {
    position: "absolute",
    top: 20,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    zIndex: 20,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  nameText: { color: "#FFFFFF" },
  verifiedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DAA520",
    justifyContent: "center",
    alignItems: "center",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  locationText: { color: "rgba(255,255,255,0.9)" },
  content: { padding: Spacing.xl },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: 4,
  },
  section: { marginBottom: Spacing.xl },
  serviceTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  tagGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  interestTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  languageTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  availabilityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
  },
  disclaimerBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  bottomButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  passBottomButton: {
    borderWidth: 2,
  },
  connectBottomButton: {},
});
