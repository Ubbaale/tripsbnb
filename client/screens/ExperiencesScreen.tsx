import React, { useState } from "react";
import { StyleSheet, View, FlatList, ActivityIndicator, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { SegmentedControl } from "@/components/SegmentedControl";
import { EmptyState } from "@/components/EmptyState";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { formatPrice } from "@/lib/currency";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function isVenueCurrentlyOpen(item: VendorItem): boolean {
  if (!item.operatingHours) return true;
  try {
    const hours = typeof item.operatingHours === "string" ? JSON.parse(item.operatingHours) : item.operatingHours;
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const now = new Date();
    const dayKey = days[now.getDay()];
    const dayHours = hours[dayKey];
    if (!dayHours || dayHours.closed) return false;
    const currentTime = now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0");
    if (dayHours.close < dayHours.open) {
      return currentTime >= dayHours.open || currentTime <= dayHours.close;
    }
    return currentTime >= dayHours.open && currentTime <= dayHours.close;
  } catch {
    return true;
  }
}

const SEGMENTS = ["🦁 Adventures", "👫 Companions", "🍽️ Restaurants"];
const SEGMENT_LABELS = ["Adventures", "Companions", "Restaurants"];
const EMPTY_IMAGES = {
  Adventures: require("../../assets/images/empty-safaris.png"),
  Companions: require("../../assets/images/empty-companions.png"),
  Restaurants: require("../../assets/images/empty-dining.png"),
};

const VENDOR_GRADIENT: Record<string, readonly [string, string]> = {
  safari: ["#B8860B", "#DAA520"],
  companion: ["#6B3FA0", "#8E5CC5"],
  restaurant: ["#1A4D2E", "#2D6A4F"],
};

const VENDOR_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  safari: "sun",
  companion: "users",
  restaurant: "coffee",
};

interface VendorItem {
  id: string;
  name: string;
  description: string | null;
  city: string;
  country: string;
  verified: boolean;
  averageRating: string;
  totalRatings: number;
  bookingPrice: number | null;
  [key: string]: any;
}

function VendorCard({
  item,
  vendorType,
  onPress,
}: {
  item: VendorItem;
  vendorType: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const rating = parseFloat(item.averageRating) || 0;
  const gradient = VENDOR_GRADIENT[vendorType] || VENDOR_GRADIENT.safari;
  const icon = VENDOR_ICON[vendorType] || "map-pin";
  const price = item.bookingPrice ? formatPrice(item.bookingPrice, item.bookingCurrency || "usd") : null;

  const isOpen = vendorType === "restaurant" ? isVenueCurrentlyOpen(item) : true;

  let subtitle = "";
  if (vendorType === "safari" && item.safariType) {
    subtitle = `${item.safariType.replace(/_/g, " ")}${item.duration ? ` \u2022 ${item.duration}` : ""}`;
  } else if (vendorType === "companion" && item.serviceType) {
    subtitle = item.serviceType.replace(/_/g, " ");
  } else if (vendorType === "restaurant" && item.cuisineType) {
    const venueLabel = item.venueType && item.venueType !== "restaurant"
      ? `${item.venueType.charAt(0).toUpperCase()}${item.venueType.slice(1).replace(/-/g, " ")} \u2022 `
      : "";
    subtitle = `${venueLabel}${item.cuisineType}${item.priceRange ? ` \u2022 ${item.priceRange}` : ""}`;
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.card, animatedStyle, !isOpen && { opacity: 0.55 }]}
      testID={`card-${vendorType}-${item.id}`}
    >
      <View style={[styles.cardInner, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
        <View style={styles.cardImage}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={[styles.cardImagePhoto, !isOpen && { opacity: 0.5 }]} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.cardImagePlaceholder, !isOpen && { opacity: 0.5 }]}
            >
              <Feather name={icon} size={28} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          )}
          {item.verified ? (
            <View style={[styles.verifiedBadge, { backgroundColor: theme.accent }]}>
              <Feather name="check" size={10} color="#FFFFFF" />
            </View>
          ) : null}
          {vendorType === "restaurant" && !isOpen ? (
            <View style={styles.closedOverlay}>
              <View style={styles.closedBadge}>
                <ThemedText type="small" style={styles.closedText}>Closed</ThemedText>
              </View>
            </View>
          ) : null}
          {vendorType === "restaurant" ? (
            <View style={styles.featureBadges}>
              {item.offersDelivery ? (
                <View style={[styles.featureBadge, { backgroundColor: "rgba(34,197,94,0.9)" }]}>
                  <Feather name="truck" size={9} color="#fff" />
                </View>
              ) : null}
              {item.acceptsReservations ? (
                <View style={[styles.featureBadge, { backgroundColor: "rgba(218,165,32,0.9)" }]}>
                  <Feather name="calendar" size={9} color="#fff" />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <ThemedText type="h4" numberOfLines={1} style={styles.cardTitle}>
              {item.name}
            </ThemedText>
            <View style={styles.cardRating}>
              <Feather name="star" size={12} color={theme.accent} />
              <ThemedText type="caption" style={{ color: theme.accent }}>
                {rating > 0 ? rating.toFixed(1) : "New"}
              </ThemedText>
            </View>
          </View>
          {subtitle ? (
            <ThemedText type="caption" style={styles.cardMeta} numberOfLines={1}>
              {subtitle}
            </ThemedText>
          ) : null}
          {vendorType === "restaurant" ? (
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: isOpen ? "#22C55E" : "#EF4444" }]} />
              <ThemedText type="small" style={{ color: isOpen ? "#22C55E" : "#EF4444", fontSize: 11 }}>
                {isOpen ? "Open Now" : "Currently Closed"}
              </ThemedText>
            </View>
          ) : null}
          <View style={styles.cardBottom}>
            <View style={styles.cardLocation}>
              <Feather name="map-pin" size={12} color={theme.textSecondary} />
              <ThemedText type="small" style={styles.cardLocationText} numberOfLines={1}>
                {item.city}, {item.country}
              </ThemedText>
            </View>
            {price ? (
              <ThemedText type="label" style={{ color: theme.primary }}>
                {price}
              </ThemedText>
            ) : null}
          </View>
        </View>
        <View style={styles.cardArrow}>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function ExperiencesScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data: safaris = [], isLoading: isLoadingSafaris } = useQuery<VendorItem[]>({
    queryKey: ["/api/safaris"],
    enabled: selectedIndex === 0,
  });

  const { data: companions = [], isLoading: isLoadingCompanions } = useQuery<VendorItem[]>({
    queryKey: ["/api/companions"],
    enabled: selectedIndex === 1,
  });

  const { data: restaurants = [], isLoading: isLoadingRestaurants } = useQuery<VendorItem[]>({
    queryKey: ["/api/restaurants"],
    enabled: selectedIndex === 2,
  });

  const dataMap = [safaris, companions, restaurants];
  const loadingMap = [isLoadingSafaris, isLoadingCompanions, isLoadingRestaurants];
  const vendorTypeMap = ["safari", "companion", "restaurant"] as const;

  const currentData = dataMap[selectedIndex];
  const currentLoading = loadingMap[selectedIndex];
  const currentVendorType = vendorTypeMap[selectedIndex];
  const currentSegment = SEGMENT_LABELS[selectedIndex] as keyof typeof EMPTY_IMAGES;

  const navigateToDetail = (vendorType: string, vendorId: string) => {
    if (vendorType === "restaurant") {
      navigation.navigate("RestaurantDetail", { restaurantId: vendorId });
    } else {
      navigation.navigate("VendorDetail", { vendorType, vendorId });
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <EmptyState
        image={EMPTY_IMAGES[currentSegment]}
        title={`No ${currentSegment.toLowerCase()} yet`}
        subtitle={`Discover amazing ${currentSegment.toLowerCase()} experiences`}
      />
      {selectedIndex === 2 ? (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate("RestaurantOnboarding");
          }}
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          testID="button-add-restaurant"
        >
          <Feather name="plus" size={18} color="#FFFFFF" />
          <ThemedText type="label" style={styles.addButtonText}>
            Add Your Restaurant
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );

  const renderItem = ({ item }: { item: VendorItem }) => (
    <VendorCard
      item={item}
      vendorType={currentVendorType}
      onPress={() => navigateToDetail(currentVendorType, item.id)}
    />
  );

  const renderListHeader = () => (
    <View style={styles.header}>
      <SegmentedControl
        segments={SEGMENTS}
        selectedIndex={selectedIndex}
        onIndexChange={setSelectedIndex}
      />
      {selectedIndex === 1 ? (
        <View style={styles.subHeader}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate("CompanionDiscovery");
            }}
            style={[styles.registerBanner, { backgroundColor: "#6B3FA010" }]}
            testID="button-find-companions"
          >
            <LinearGradient
              colors={["#6B3FA0", "#8E5CC5"]}
              style={styles.registerIcon}
            >
              <Feather name="heart" size={18} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.registerContent}>
              <ThemedText type="label">💕 Find a Companion</ThemedText>
              <ThemedText type="caption" style={styles.registerSubtext}>
                Swipe to discover local guides and travel buddies 🌍
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color="#6B3FA0" />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate("CompanionOnboarding");
            }}
            style={[styles.registerBanner, { backgroundColor: theme.primary + "10" }]}
            testID="button-become-companion"
          >
            <View style={[styles.registerIcon, { backgroundColor: theme.primary }]}>
              <Feather name="plus" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.registerContent}>
              <ThemedText type="label">🌟 Become a Companion</ThemedText>
              <ThemedText type="caption" style={styles.registerSubtext}>
                Register to offer your services to travelers ✨
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.primary} />
          </Pressable>
        </View>
      ) : null}
      {selectedIndex === 2 && !currentLoading && currentData.length > 0 ? (
        <View style={styles.subHeader}>
          <View style={styles.subHeaderRow}>
            <ThemedText type="h4">🍽️ Nearby Restaurants</ThemedText>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("RestaurantsList", {});
              }}
              style={styles.seeAllButton}
            >
              <ThemedText type="label" style={{ color: theme.primary }}>
                See All
              </ThemedText>
              <Feather name="arrow-right" size={16} color={theme.primary} />
            </Pressable>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate("RestaurantOnboarding");
            }}
            style={[styles.registerBanner, { backgroundColor: theme.primary + "10" }]}
            testID="button-register-restaurant"
          >
            <View style={[styles.registerIcon, { backgroundColor: theme.primary }]}>
              <Feather name="plus" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.registerContent}>
              <ThemedText type="label">Own a Restaurant?</ThemedText>
              <ThemedText type="caption" style={styles.registerSubtext}>
                Register now to reach more customers
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.primary} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const emptyComponent = currentLoading ? (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  ) : (
    renderEmpty()
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={currentData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
          flexGrow: 1,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={emptyComponent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginBottom: Spacing.xl },
  subHeader: { marginTop: Spacing.xl },
  subHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  seeAllButton: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  registerBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  registerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  registerContent: { flex: 1 },
  registerSubtext: { opacity: 0.7, marginTop: 2 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
  },
  emptyContainer: { flex: 1, alignItems: "center" },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  addButtonText: { color: "#FFFFFF" },
  card: { marginBottom: Spacing.md },
  cardInner: {
    flexDirection: "row",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  cardImage: { width: 90, height: 90 },
  cardImagePhoto: { width: "100%", height: "100%" },
  cardImagePlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  verifiedBadge: {
    position: "absolute",
    top: Spacing.xs,
    right: Spacing.xs,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: { flex: 1, padding: Spacing.md, justifyContent: "center" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  cardTitle: { flex: 1, marginRight: Spacing.sm },
  cardRating: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardMeta: { opacity: 0.7, marginBottom: 4 },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLocation: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  cardLocationText: { flex: 1, opacity: 0.7 },
  cardArrow: { justifyContent: "center", paddingRight: Spacing.md },
  closedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  closedBadge: {
    backgroundColor: "rgba(239,68,68,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  closedText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  featureBadges: {
    position: "absolute",
    bottom: 4,
    left: 4,
    flexDirection: "row",
    gap: 4,
    zIndex: 3,
  },
  featureBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
