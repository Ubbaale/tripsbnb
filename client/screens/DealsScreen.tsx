import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Dimensions,
  Pressable,
  ImageBackground,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows, Typography } from "@/constants/theme";
import { formatPrice } from "@/lib/currency";

const { width } = Dimensions.get("window");
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function useCountdown(expiresAt: string | Date) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date().getTime();
      const expires = new Date(expiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        setIsUrgent(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}d ${hours % 24}h`);
        setIsUrgent(false);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${mins}m`);
        setIsUrgent(hours < 6);
      } else {
        setTimeLeft(`${mins}m ${secs}s`);
        setIsUrgent(true);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return { timeLeft, isUrgent };
}

interface FlashDeal {
  id: string;
  vendorType: string;
  vendorName: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  originalPrice: number;
  dealPrice: number;
  currency: string;
  discountPercent: number;
  city: string | null;
  country: string | null;
  expiresAt: string;
  maxRedemptions: number | null;
  currentRedemptions: number | null;
}

interface SeasonalDeal {
  id: string;
  vendorType: string;
  vendorId: string;
  vendorName: string;
  seasonType: string;
  discountPercent: number;
  startDate: string;
  endDate: string;
}

interface TripBundle {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  destination: string;
  country: string;
  duration: string | null;
  originalTotalPrice: number;
  bundlePrice: number;
  currency: string;
  savingsPercent: number;
  items: string | null;
  includesStay: boolean | null;
  includesExperience: boolean | null;
  includesDining: boolean | null;
  includesCompanion: boolean | null;
  isFeatured: boolean | null;
}

function FlashDealCard({ deal }: { deal: FlashDeal }) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const { timeLeft, isUrgent } = useCountdown(deal.expiresAt);

  const pulseScale = useSharedValue(1);
  useEffect(() => {
    if (isUrgent) {
      pulseScale.value = withRepeat(
        withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  }, [isUrgent]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const timerPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isUrgent ? pulseScale.value : 1 }],
  }));

  const spotsLeft = deal.maxRedemptions
    ? deal.maxRedemptions - (deal.currentRedemptions || 0)
    : null;

  const vendorTypeIcon: Record<string, string> = {
    accommodation: "home",
    safari: "compass",
    restaurant: "coffee",
    companion: "users",
  };

  return (
    <AnimatedPressable
      style={[styles.dealCard, animatedStyle, { backgroundColor: theme.backgroundDefault }]}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      testID={`deal-card-${deal.id}`}
    >
      <ImageBackground
        source={{ uri: deal.imageUrl || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800" }}
        style={styles.dealImage}
        imageStyle={{ borderTopLeftRadius: BorderRadius.lg, borderTopRightRadius: BorderRadius.lg }}
      >
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.6)"]}
          style={styles.dealGradient}
        >
          <View style={styles.dealImageContent}>
            <Animated.View style={[styles.timerBadge, isUrgent ? styles.timerUrgent : null, timerPulseStyle]}>
              <Feather name="clock" size={12} color="#FFF" />
              <ThemedText style={styles.timerText}>{timeLeft}</ThemedText>
            </Animated.View>
            <View style={styles.discountBadge}>
              <ThemedText style={styles.discountText}>-{deal.discountPercent}%</ThemedText>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>

      <View style={styles.dealContent}>
        <View style={styles.dealHeader}>
          <View style={[styles.vendorTypeBadge, { backgroundColor: `${theme.primary}15` }]}>
            <Feather
              name={vendorTypeIcon[deal.vendorType] as any || "tag"}
              size={11}
              color={theme.primary}
            />
            <ThemedText style={[styles.vendorTypeText, { color: theme.primary }]}>
              {deal.vendorType.charAt(0).toUpperCase() + deal.vendorType.slice(1)}
            </ThemedText>
          </View>
          {deal.city ? (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={11} color={theme.textSecondary} />
              <ThemedText style={[styles.locationText, { color: theme.textSecondary }]}>
                {deal.city}, {deal.country}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <ThemedText style={styles.dealTitle} numberOfLines={1}>{deal.title}</ThemedText>
        <ThemedText style={[styles.dealVendor, { color: theme.textSecondary }]} numberOfLines={1}>
          {deal.vendorName}
        </ThemedText>

        <View style={styles.priceRow}>
          <View style={styles.priceGroup}>
            <ThemedText style={[styles.originalPrice, { color: theme.textSecondary }]}>
              {formatPrice(deal.originalPrice, deal.currency)}
            </ThemedText>
            <ThemedText style={[styles.dealPrice, { color: theme.accent }]}>
              {formatPrice(deal.dealPrice, deal.currency)}
            </ThemedText>
          </View>
          {spotsLeft !== null ? (
            <View style={[styles.spotsBadge, spotsLeft <= 3 ? styles.spotsUrgent : null]}>
              <ThemedText style={styles.spotsText}>
                {spotsLeft <= 0 ? "Sold Out" : `${spotsLeft} left`}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>
    </AnimatedPressable>
  );
}

function BundleCard({ bundle }: { bundle: TripBundle }) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  let items: Array<{ vendorType: string; vendorName: string; price: number }> = [];
  try {
    items = typeof bundle.items === "string" ? JSON.parse(bundle.items) : (bundle.items || []);
  } catch {
    items = [];
  }

  const includedIcons: Array<{ icon: string; label: string }> = [];
  if (bundle.includesStay) includedIcons.push({ icon: "home", label: "Stay" });
  if (bundle.includesExperience) includedIcons.push({ icon: "compass", label: "Experience" });
  if (bundle.includesDining) includedIcons.push({ icon: "coffee", label: "Dining" });
  if (bundle.includesCompanion) includedIcons.push({ icon: "users", label: "Guide" });

  return (
    <AnimatedPressable
      style={[styles.bundleCard, animatedStyle]}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      testID={`bundle-card-${bundle.id}`}
    >
      <ImageBackground
        source={{ uri: bundle.imageUrl || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800" }}
        style={styles.bundleImage}
        imageStyle={{ borderRadius: BorderRadius.lg }}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.7)"]}
          style={styles.bundleGradient}
        >
          {bundle.isFeatured ? (
            <View style={styles.featuredBadge}>
              <Feather name="award" size={11} color="#FFF" />
              <ThemedText style={styles.featuredText}>Featured</ThemedText>
            </View>
          ) : null}

          <View style={styles.bundleBottomContent}>
            <View style={styles.bundleSavingsBadge}>
              <ThemedText style={styles.bundleSavingsText}>
                Save {bundle.savingsPercent}%
              </ThemedText>
            </View>

            <ThemedText style={styles.bundleName}>{bundle.name}</ThemedText>

            <View style={styles.bundleLocationRow}>
              <Feather name="map-pin" size={12} color="rgba(255,255,255,0.9)" />
              <ThemedText style={styles.bundleLocation}>
                {bundle.destination}, {bundle.country}
              </ThemedText>
            </View>

            {bundle.duration ? (
              <View style={styles.bundleDurationRow}>
                <Feather name="calendar" size={12} color="rgba(255,255,255,0.8)" />
                <ThemedText style={styles.bundleDuration}>{bundle.duration}</ThemedText>
              </View>
            ) : null}

            <View style={styles.bundleIncludesRow}>
              {includedIcons.map((item, i) => (
                <View key={i} style={styles.includeChip}>
                  <Feather name={item.icon as any} size={10} color="#FFF" />
                  <ThemedText style={styles.includeChipText}>{item.label}</ThemedText>
                </View>
              ))}
            </View>

            <View style={styles.bundlePriceRow}>
              <ThemedText style={styles.bundleOriginalPrice}>
                {formatPrice(bundle.originalTotalPrice, bundle.currency)}
              </ThemedText>
              <ThemedText style={styles.bundlePrice}>
                {formatPrice(bundle.bundlePrice, bundle.currency)}
              </ThemedText>
              <ThemedText style={styles.bundlePerPerson}> / package</ThemedText>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </AnimatedPressable>
  );
}

function SeasonalDealCard({ deal }: { deal: SeasonalDeal }) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const vendorTypeIcon: Record<string, string> = {
    accommodation: "home",
    safari: "compass",
    restaurant: "coffee",
    companion: "users",
  };

  const seasonLabels: Record<string, string> = {
    off_peak: "Off-Peak",
    rainy_season: "Rainy Season",
    weekday_special: "Weekday Special",
  };

  return (
    <AnimatedPressable
      style={[styles.seasonalCard, animatedStyle, { backgroundColor: theme.backgroundDefault }]}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      testID={`seasonal-card-${deal.id}`}
    >
      <View style={styles.seasonalCardContent}>
        <View style={styles.seasonalCardLeft}>
          <View style={[styles.vendorTypeBadge, { backgroundColor: `${theme.primary}15` }]}>
            <Feather
              name={vendorTypeIcon[deal.vendorType] as any || "tag"}
              size={11}
              color={theme.primary}
            />
            <ThemedText style={[styles.vendorTypeText, { color: theme.primary }]}>
              {deal.vendorType.charAt(0).toUpperCase() + deal.vendorType.slice(1)}
            </ThemedText>
          </View>
          <ThemedText style={styles.seasonalVendorName} numberOfLines={1}>
            {deal.vendorName}
          </ThemedText>
          <View style={[styles.seasonBadge, { backgroundColor: `${theme.accent}20` }]}>
            <ThemedText style={[styles.seasonBadgeText, { color: theme.accent }]}>
              {seasonLabels[deal.seasonType] || deal.seasonType}
            </ThemedText>
          </View>
        </View>
        <View style={styles.seasonalCardRight}>
          <ThemedText style={[styles.seasonalDiscount, { color: theme.accent }]}>
            {deal.discountPercent}%
          </ThemedText>
          <ThemedText style={[styles.seasonalDiscountLabel, { color: theme.accent }]}>
            OFF
          </ThemedText>
        </View>
      </View>
    </AnimatedPressable>
  );
}

function GroupTierCard({ groupSize, discount, color }: { groupSize: string; discount: number; color: string }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[styles.groupTierCard, animatedStyle]}
      onPressIn={() => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      testID={`group-tier-${groupSize}`}
    >
      <LinearGradient
        colors={[color, `${color}CC`]}
        style={styles.groupTierGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Feather name="users" size={24} color="#FFF" />
        <ThemedText style={styles.groupTierSize}>{groupSize}</ThemedText>
        <ThemedText style={styles.groupTierDiscount}>{discount}% OFF</ThemedText>
      </LinearGradient>
    </AnimatedPressable>
  );
}

function SectionHeader({ title, subtitle, icon }: { title: string; subtitle: string; icon: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconContainer, { backgroundColor: `${theme.accent}15` }]}>
        <Feather name={icon as any} size={20} color={theme.accent} />
      </View>
      <View style={styles.sectionTextContainer}>
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
        <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>{subtitle}</ThemedText>
      </View>
    </View>
  );
}

export default function DealsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const { data: deals = [], isLoading: dealsLoading, refetch: refetchDeals } = useQuery<FlashDeal[]>({
    queryKey: ["/api/deals"],
  });

  const { data: bundles = [], isLoading: bundlesLoading, refetch: refetchBundles } = useQuery<TripBundle[]>({
    queryKey: ["/api/bundles"],
  });

  const { data: lastMinuteDeals = [], isLoading: lastMinuteLoading, refetch: refetchLastMinute } = useQuery<FlashDeal[]>({
    queryKey: ["/api/deals/last-minute"],
  });

  const { data: earlyBirdDeals = [], isLoading: earlyBirdLoading, refetch: refetchEarlyBird } = useQuery<FlashDeal[]>({
    queryKey: ["/api/deals/early-bird"],
  });

  const { data: seasonalDeals = [], isLoading: seasonalLoading, refetch: refetchSeasonal } = useQuery<SeasonalDeal[]>({
    queryKey: ["/api/seasonal-deals"],
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchDeals(), refetchBundles(), refetchLastMinute(), refetchEarlyBird(), refetchSeasonal()]);
    setRefreshing(false);
  }, [refetchDeals, refetchBundles, refetchLastMinute, refetchEarlyBird, refetchSeasonal]);

  const isLoading = dealsLoading || bundlesLoading || lastMinuteLoading || earlyBirdLoading || seasonalLoading;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: Spacing.md,
        paddingBottom: tabBarHeight + Spacing.xl,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
      }
    >
      <View style={styles.heroSection}>
        <LinearGradient
          colors={isDark ? ["#1A4D2E", "#0D2617"] : ["#1A4D2E", "#2D6B45"]}
          style={styles.heroBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroIconRow}>
              <View style={styles.heroFireIcon}>
                <Feather name="trending-down" size={24} color="#DAA520" />
              </View>
            </View>
            <ThemedText style={styles.heroTitle}>Best Prices, Guaranteed</ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              Only 12% platform fee vs 17%+ on Airbnb and Booking.com. Save more on every booking.
            </ThemedText>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <ThemedText style={styles.heroStatValue}>12%</ThemedText>
                <ThemedText style={styles.heroStatLabel}>Our Fee</ThemedText>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <ThemedText style={styles.heroStatValue}>17%+</ThemedText>
                <ThemedText style={styles.heroStatLabel}>Competitors</ThemedText>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <ThemedText style={styles.heroStatValue}>30%</ThemedText>
                <ThemedText style={styles.heroStatLabel}>You Save</ThemedText>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading amazing deals...
          </ThemedText>
        </View>
      ) : (
        <>
          <View style={styles.comparisonSection}>
            <View style={[styles.comparisonCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.comparisonHeader}>
                <Feather name="shield" size={18} color={theme.primary} />
                <ThemedText style={[styles.comparisonHeaderText, { color: theme.primary }]}>
                  Why We're Cheaper
                </ThemedText>
              </View>
              <View style={styles.comparisonBars}>
                <View style={styles.comparisonRow}>
                  <ThemedText style={[styles.comparisonLabel, { color: theme.text }]}>Tripsbnb</ThemedText>
                  <View style={styles.comparisonBarWrap}>
                    <LinearGradient
                      colors={["#1A4D2E", "#2D6B45"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.comparisonBar, { width: "48%" }]}
                    >
                      <ThemedText style={styles.comparisonBarText}>12%</ThemedText>
                    </LinearGradient>
                  </View>
                </View>
                <View style={styles.comparisonRow}>
                  <ThemedText style={[styles.comparisonLabel, { color: theme.textSecondary }]}>Airbnb</ThemedText>
                  <View style={styles.comparisonBarWrap}>
                    <View style={[styles.comparisonBar, styles.competitorBar, { width: "69%" }]}>
                      <ThemedText style={styles.comparisonBarText}>17.2%</ThemedText>
                    </View>
                  </View>
                </View>
                <View style={styles.comparisonRow}>
                  <ThemedText style={[styles.comparisonLabel, { color: theme.textSecondary }]}>VRBO</ThemedText>
                  <View style={styles.comparisonBarWrap}>
                    <View style={[styles.comparisonBar, styles.competitorBar, { width: "68%" }]}>
                      <ThemedText style={styles.comparisonBarText}>17%</ThemedText>
                    </View>
                  </View>
                </View>
                <View style={styles.comparisonRow}>
                  <ThemedText style={[styles.comparisonLabel, { color: theme.textSecondary }]}>Booking.com</ThemedText>
                  <View style={styles.comparisonBarWrap}>
                    <View style={[styles.comparisonBar, styles.competitorBar, { width: "60%" }]}>
                      <ThemedText style={styles.comparisonBarText}>15%</ThemedText>
                    </View>
                  </View>
                </View>
              </View>
              <View style={[styles.comparisonFooter, { borderTopColor: theme.border }]}>
                <Feather name="check-circle" size={14} color="#27AE60" />
                <ThemedText style={[styles.comparisonFooterText, { color: theme.textSecondary }]}>
                  Save up to 30% on fees compared to other platforms
                </ThemedText>
              </View>
            </View>
          </View>

          <SectionHeader
            title="Flash Deals"
            subtitle="Limited-time offers ending soon"
            icon="zap"
          />

          {deals.length > 0 ? (
            <FlatList
              data={deals}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dealsListContent}
              snapToInterval={width * 0.72 + Spacing.md}
              decelerationRate="fast"
              renderItem={({ item }) => <FlashDealCard deal={item} />}
            />
          ) : (
            <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="clock" size={32} color={theme.textSecondary} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                No active deals right now. Check back soon
              </ThemedText>
            </View>
          )}

          <View style={styles.bundlesSection}>
            <SectionHeader
              title="Trip Bundles"
              subtitle="Complete packages, maximum savings"
              icon="package"
            />

            {bundles.length > 0 ? (
              <View style={styles.bundlesList}>
                {bundles.map((bundle) => (
                  <BundleCard key={bundle.id} bundle={bundle} />
                ))}
              </View>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="package" size={32} color={theme.textSecondary} />
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No bundles available at the moment.
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.lastMinuteSection}>
            <SectionHeader
              title="Last-Minute Steals"
              subtitle="Expiring within 48 hours - grab them now!"
              icon="clock"
            />

            {lastMinuteDeals.length > 0 ? (
              <FlatList
                data={lastMinuteDeals}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dealsListContent}
                snapToInterval={width * 0.72 + Spacing.md}
                decelerationRate="fast"
                renderItem={({ item }) => <FlashDealCard deal={item} />}
              />
            ) : (
              <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="clock" size={32} color={theme.textSecondary} />
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No last-minute deals available right now.
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.earlyBirdSection}>
            <SectionHeader
              title="Early Bird Savings"
              subtitle="Book ahead and save big!"
              icon="sunrise"
            />

            {earlyBirdDeals.length > 0 ? (
              <FlatList
                data={earlyBirdDeals}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dealsListContent}
                snapToInterval={width * 0.72 + Spacing.md}
                decelerationRate="fast"
                renderItem={({ item }) => <FlashDealCard deal={item} />}
              />
            ) : (
              <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="sunrise" size={32} color={theme.textSecondary} />
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No early bird deals available right now.
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.seasonalSection}>
            <SectionHeader
              title="Off-Peak Specials"
              subtitle="Best prices during quiet seasons"
              icon="cloud"
            />

            {seasonalDeals.length > 0 ? (
              <View style={styles.seasonalList}>
                {seasonalDeals.map((deal) => (
                  <SeasonalDealCard key={deal.id} deal={deal} />
                ))}
              </View>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="cloud" size={32} color={theme.textSecondary} />
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No seasonal deals available right now.
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.groupSection}>
            <SectionHeader
              title="Group Discounts"
              subtitle="Travel together, save together!"
              icon="users"
            />

            <View style={styles.groupTiersRow}>
              <GroupTierCard groupSize="2-4" discount={10} color="#1A4D2E" />
              <GroupTierCard groupSize="5-9" discount={15} color="#2D6B45" />
              <GroupTierCard groupSize="10+" discount={20} color="#DAA520" />
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  heroBanner: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    ...Shadows.card,
  },
  heroContent: {
    padding: Spacing["2xl"],
    paddingVertical: Spacing["3xl"],
  },
  heroIconRow: {
    marginBottom: Spacing.md,
  },
  heroFireIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(218,165,32,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: "CormorantGaramond_700Bold",
    color: "#FFFFFF",
    marginBottom: Spacing.sm,
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["6xl"],
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTextContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: "CormorantGaramond_700Bold",
    letterSpacing: 0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  dealsListContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  dealCard: {
    width: width * 0.72,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    ...Shadows.card,
  },
  dealImage: {
    height: 140,
  },
  dealGradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: Spacing.md,
  },
  dealImageContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  timerUrgent: {
    backgroundColor: "rgba(255,59,48,0.85)",
  },
  timerText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
  discountBadge: {
    backgroundColor: "#DAA520",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  discountText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  dealContent: {
    padding: Spacing.md,
    gap: 6,
  },
  dealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vendorTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  vendorTypeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  locationText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  dealTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  dealVendor: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  priceGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  originalPrice: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textDecorationLine: "line-through",
  },
  dealPrice: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  spotsBadge: {
    backgroundColor: "rgba(218,165,32,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  spotsUrgent: {
    backgroundColor: "rgba(255,59,48,0.15)",
  },
  spotsText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#DAA520",
  },
  bundlesSection: {
    marginTop: Spacing["3xl"],
  },
  bundlesList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  bundleCard: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    ...Shadows.card,
  },
  bundleImage: {
    height: 260,
  },
  bundleGradient: {
    flex: 1,
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(218,165,32,0.85)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  featuredText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
  bundleBottomContent: {
    gap: 6,
  },
  bundleSavingsBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#34C759",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: 4,
  },
  bundleSavingsText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  bundleName: {
    fontSize: 20,
    fontFamily: "CormorantGaramond_700Bold",
    color: "#FFF",
    letterSpacing: 0.2,
  },
  bundleLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bundleLocation: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.9)",
  },
  bundleDurationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bundleDuration: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  bundleIncludesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  includeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  includeChipText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "#FFF",
  },
  bundlePriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 4,
  },
  bundleOriginalPrice: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    textDecorationLine: "line-through",
  },
  bundlePrice: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#DAA520",
  },
  bundlePerPerson: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  emptyState: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing["3xl"],
    alignItems: "center",
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  lastMinuteSection: {
    marginTop: Spacing["3xl"],
  },
  earlyBirdSection: {
    marginTop: Spacing["3xl"],
  },
  seasonalSection: {
    marginTop: Spacing["3xl"],
  },
  seasonalList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  seasonalCard: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    ...Shadows.tile,
  },
  seasonalCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  seasonalCardLeft: {
    flex: 1,
    gap: 6,
  },
  seasonalVendorName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  seasonBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  seasonBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  seasonalCardRight: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.md,
  },
  seasonalDiscount: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  seasonalDiscountLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  groupSection: {
    marginTop: Spacing["3xl"],
  },
  groupTiersRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  groupTierCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    ...Shadows.tile,
  },
  groupTierGradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["2xl"],
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  groupTierSize: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
    marginTop: Spacing.xs,
  },
  groupTierDiscount: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xl,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  heroStat: {
    flex: 1,
    alignItems: "center",
  },
  heroStatValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#DAA520",
  },
  heroStatLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  comparisonSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  comparisonCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  comparisonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  comparisonHeaderText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  comparisonBars: {
    gap: Spacing.md,
  },
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  comparisonLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    width: 80,
  },
  comparisonBarWrap: {
    flex: 1,
    height: 28,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  comparisonBar: {
    height: "100%",
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  competitorBar: {
    backgroundColor: "rgba(200,60,60,0.7)",
  },
  comparisonBarText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  comparisonFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  comparisonFooterText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
});
