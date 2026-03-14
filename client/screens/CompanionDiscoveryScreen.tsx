import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";

import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { SafetyAcknowledgmentModal } from "@/components/SafetyAcknowledgmentModal";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius, Shadows, Typography } from "@/constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - Spacing.xl * 2;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.62;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface CompanionProfile {
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
}

const USER_ID = "traveler-" + Platform.OS;

function SwipeableCard({
  profile,
  onSwipeLeft,
  onSwipeRight,
  isTop,
}: {
  profile: CompanionProfile;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTop: boolean;
}) {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardRotate = useSharedValue(0);
  const isGestureActive = useSharedValue(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

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

  const triggerSwipeLeft = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSwipeLeft();
  }, [onSwipeLeft]);

  const triggerSwipeRight = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSwipeRight();
  }, [onSwipeRight]);

  const pan = Gesture.Pan()
    .enabled(isTop)
    .onStart(() => {
      isGestureActive.value = true;
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.5;
      cardRotate.value = interpolate(
        event.translationX,
        [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
        [-15, 0, 15],
        Extrapolation.CLAMP
      );
    })
    .onEnd((event) => {
      isGestureActive.value = false;
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 });
        cardRotate.value = withTiming(15, { duration: 300 });
        runOnJS(triggerSwipeRight)();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 });
        cardRotate.value = withTiming(-15, { duration: 300 });
        runOnJS(triggerSwipeLeft)();
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
        cardRotate.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${cardRotate.value}deg` },
    ],
  }));

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  const passOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  const rating = parseFloat(profile.averageRating) || 0;
  const displayAge = profile.age ? `, ${profile.age}` : "";
  const currentPhoto = photos.length > 0 ? photos[activePhotoIndex] : null;
  const serviceLabel = profile.serviceType ? profile.serviceType.replace(/_/g, " ") : "";
  const totalPhotos = photos.length;

  const handleTapLeft = () => {
    if (activePhotoIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActivePhotoIndex(activePhotoIndex - 1);
    }
  };

  const handleTapRight = () => {
    if (activePhotoIndex < totalPhotos - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActivePhotoIndex(activePhotoIndex + 1);
    }
  };

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.swipeCard,
          animatedCardStyle,
          { backgroundColor: theme.backgroundDefault },
          Shadows.card,
        ]}
        testID={`card-companion-${profile.id}`}
      >
        <View style={styles.cardImageContainer}>
          {currentPhoto ? (
            <Image
              source={{ uri: currentPhoto }}
              style={styles.cardMainImage}
              contentFit="cover"
            />
          ) : (
            <LinearGradient
              colors={["#6B3FA0", "#8E5CC5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardMainImage}
            >
              <Feather name="user" size={60} color="rgba(255,255,255,0.4)" />
            </LinearGradient>
          )}

          {totalPhotos > 1 ? (
            <View style={styles.photoProgressBar}>
              {photos.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.photoProgressSegment,
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
          ) : null}

          {isTop && totalPhotos > 1 ? (
            <>
              <Pressable
                style={styles.photoTapLeft}
                onPress={handleTapLeft}
                testID="button-photo-prev"
              />
              <Pressable
                style={styles.photoTapRight}
                onPress={handleTapRight}
                testID="button-photo-next"
              />
            </>
          ) : null}

          <LinearGradient
            colors={["rgba(0,0,0,0.15)", "transparent", "transparent", "rgba(0,0,0,0.7)"]}
            locations={[0, 0.15, 0.5, 1]}
            style={styles.cardGradientOverlay}
          />
          <Animated.View style={[styles.stampLike, likeOpacity]}>
            <ThemedText type="h1" style={styles.stampLikeText}>
              CONNECT
            </ThemedText>
          </Animated.View>
          <Animated.View style={[styles.stampPass, passOpacity]}>
            <ThemedText type="h1" style={styles.stampPassText}>
              PASS
            </ThemedText>
          </Animated.View>
          <View style={styles.cardOverlayInfo}>
            <View style={styles.nameRow}>
              <ThemedText type="h1" style={styles.cardName}>
                {profile.name}{displayAge}
              </ThemedText>
              {profile.verified ? (
                <View style={[styles.verifiedBadge, { backgroundColor: "#DAA520" }]}>
                  <Feather name="check" size={12} color="#FFFFFF" />
                </View>
              ) : null}
            </View>
            <View style={styles.cardDetailsRow}>
              <Feather name="map-pin" size={14} color="rgba(255,255,255,0.9)" />
              <ThemedText type="body" style={styles.cardLocationText}>
                {profile.city}, {profile.country}
              </ThemedText>
            </View>
            <View style={styles.cardInfoChips}>
              {serviceLabel ? (
                <View style={styles.serviceBadge}>
                  <ThemedText type="caption" style={styles.serviceBadgeText}>
                    {serviceLabel}
                  </ThemedText>
                </View>
              ) : null}
              {rating > 0 ? (
                <View style={styles.ratingChip}>
                  <Feather name="star" size={11} color="#DAA520" />
                  <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    {rating.toFixed(1)}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.cardBottomSection}>
          {profile.bio ? (
            <ThemedText type="body" numberOfLines={2} style={{ color: theme.textSecondary }}>
              {profile.bio}
            </ThemedText>
          ) : null}
          <View style={styles.cardTags}>
            {interests.slice(0, 3).map((interest, i) => (
              <View key={i} style={[styles.tag, { backgroundColor: theme.backgroundTertiary }]}>
                <ThemedText type="caption" style={{ color: theme.text }}>
                  {interest}
                </ThemedText>
              </View>
            ))}
            {languages.slice(0, 2).map((lang, i) => (
              <View key={`lang-${i}`} style={[styles.tag, { backgroundColor: "#1A4D2E20" }]}>
                <Feather name="globe" size={10} color="#1A4D2E" />
                <ThemedText type="caption" style={{ color: "#1A4D2E" }}>
                  {lang}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
        {isTop ? (
          <Pressable
            style={styles.cardProfileTap}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("CompanionProfile", { companionId: profile.id });
            }}
            testID={`button-view-profile-${profile.id}`}
          />
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

export function CompanionDiscoveryScreen() {
  const insets = useSafeAreaInsets();

  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<string | null>(null);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [pendingLikeId, setPendingLikeId] = useState<string | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchInfo, setMatchInfo] = useState<{ name: string; photo: string | null; conversationId: string | null } | null>(null);
  const matchScale = useSharedValue(0);

  const filterParam = filter ? `?serviceType=${filter}` : "";
  const { data: profiles = [], isLoading } = useQuery<CompanionProfile[]>({
    queryKey: ["/api/companions/discover" + filterParam],
  });

  const showMatchAnimation = useCallback((name: string, photo: string | null, conversationId: string | null) => {
    setMatchInfo({ name, photo, conversationId });
    setShowMatchModal(true);
    matchScale.value = 0;
    matchScale.value = withSpring(1, { damping: 12, stiffness: 150 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const matchModalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: matchScale.value }],
    opacity: matchScale.value,
  }));

  const likeMutation = useMutation({
    mutationFn: async ({ companionId, status }: { companionId: string; status: string }) => {
      const res = await apiRequest("POST", `/api/companions/${companionId}/like`, {
        likedBy: USER_ID,
        status,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.matched && data.matchData) {
        showMatchAnimation(
          data.matchData.companionName,
          data.matchData.companionPhoto,
          data.matchData.conversationId
        );
        queryClient.invalidateQueries({ queryKey: [`/api/companions/matches/${USER_ID}`] });
      }
    },
  });

  const handleSwipeRight = useCallback(() => {
    const profile = profiles[currentIndex];
    if (profile) {
      likeMutation.mutate({ companionId: profile.id, status: "liked" });
    }
    setTimeout(() => setCurrentIndex((prev) => prev + 1), 350);
  }, [currentIndex, profiles]);

  const handleSwipeLeft = useCallback(() => {
    const profile = profiles[currentIndex];
    if (profile) {
      likeMutation.mutate({ companionId: profile.id, status: "passed" });
    }
    setTimeout(() => setCurrentIndex((prev) => prev + 1), 350);
  }, [currentIndex, profiles]);

  const handleButtonPass = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const profile = profiles[currentIndex];
    if (profile) {
      likeMutation.mutate({ companionId: profile.id, status: "passed" });
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const handleButtonLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const profile = profiles[currentIndex];
    if (profile) {
      setPendingLikeId(profile.id);
      setShowSafetyModal(true);
    }
  };

  const handleConfirmLike = () => {
    setShowSafetyModal(false);
    if (pendingLikeId) {
      likeMutation.mutate({ companionId: pendingLikeId, status: "liked" });
      setPendingLikeId(null);
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const remaining = profiles.slice(currentIndex);

  const SERVICE_FILTERS = [
    { label: "All", value: null },
    { label: "Escort", value: "escort" },
    { label: "Guide", value: "tour_guide" },
    { label: "Translator", value: "translator" },
    { label: "Driver", value: "driver" },
    { label: "Buddy", value: "travel_buddy" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.filterRow, { paddingTop: Spacing.sm }]}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate("Matches");
          }}
          style={[
            styles.matchesButton,
            { backgroundColor: "#DAA520" },
          ]}
          testID="button-matches"
        >
          <Feather name="heart" size={14} color="#FFFFFF" />
          <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "600" }}>
            Matches
          </ThemedText>
        </Pressable>
        {SERVICE_FILTERS.map((f) => (
          <Pressable
            key={f.label}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter(f.value);
              setCurrentIndex(0);
            }}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === f.value ? theme.primary : theme.backgroundSecondary,
              },
            ]}
            testID={`filter-${f.label.toLowerCase()}`}
          >
            <ThemedText
              type="caption"
              style={{
                color: filter === f.value ? "#FFFFFF" : theme.text,
              }}
            >
              {f.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.cardStack}>
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.primary} />
        ) : remaining.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              image={require("../../assets/images/empty-companions.png")}
              title="No more companions"
              subtitle="Check back later or adjust your filters"
            />
            <Pressable
              onPress={() => {
                setCurrentIndex(0);
                queryClient.invalidateQueries({ queryKey: ["/api/companions/discover" + filterParam] });
              }}
              style={[styles.refreshButton, { backgroundColor: theme.primary }]}
              testID="button-refresh-companions"
            >
              <Feather name="refresh-cw" size={16} color="#FFFFFF" />
              <ThemedText type="label" style={{ color: "#FFFFFF" }}>
                Refresh
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          remaining
            .slice(0, 3)
            .reverse()
            .map((profile, reverseIndex) => {
              const actualIndex = remaining.length > 3 ? 2 - reverseIndex : remaining.length - 1 - reverseIndex;
              const isTop = actualIndex === 0;
              return (
                <SwipeableCard
                  key={profile.id}
                  profile={profile}
                  onSwipeLeft={handleSwipeLeft}
                  onSwipeRight={handleSwipeRight}
                  isTop={isTop}
                />
              );
            })
        )}
      </View>

      {remaining.length > 0 && !isLoading ? (
        <View style={[styles.actionButtons, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <Pressable
            onPress={handleButtonPass}
            style={[styles.actionButton, styles.passButton, { backgroundColor: theme.backgroundDefault }, Shadows.fab]}
            testID="button-pass"
          >
            <Feather name="x" size={28} color={theme.error} />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("CompanionProfile", { companionId: remaining[0]?.id });
            }}
            style={[styles.actionButton, styles.infoButton, { backgroundColor: theme.backgroundDefault }, Shadows.fab]}
            testID="button-info"
          >
            <Feather name="info" size={22} color={theme.primary} />
          </Pressable>
          <Pressable
            onPress={handleButtonLike}
            style={[styles.actionButton, styles.likeButton, { backgroundColor: "#1A4D2E" }, Shadows.fab]}
            testID="button-like"
          >
            <Feather name="heart" size={28} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.disclaimerBar, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="shield" size={12} color={theme.textSecondary} />
        <ThemedText type="caption" style={{ flex: 1, color: theme.textSecondary }}>
          Meet safely. Tripsbnb does not endorse or guarantee any companion.
        </ThemedText>
        <Pressable
          onPress={() => navigation.navigate("SafetyCenter" as any)}
          testID="button-safety-info"
        >
          <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>
            Safety Tips
          </ThemedText>
        </Pressable>
      </View>

      <SafetyAcknowledgmentModal
        visible={showSafetyModal}
        onAccept={handleConfirmLike}
        onDecline={() => {
          setShowSafetyModal(false);
          setPendingLikeId(null);
        }}
        companionName={
          pendingLikeId
            ? profiles.find((p) => p.id === pendingLikeId)?.name
            : undefined
        }
      />

      {showMatchModal && matchInfo ? (
        <View style={styles.matchOverlay}>
          <Pressable style={styles.matchOverlayBg} onPress={() => setShowMatchModal(false)} />
          <Animated.View style={[styles.matchModalCard, matchModalStyle]}>
            <LinearGradient
              colors={["#1A4D2E", "#2D6B45"]}
              style={styles.matchGradient}
            >
              <View style={styles.matchIconCircle}>
                <Feather name="heart" size={36} color="#DAA520" />
              </View>
              <ThemedText type="title" style={{ color: "#FFFFFF", textAlign: "center", fontSize: 24 }}>
                It's a Match!
              </ThemedText>
              <ThemedText type="default" style={{ color: "rgba(255,255,255,0.85)", textAlign: "center" }}>
                You and {matchInfo.name} can now chat
              </ThemedText>
              <View style={styles.matchActions}>
                <Pressable
                  onPress={() => {
                    setShowMatchModal(false);
                    if (matchInfo.conversationId) {
                      navigation.navigate("Chat", {
                        conversationId: matchInfo.conversationId,
                        vendorName: matchInfo.name,
                        vendorType: "companion",
                        vendorImageUrl: matchInfo.photo,
                      });
                    }
                  }}
                  style={[styles.matchChatBtn, { backgroundColor: "#DAA520" }]}
                  testID="button-match-chat"
                >
                  <Feather name="message-circle" size={18} color="#FFFFFF" />
                  <ThemedText type="defaultSemiBold" style={{ color: "#FFFFFF" }}>
                    Send a Message
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setShowMatchModal(false)}
                  style={styles.matchKeepBtn}
                  testID="button-match-keep-swiping"
                >
                  <ThemedText type="default" style={{ color: "rgba(255,255,255,0.8)" }}>
                    Keep Swiping
                  </ThemedText>
                </Pressable>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  disclaimerBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  cardStack: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  swipeCard: {
    position: "absolute",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  cardImageContainer: {
    flex: 1,
    position: "relative",
  },
  cardMainImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  cardGradientOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  photoProgressBar: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    gap: 4,
    zIndex: 20,
  },
  photoProgressSegment: {
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
  stampLike: {
    position: "absolute",
    top: 40,
    left: 20,
    borderWidth: 4,
    borderColor: "#34C759",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    transform: [{ rotate: "-15deg" }],
  },
  stampLikeText: {
    color: "#34C759",
    fontSize: 32,
  },
  stampPass: {
    position: "absolute",
    top: 40,
    right: 20,
    borderWidth: 4,
    borderColor: "#FF3B30",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    transform: [{ rotate: "15deg" }],
  },
  stampPassText: {
    color: "#FF3B30",
    fontSize: 32,
  },
  cardOverlayInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  cardName: {
    color: "#FFFFFF",
    fontSize: 28,
  },
  verifiedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: Spacing.sm,
  },
  cardLocationText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
  },
  cardInfoChips: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: 4,
  },
  serviceBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  serviceBadgeText: {
    color: "#FFFFFF",
    textTransform: "capitalize",
  },
  ratingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(218,165,32,0.3)",
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  cardBottomSection: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  cardMetaRow: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "center",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  responseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardTapArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  cardProfileTap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  actionButton: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 999,
  },
  passButton: {
    width: 60,
    height: 60,
  },
  infoButton: {
    width: 48,
    height: 48,
  },
  likeButton: {
    width: 60,
    height: 60,
  },
  emptyWrap: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xl,
  },
  matchesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  matchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  matchOverlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  matchModalCard: {
    width: "85%",
    maxWidth: 340,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  matchGradient: {
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.md,
  },
  matchIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  matchActions: {
    width: "100%",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  matchChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  matchKeepBtn: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
});
