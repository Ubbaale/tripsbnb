import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  cuisineType: string;
  priceRange: string;
  venueType: string | null;
  imageUrl: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string;
  city: string;
  country: string;
  operatingHours: string | null;
  offersDelivery: boolean | null;
  deliveryRadius: number | null;
  deliveryFee: number | null;
  acceptsReservations: boolean | null;
  seatingCapacity: number | null;
  seatingArrangementUrl: string | null;
  hasVipSection: boolean | null;
  bookingPrice: number | null;
  bookingCurrency: string | null;
  verified: boolean;
  averageRating: string;
  totalRatings: number;
  createdAt: string;
}

interface Rating {
  id: string;
  restaurantId: string;
  userId: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
}

function StarRating({
  rating,
  onRatingChange,
  interactive = false,
  size = 24,
}: {
  rating: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
  size?: number;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => {
            if (interactive && onRatingChange) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onRatingChange(star);
            }
          }}
          disabled={!interactive}
        >
          <Feather
            name={star <= rating ? "star" : "star"}
            size={size}
            color={star <= rating ? theme.accent : theme.border}
            style={{ opacity: star <= rating ? 1 : 0.3 }}
          />
        </Pressable>
      ))}
    </View>
  );
}

function ReviewCard({ review }: { review: Rating }) {
  const { theme } = useTheme();
  const date = new Date(review.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <View style={[styles.reviewCard, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={styles.reviewHeader}>
        <View style={[styles.reviewAvatar, { backgroundColor: theme.primary + "20" }]}>
          <Feather name="user" size={16} color={theme.primary} />
        </View>
        <View style={styles.reviewHeaderContent}>
          <ThemedText type="label">Guest</ThemedText>
          <ThemedText type="caption" style={styles.reviewDate}>
            {formattedDate}
          </ThemedText>
        </View>
        <StarRating rating={review.rating} size={14} />
      </View>
      {review.comment ? (
        <ThemedText type="body" style={styles.reviewComment}>
          {review.comment}
        </ThemedText>
      ) : null}
    </View>
  );
}

function OperatingHoursView({ hours, theme }: { hours: string; theme: any }) {
  try {
    const parsed = typeof hours === "string" ? JSON.parse(hours) : hours;
    const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const dayLabels: Record<string, string> = {
      monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
      friday: "Fri", saturday: "Sat", sunday: "Sun",
    };
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const currentDay = days[new Date().getDay()];

    return (
      <View>
        {dayOrder.map((day) => {
          const h = parsed[day];
          const isToday = day === currentDay;
          const isClosed = !h || h.closed;
          return (
            <View key={day} style={[styles.hoursRow, isToday && { backgroundColor: "rgba(218,165,32,0.08)", borderRadius: 8, paddingHorizontal: 8 }]}>
              <ThemedText type="small" style={[styles.hoursDay, isToday && { color: "#DAA520", fontWeight: "700" }]}>
                {dayLabels[day]}{isToday ? " (Today)" : ""}
              </ThemedText>
              {isClosed ? (
                <ThemedText type="small" style={{ color: "#EF4444", fontWeight: "600" }}>Closed</ThemedText>
              ) : (
                <ThemedText type="small" style={[{ fontWeight: "500" }, isToday && { color: "#DAA520" }]}>
                  {h.open} - {h.close}
                </ThemedText>
              )}
            </View>
          );
        })}
      </View>
    );
  } catch {
    return null;
  }
}

export function RestaurantDetailScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { restaurantId } = route.params;

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");

  const { data: restaurant, isLoading: isLoadingRestaurant } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants", restaurantId],
  });

  const { data: ratings = [], isLoading: isLoadingRatings } = useQuery<Rating[]>({
    queryKey: ["/api/restaurants", restaurantId, "/ratings"],
  });

  const submitRatingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/restaurants/${restaurantId}/ratings`,
        { rating: newRating, comment: newComment || null }
      );
      return response.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurantId, "/ratings"] });
      setShowReviewForm(false);
      setNewRating(0);
      setNewComment("");
      Alert.alert("Thank you!", "Your review has been submitted.");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to submit review");
    },
  });

  const handleSubmitReview = () => {
    if (newRating === 0) {
      Alert.alert("Rating Required", "Please select a star rating");
      return;
    }
    submitRatingMutation.mutate();
  };

  if (isLoadingRestaurant) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </ThemedView>
    );
  }

  if (!restaurant) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={theme.error} />
          <ThemedText type="h4">Restaurant not found</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const avgRating = parseFloat(restaurant.averageRating) || 0;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Spacing.md, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#1A4D2E", "#2D6A4F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroImage}
        >
          <View style={styles.heroContent}>
            <Feather name="coffee" size={64} color="rgba(255,255,255,0.3)" />
          </View>
          {restaurant.verified ? (
            <View style={[styles.verifiedBadge, { backgroundColor: theme.accent }]}>
              <Feather name="check" size={12} color="#FFFFFF" />
              <ThemedText type="caption" style={styles.verifiedText}>
                Verified
              </ThemedText>
            </View>
          ) : null}
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="h1">{restaurant.name}</ThemedText>
            <View style={styles.metaRow}>
              <View style={styles.ratingContainer}>
                <Feather name="star" size={18} color={theme.accent} />
                <ThemedText type="h4" style={{ color: theme.accent }}>
                  {avgRating > 0 ? avgRating.toFixed(1) : "New"}
                </ThemedText>
                {restaurant.totalRatings > 0 && (
                  <ThemedText type="caption">
                    ({restaurant.totalRatings} review{restaurant.totalRatings !== 1 ? "s" : ""})
                  </ThemedText>
                )}
              </View>
              <View style={styles.priceTag}>
                <ThemedText type="label" style={{ color: theme.primary }}>
                  {restaurant.priceRange}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.infoRow}>
              <Feather name="tag" size={18} color={theme.textSecondary} />
              <ThemedText type="body">{restaurant.cuisineType}</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={18} color={theme.textSecondary} />
              <ThemedText type="body">
                {restaurant.address}, {restaurant.city}, {restaurant.country}
              </ThemedText>
            </View>
            {restaurant.phone && (
              <View style={styles.infoRow}>
                <Feather name="phone" size={18} color={theme.textSecondary} />
                <ThemedText type="body">{restaurant.phone}</ThemedText>
              </View>
            )}
            {restaurant.email && (
              <View style={styles.infoRow}>
                <Feather name="mail" size={18} color={theme.textSecondary} />
                <ThemedText type="body">{restaurant.email}</ThemedText>
              </View>
            )}
          </View>

          {(restaurant.offersDelivery || restaurant.acceptsReservations || restaurant.hasVipSection) ? (
            <View style={styles.section}>
              <View style={styles.featurePills}>
                {restaurant.offersDelivery ? (
                  <View style={[styles.featurePill, { backgroundColor: "rgba(34,197,94,0.12)" }]}>
                    <Feather name="truck" size={14} color="#22C55E" />
                    <ThemedText type="small" style={{ color: "#22C55E", fontWeight: "600" }}>
                      Delivery{restaurant.deliveryRadius ? ` (${restaurant.deliveryRadius}km)` : ""}
                    </ThemedText>
                  </View>
                ) : null}
                {restaurant.acceptsReservations ? (
                  <View style={[styles.featurePill, { backgroundColor: "rgba(218,165,32,0.12)" }]}>
                    <Feather name="calendar" size={14} color="#DAA520" />
                    <ThemedText type="small" style={{ color: "#DAA520", fontWeight: "600" }}>
                      Reservations
                    </ThemedText>
                  </View>
                ) : null}
                {restaurant.hasVipSection ? (
                  <View style={[styles.featurePill, { backgroundColor: "rgba(147,51,234,0.12)" }]}>
                    <Feather name="star" size={14} color="#A855F7" />
                    <ThemedText type="small" style={{ color: "#A855F7", fontWeight: "600" }}>
                      VIP Section
                    </ThemedText>
                  </View>
                ) : null}
                {restaurant.seatingCapacity ? (
                  <View style={[styles.featurePill, { backgroundColor: theme.backgroundSecondary }]}>
                    <Feather name="users" size={14} color={theme.textSecondary} />
                    <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "600" }}>
                      {restaurant.seatingCapacity} Seats
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {restaurant.operatingHours ? (
            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>Operating Hours</ThemedText>
              <OperatingHoursView hours={restaurant.operatingHours} theme={theme} />
            </View>
          ) : null}

          {restaurant.description ? (
            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                About
              </ThemedText>
              <ThemedText type="body" style={styles.description}>
                {restaurant.description}
              </ThemedText>
            </View>
          ) : null}

          {restaurant.seatingArrangementUrl ? (
            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>Seating Arrangement</ThemedText>
              <Image
                source={{ uri: restaurant.seatingArrangementUrl }}
                style={styles.seatingImage}
                resizeMode="contain"
              />
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <ThemedText type="h4">Reviews</ThemedText>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowReviewForm(!showReviewForm);
                }}
                style={[styles.addReviewButton, { backgroundColor: theme.primary }]}
              >
                <Feather name="plus" size={16} color="#FFFFFF" />
                <ThemedText type="caption" style={styles.addReviewText}>
                  Add Review
                </ThemedText>
              </Pressable>
            </View>

            {showReviewForm && (
              <View style={[styles.reviewForm, { backgroundColor: theme.backgroundSecondary }, Shadows.card]}>
                <ThemedText type="label" style={styles.formLabel}>
                  Your Rating
                </ThemedText>
                <StarRating
                  rating={newRating}
                  onRatingChange={setNewRating}
                  interactive
                  size={32}
                />
                <ThemedText type="label" style={[styles.formLabel, { marginTop: Spacing.lg }]}>
                  Your Review (Optional)
                </ThemedText>
                <TextInput
                  style={[
                    styles.commentInput,
                    { backgroundColor: theme.backgroundDefault, color: theme.text },
                  ]}
                  placeholder="Share your experience..."
                  placeholderTextColor={theme.textSecondary}
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.formButtons}>
                  <Pressable
                    onPress={() => setShowReviewForm(false)}
                    style={[styles.cancelButton, { borderColor: theme.border }]}
                  >
                    <ThemedText type="label">Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={handleSubmitReview}
                    disabled={submitRatingMutation.isPending}
                    style={[
                      styles.submitButton,
                      { backgroundColor: theme.primary },
                      submitRatingMutation.isPending && { opacity: 0.7 },
                    ]}
                  >
                    {submitRatingMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <ThemedText type="label" style={styles.submitButtonText}>
                        Submit
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {isLoadingRatings ? (
              <ActivityIndicator color={theme.primary} style={styles.reviewsLoading} />
            ) : ratings.length > 0 ? (
              <View style={styles.reviewsList}>
                {ratings.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </View>
            ) : (
              <View style={styles.noReviews}>
                <Feather name="message-circle" size={32} color={theme.textSecondary} />
                <ThemedText type="body" style={styles.noReviewsText}>
                  No reviews yet. Be the first!
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing["4xl"],
  },
  heroImage: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
  },
  heroContent: {
    opacity: 0.5,
  },
  verifiedBadge: {
    position: "absolute",
    top: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  verifiedText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  priceTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(26,77,46,0.1)",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  description: {
    lineHeight: 24,
  },
  reviewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  addReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  addReviewText: {
    color: "#FFFFFF",
  },
  reviewForm: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  formLabel: {
    marginBottom: Spacing.sm,
  },
  starContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  commentInput: {
    height: 80,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    textAlignVertical: "top",
  },
  formButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  submitButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  submitButtonText: {
    color: "#FFFFFF",
  },
  reviewsLoading: {
    paddingVertical: Spacing.xl,
  },
  reviewsList: {
    gap: Spacing.md,
  },
  reviewCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  reviewHeaderContent: {
    flex: 1,
  },
  reviewDate: {
    opacity: 0.6,
  },
  reviewComment: {
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  noReviews: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  noReviewsText: {
    opacity: 0.7,
  },
  featurePills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  hoursDay: {
    width: 100,
  },
  seatingImage: {
    width: "100%",
    height: 220,
    borderRadius: BorderRadius.lg,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
});
