import React, { useState, useMemo } from "react";
import { StyleSheet, View, FlatList, ActivityIndicator, Pressable, Image, Dimensions, ScrollView } from "react-native";
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

import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";
import { ThemedText } from "@/components/ThemedText";
import { StaysFilterModal, StaysFilterState, DEFAULT_STAYS_FILTERS } from "@/components/StaysFilterModal";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { formatPrice } from "@/lib/currency";

const HERO_IMAGES = [
  require("../../assets/images/bnb-hero-1.jpg"),
  require("../../assets/images/bnb-hero-2.jpg"),
  require("../../assets/images/bnb-hero-3.jpg"),
];
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_IMAGE_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;
const HERO_IMAGE_HEIGHT = 180;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PROPERTY_TYPE_CHIPS: { key: string; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "grid" },
  { key: "house", label: "House", icon: "home" },
  { key: "apartment", label: "Apartment", icon: "square" },
  { key: "villa", label: "Villa", icon: "sun" },
  { key: "hotel", label: "Hotel", icon: "briefcase" },
  { key: "cabin", label: "Cabin", icon: "triangle" },
  { key: "cottage", label: "Cottage", icon: "coffee" },
  { key: "resort", label: "Resort", icon: "star" },
  { key: "lodge", label: "Lodge", icon: "map" },
  { key: "camp", label: "Camp", icon: "compass" },
  { key: "guesthouse", label: "Guest House", icon: "users" },
  { key: "farmstay", label: "Farmstay", icon: "wind" },
  { key: "treehouse", label: "Treehouse", icon: "feather" },
  { key: "houseboat", label: "Houseboat", icon: "anchor" },
  { key: "hostel", label: "Hostel", icon: "layers" },
];

interface Accommodation {
  id: string;
  name: string;
  description: string | null;
  propertyType: string;
  address: string;
  city: string;
  country: string;
  verified: boolean;
  averageRating: string;
  totalRatings: number;
  bookingPrice: number | null;
  bookingCurrency?: string;
  monthlyPrice: number | null;
  monthlyAvailable: boolean;
  minimumStay: number | null;
  amenities: string | null;
  roomTypes: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  beds: number | null;
  maxGuests: number | null;
  instantBook: boolean;
  selfCheckIn: boolean;
  cancellationPolicy: string | null;
  imageUrl: string | null;
  [key: string]: any;
}

interface FlashDeal {
  id: string;
  vendorType: string;
  vendorId: string;
  discountPercent: number;
  dealPrice: number;
  originalPrice: number;
  currency: string | null;
  expiresAt: string;
  isActive: boolean;
}

function AccommodationCard({
  item,
  onPress,
  activeDeal,
}: {
  item: Accommodation;
  onPress: () => void;
  activeDeal?: FlashDeal | null;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const rating = parseFloat(item.averageRating) || 0;
  const price = item.bookingPrice ? formatPrice(item.bookingPrice, item.bookingCurrency || "usd") : null;

  const detailParts: string[] = [];
  if (item.maxGuests) detailParts.push(`${item.maxGuests} guests`);
  if (item.bedrooms) detailParts.push(`${item.bedrooms} bed${item.bedrooms > 1 ? "rooms" : "room"}`);
  if (item.beds) detailParts.push(`${item.beds} bed${item.beds > 1 ? "s" : ""}`);
  if (item.bathrooms) detailParts.push(`${item.bathrooms} bath${item.bathrooms > 1 ? "s" : ""}`);

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.card, animatedStyle]}
      testID={`card-accommodation-${item.id}`}
    >
      <View style={[styles.cardInner, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
        <View style={styles.cardImage}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.cardImagePhoto} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={["#2C3E50", "#34495E"] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardImageGradient}
            >
              <Feather name="home" size={32} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          )}
          {item.verified ? (
            <View style={[styles.verifiedBadge, { backgroundColor: theme.accent }]}>
              <Feather name="check" size={10} color="#FFFFFF" />
            </View>
          ) : null}
          {item.instantBook ? (
            <View style={[styles.instantBadge, { backgroundColor: theme.primary }]}>
              <Feather name="zap" size={10} color="#FFFFFF" />
              <ThemedText type="small" style={{ color: "#FFFFFF", fontSize: 10 }}>Instant</ThemedText>
            </View>
          ) : null}
          {activeDeal ? (
            <View style={styles.dealBadge}>
              <Feather name="percent" size={10} color="#FFFFFF" />
              <ThemedText type="small" style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "700" }}>
                {activeDeal.discountPercent}% OFF
              </ThemedText>
            </View>
          ) : null}
          {price ? (
            <View style={styles.priceBadge}>
              <ThemedText type="label" style={styles.priceText}>
                {price}
              </ThemedText>
              <ThemedText type="small" style={styles.priceLabel}>
                /night
              </ThemedText>
            </View>
          ) : null}
          {item.monthlyAvailable && item.monthlyPrice ? (
            <View style={styles.monthlyBadge}>
              <Feather name="calendar" size={10} color="#FFFFFF" />
              <ThemedText type="small" style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "700" }}>Monthly</ThemedText>
            </View>
          ) : null}
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <ThemedText type="h4" numberOfLines={1} style={{ flex: 1 }}>
              {item.name}
            </ThemedText>
            <View style={styles.ratingRow}>
              <Feather name="star" size={12} color={theme.accent} />
              <ThemedText type="caption" style={{ color: theme.accent }}>
                {rating > 0 ? rating.toFixed(1) : "New"}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="caption" style={styles.propertyType} numberOfLines={1}>
            {item.propertyType.replace(/_/g, " ")}
          </ThemedText>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={12} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
              {item.city}, {item.country}
            </ThemedText>
          </View>
          {detailParts.length > 0 ? (
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }} numberOfLines={1}>
              {detailParts.join(" \u00B7 ")}
            </ThemedText>
          ) : null}
          {item.amenities ? (
            <View style={styles.amenitiesRow}>
              {item.amenities
                .split(",")
                .slice(0, 4)
                .map((amenity: string) => (
                  <View
                    key={amenity.trim()}
                    style={[styles.amenityTag, { backgroundColor: theme.backgroundSecondary }]}
                  >
                    <ThemedText type="small" numberOfLines={1}>
                      {amenity.trim()}
                    </ThemedText>
                  </View>
                ))}
            </View>
          ) : null}
          {item.monthlyAvailable && item.monthlyPrice && item.monthlyPrice > 0 ? (
            <View style={styles.monthlyPriceRow}>
              <Feather name="calendar" size={12} color="#2ECC71" />
              <ThemedText type="small" style={{ color: "#2ECC71", fontWeight: "700" }}>
                {formatPrice(item.monthlyPrice, item.bookingCurrency || "usd")}/mo
              </ThemedText>
              {item.bookingPrice && item.bookingPrice > 0 && item.monthlyPrice < item.bookingPrice * 30 ? (
                <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10 }}>
                  Save {Math.round((1 - (item.monthlyPrice / (item.bookingPrice * 30))) * 100)}%
                </ThemedText>
              ) : null}
            </View>
          ) : null}
          <View style={styles.cardBadgeRow}>
            {item.selfCheckIn ? (
              <View style={[styles.featureBadge, { backgroundColor: `${theme.primary}12` }]}>
                <Feather name="key" size={10} color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.primary, fontSize: 10 }}>Self check-in</ThemedText>
              </View>
            ) : null}
            {item.cancellationPolicy === "flexible" ? (
              <View style={[styles.featureBadge, { backgroundColor: `${theme.success}12` }]}>
                <Feather name="check-circle" size={10} color={theme.success} />
                <ThemedText type="small" style={{ color: theme.success, fontSize: 10 }}>Free cancellation</ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function StaysScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState("all");
  const [filters, setFilters] = useState<StaysFilterState>({ ...DEFAULT_STAYS_FILTERS });

  const { data: accommodations = [], isLoading } = useQuery<Accommodation[]>({
    queryKey: ["/api/accommodations"],
  });

  const { data: activeDeals = [] } = useQuery<FlashDeal[]>({
    queryKey: ["/api/deals/all"],
  });

  const dealsByVendorId = useMemo(() => {
    const map: Record<string, FlashDeal> = {};
    const now = new Date();
    activeDeals
      .filter((d) => d.vendorType === "accommodation" && d.isActive && new Date(d.expiresAt) > now)
      .forEach((d) => {
        if (!map[d.vendorId] || d.discountPercent > map[d.vendorId].discountPercent) {
          map[d.vendorId] = d;
        }
      });
    return map;
  }, [activeDeals]);

  const monthlyDeals = useMemo(() => {
    return accommodations.filter(
      (a) => a.monthlyAvailable && a.monthlyPrice && a.monthlyPrice > 0
    );
  }, [accommodations]);

  const isFiltered =
    selectedType !== "all" ||
    filters.propertyType !== "all" ||
    filters.priceMin > 0 ||
    filters.priceMax < 1000 ||
    filters.bedrooms > 0 ||
    filters.bathrooms > 0 ||
    filters.beds > 0 ||
    filters.guests > 0 ||
    filters.amenities.length > 0 ||
    filters.instantBook ||
    filters.selfCheckIn ||
    filters.freeCancellation ||
    filters.verifiedOnly ||
    filters.rating !== "all";

  const activeFilterCount =
    (selectedType !== "all" ? 1 : 0) +
    (filters.propertyType !== "all" ? 1 : 0) +
    (filters.priceMin > 0 || filters.priceMax < 1000 ? 1 : 0) +
    (filters.bedrooms > 0 ? 1 : 0) +
    (filters.bathrooms > 0 ? 1 : 0) +
    (filters.beds > 0 ? 1 : 0) +
    (filters.guests > 0 ? 1 : 0) +
    filters.amenities.length +
    (filters.instantBook ? 1 : 0) +
    (filters.selfCheckIn ? 1 : 0) +
    (filters.freeCancellation ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0) +
    (filters.rating !== "all" ? 1 : 0);

  const filtered = useMemo(() => {
    let result = accommodations;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q) ||
          a.country.toLowerCase().includes(q) ||
          a.propertyType.toLowerCase().includes(q)
      );
    }

    const activePropertyType = filters.propertyType !== "all" ? filters.propertyType : selectedType;
    if (activePropertyType !== "all") {
      result = result.filter((a) => a.propertyType.toLowerCase() === activePropertyType);
    }

    if (filters.priceMin > 0 || filters.priceMax < 1000) {
      result = result.filter((a) => {
        const priceDollars = (a.bookingPrice || 0) / 100;
        return priceDollars >= filters.priceMin && (filters.priceMax >= 1000 || priceDollars <= filters.priceMax);
      });
    }

    if (filters.bedrooms > 0) {
      result = result.filter((a) => (a.bedrooms || 0) >= filters.bedrooms);
    }
    if (filters.bathrooms > 0) {
      result = result.filter((a) => (a.bathrooms || 0) >= filters.bathrooms);
    }
    if (filters.beds > 0) {
      result = result.filter((a) => (a.beds || 0) >= filters.beds);
    }
    if (filters.guests > 0) {
      result = result.filter((a) => (a.maxGuests || 0) >= filters.guests);
    }

    if (filters.amenities.length > 0) {
      result = result.filter((a) => {
        if (!a.amenities) return false;
        const amenityList = a.amenities.toLowerCase().split(",").map((s: string) => s.trim());
        return filters.amenities.every((f) => amenityList.some((am) => am.includes(f.toLowerCase())));
      });
    }

    if (filters.instantBook) {
      result = result.filter((a) => a.instantBook);
    }
    if (filters.selfCheckIn) {
      result = result.filter((a) => a.selfCheckIn);
    }
    if (filters.freeCancellation) {
      result = result.filter((a) => a.cancellationPolicy === "flexible");
    }
    if (filters.verifiedOnly) {
      result = result.filter((a) => a.verified);
    }

    if (filters.rating !== "all") {
      result = result.filter((a) => {
        const r = parseFloat(a.averageRating) || 0;
        if (filters.rating === "3plus") return r >= 3.0;
        if (filters.rating === "4plus") return r >= 4.0;
        if (filters.rating === "4.5plus") return r >= 4.5;
        return true;
      });
    }

    return result;
  }, [accommodations, searchQuery, selectedType, filters]);

  const handleClearAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedType("all");
    setFilters({ ...DEFAULT_STAYS_FILTERS });
  };

  const renderItem = ({ item }: { item: Accommodation }) => (
    <AccommodationCard
      item={item}
      activeDeal={dealsByVendorId[item.id] || null}
      onPress={() =>
        navigation.navigate("VendorDetail", {
          vendorType: "accommodation",
          vendorId: item.id,
        })
      }
    />
  );

  const renderEmpty = () =>
    isLoading ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    ) : (
      <EmptyState
        image={require("../../assets/images/empty-stays.png")}
        title="No stays found"
        subtitle={isFiltered ? "Try adjusting your filters" : "Start exploring accommodations for your next adventure"}
      />
    );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={filtered}
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
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.heroSection}>
              <View style={styles.heroTextContainer}>
                <ThemedText type="caption" style={{ color: theme.accent, letterSpacing: 1, textTransform: "uppercase" }}>
                  Discover Your Perfect Stay
                </ThemedText>
                <ThemedText type="h2" style={styles.heroTitle}>
                  Your Next Getaway Starts Here
                </ThemedText>
                <ThemedText type="body" style={{ color: theme.textSecondary }}>
                  Browse and book unique accommodations worldwide
                </ThemedText>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                decelerationRate="fast"
                snapToInterval={HERO_IMAGE_WIDTH + Spacing.sm}
                contentContainerStyle={styles.heroScrollContent}
              >
                {HERO_IMAGES.map((img, idx) => (
                  <View key={idx} style={styles.heroImageWrapper}>
                    <Image source={img} style={styles.heroImage} resizeMode="cover" />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.4)"] as const}
                      style={styles.heroImageOverlay}
                    />
                  </View>
                ))}
              </ScrollView>
              <View style={styles.heroDots}>
                {HERO_IMAGES.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.heroDot,
                      { backgroundColor: idx === 0 ? theme.primary : theme.border },
                    ]}
                  />
                ))}
              </View>
            </View>

            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search accommodation..."
              onFilterPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowFilters(true);
              }}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryChipsScroll}
              style={styles.categoryChipsContainer}
            >
              {PROPERTY_TYPE_CHIPS.map((chip) => {
                const isActive = selectedType === chip.key;
                return (
                  <Pressable
                    key={chip.key}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedType(chip.key);
                    }}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isActive ? theme.primary : theme.backgroundDefault,
                        borderColor: isActive ? theme.primary : theme.border,
                      },
                    ]}
                    testID={`chip-type-${chip.key}`}
                  >
                    <Feather
                      name={chip.icon as any}
                      size={14}
                      color={isActive ? "#FFFFFF" : theme.textSecondary}
                    />
                    <ThemedText
                      type="small"
                      style={{ color: isActive ? "#FFFFFF" : theme.text, fontSize: 12 }}
                    >
                      {chip.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {isFiltered ? (
              <View style={styles.activeFiltersRow}>
                <View style={[styles.activeFilterBadge, { backgroundColor: `${theme.primary}15` }]}>
                  <Feather name="sliders" size={12} color={theme.primary} />
                  <ThemedText type="small" style={{ color: theme.primary }}>
                    {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active
                  </ThemedText>
                </View>
                <Pressable onPress={handleClearAll} testID="button-clear-active-filters">
                  <ThemedText type="small" style={{ color: theme.accent }}>
                    Clear all
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}

            {monthlyDeals.length > 0 ? (
              <View style={styles.monthlyDealsSection}>
                <View style={styles.monthlyDealsHeader}>
                  <View>
                    <ThemedText type="h3" style={{ marginBottom: 2 }}>Monthly Deals</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>Extended stays at discounted rates</ThemedText>
                  </View>
                  <View style={[styles.monthlySavingsTag, { backgroundColor: "#2ECC7118" }]}>
                    <Feather name="trending-down" size={12} color="#2ECC71" />
                    <ThemedText type="small" style={{ color: "#2ECC71", fontWeight: "600" }}>Up to 40% off</ThemedText>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
                  {monthlyDeals.map((deal) => (
                    <Pressable
                      key={deal.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.navigate("VendorDetail", { vendorType: "accommodation", vendorId: deal.id });
                      }}
                      style={[styles.monthlyDealCard, { backgroundColor: theme.backgroundDefault }]}
                      testID={`card-monthly-deal-${deal.id}`}
                    >
                      <View style={styles.monthlyDealImage}>
                        {deal.imageUrl ? (
                          <Image source={{ uri: deal.imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                        ) : (
                          <LinearGradient colors={["#2C3E50", "#34495E"] as const} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                            <Feather name="home" size={24} color="rgba(255,255,255,0.5)" />
                          </LinearGradient>
                        )}
                        <View style={styles.monthlySavingsBadge}>
                          <ThemedText type="small" style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "700" }}>
                            Save {deal.bookingPrice ? Math.round((1 - (deal.monthlyPrice! / (deal.bookingPrice * 30))) * 100) : 0}%
                          </ThemedText>
                        </View>
                      </View>
                      <View style={{ padding: 10 }}>
                        <ThemedText type="label" numberOfLines={1} style={{ fontSize: 13 }}>{deal.name}</ThemedText>
                        <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }} numberOfLines={1}>
                          {deal.city}, {deal.country}
                        </ThemedText>
                        <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 6, gap: 4 }}>
                          <ThemedText type="label" style={{ color: "#2ECC71", fontSize: 15 }}>
                            {formatPrice(deal.monthlyPrice!, deal.bookingCurrency || "usd")}
                          </ThemedText>
                          <ThemedText type="small" style={{ color: theme.textSecondary }}>/month</ThemedText>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.resultsCount}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {filtered.length} {filtered.length === 1 ? "property" : "properties"} found
              </ThemedText>
            </View>
          </View>
        }
        ListEmptyComponent={renderEmpty}
      />
      <StaysFilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApply={(newFilters) => {
          setFilters(newFilters);
          if (newFilters.propertyType !== "all") {
            setSelectedType(newFilters.propertyType);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
  },
  header: { marginBottom: Spacing.md },
  heroSection: { marginBottom: Spacing.lg },
  heroTextContainer: { marginBottom: Spacing.lg },
  heroTitle: { marginTop: 4, marginBottom: 6 },
  heroScrollContent: { gap: Spacing.sm },
  heroImageWrapper: {
    width: HERO_IMAGE_WIDTH,
    height: HERO_IMAGE_HEIGHT,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  heroImage: { width: "100%", height: "100%" },
  heroImageOverlay: { ...StyleSheet.absoluteFillObject },
  heroDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.md,
  },
  heroDot: { width: 6, height: 6, borderRadius: 3 },
  categoryChipsContainer: { marginTop: Spacing.md },
  categoryChipsScroll: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  card: { marginBottom: Spacing.lg },
  cardInner: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  cardImage: { height: 180, position: "relative" },
  cardImagePhoto: { width: "100%", height: "100%" },
  cardImageGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  instantBadge: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  dealBadge: {
    position: "absolute",
    bottom: Spacing.sm,
    left: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#E74C3C",
  },
  priceBadge: {
    position: "absolute",
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  priceText: { color: "#FFFFFF", fontWeight: "700" },
  priceLabel: { color: "rgba(255,255,255,0.8)" },
  cardBody: { padding: Spacing.lg },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  propertyType: { opacity: 0.7, marginTop: 2, textTransform: "capitalize" },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  amenitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  amenityTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  cardBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  featureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },
  activeFiltersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
  },
  activeFilterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  resultsCount: {
    marginTop: Spacing.sm,
  },
  monthlyBadge: {
    position: "absolute",
    bottom: Spacing.sm,
    left: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#2ECC71",
  },
  monthlyPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.sm,
  },
  monthlyDealsSection: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  monthlyDealsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  monthlySavingsTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  monthlyDealCard: {
    width: 200,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  monthlyDealImage: {
    height: 120,
    position: "relative",
  },
  monthlySavingsBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#E74C3C",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
});
