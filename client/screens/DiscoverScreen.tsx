import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { StyleSheet, View, ScrollView, Dimensions, Pressable, ActivityIndicator, Platform, Linking, ImageBackground, Image } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import * as Location from "expo-location";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { SearchBar } from "@/components/SearchBar";
import { FeaturedCard } from "@/components/FeaturedCard";
import { DestinationCard, Destination } from "@/components/DestinationCard";
import { QuickActionButton } from "@/components/QuickActionButton";
import { ExperienceCard, Experience } from "@/components/ExperienceCard";
import { FilterModal, FilterState, FilterCategory } from "@/components/FilterModal";
import { useTheme } from "@/hooks/useTheme";
import { useLocation } from "@/hooks/useLocation";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get("window");

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const FEATURED_EXPERIENCES = [
  {
    titleKey: "featured.northernLights",
    subtitleKey: "featured.northernLightsDesc",
    image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200",
    badgeKey: "badges.topRated",
    searchTerms: "iceland northern lights aurora",
  },
  {
    titleKey: "featured.safariKenya",
    subtitleKey: "featured.safariKenyaDesc",
    image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200",
    badgeKey: "badges.popular",
    searchTerms: "kenya safari africa wildlife",
  },
  {
    titleKey: "featured.tropicalBali",
    subtitleKey: "featured.tropicalBaliDesc",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200",
    badgeKey: "badges.trending",
    searchTerms: "bali indonesia tropical beach",
  },
  {
    titleKey: "featured.swissAlps",
    subtitleKey: "featured.swissAlpsDesc",
    image: "https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=1200",
    badgeKey: "badges.featured",
    searchTerms: "switzerland alps mountains skiing",
  },
  {
    titleKey: "featured.tokyoExperience",
    subtitleKey: "featured.tokyoExperienceDesc",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200",
    badgeKey: "badges.mustVisit",
    searchTerms: "tokyo japan city culture",
  },
  {
    titleKey: "featured.serengetiSafari",
    subtitleKey: "featured.serengetiSafariDesc",
    image: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1200",
    badgeKey: "badges.adventure",
    searchTerms: "serengeti tanzania safari wildlife",
  },
];

const FEATURED_DESTINATIONS: Destination[] = [
  {
    id: "1",
    name: "Santorini",
    country: "Greece",
    image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800",
    rating: 4.9,
    price: "From $380",
  },
  {
    id: "2",
    name: "Kyoto",
    country: "Japan",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800",
    rating: 4.9,
    price: "From $420",
  },
  {
    id: "3",
    name: "Machu Picchu",
    country: "Peru",
    image: "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800",
    rating: 4.8,
    price: "From $350",
  },
  {
    id: "4",
    name: "Maldives",
    country: "Indian Ocean",
    image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800",
    rating: 4.9,
    price: "From $550",
  },
];

const ALL_EXPERIENCES: Experience[] = [
  {
    id: "exp-1",
    title: "Local City Walking Tour",
    description: "Discover hidden gems and local favorites with an expert guide",
    price: 45,
    duration: "3 hours",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=800",
    verified: true,
    category: "companion",
  },
  {
    id: "exp-2",
    title: "Farm-to-Table Dining",
    description: "Authentic local cuisine prepared with fresh ingredients",
    price: 75,
    duration: "2 hours",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",
    verified: true,
    category: "dining",
  },
  {
    id: "exp-3",
    title: "Sunset Nature Hike",
    description: "Experience breathtaking views on a guided nature trail",
    price: 35,
    duration: "2.5 hours",
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800",
    verified: false,
    category: "safari",
  },
  {
    id: "exp-4",
    title: "Safari Game Drive",
    description: "Spot the Big Five on an unforgettable wildlife adventure",
    price: 250,
    duration: "Full day",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800",
    verified: true,
    category: "safari",
  },
  {
    id: "exp-5",
    title: "Fine Dining Experience",
    description: "Michelin-star quality cuisine in an elegant setting",
    price: 180,
    duration: "3 hours",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
    verified: true,
    category: "dining",
  },
  {
    id: "exp-6",
    title: "Private Tour Guide",
    description: "Personalized exploration with a knowledgeable local guide",
    price: 120,
    duration: "6 hours",
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800",
    verified: true,
    category: "companion",
  },
];

type ViewMode = "nearMe" | "worldwide";

const DEFAULT_FILTERS: FilterState = {
  category: "all",
  priceRange: "all",
  rating: "all",
  verifiedOnly: false,
};

function LocationToggle({
  mode,
  onModeChange,
  locationCity,
}: {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  locationCity?: string;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.toggleContainer, { backgroundColor: theme.backgroundDefault }]}>
      <Pressable
        style={[
          styles.toggleButton,
          mode === "nearMe" && { backgroundColor: theme.primary },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onModeChange("nearMe");
        }}
      >
        <Feather
          name="map-pin"
          size={14}
          color={mode === "nearMe" ? "#FFFFFF" : theme.textSecondary}
        />
        <ThemedText
          type="label"
          style={[
            styles.toggleText,
            { color: mode === "nearMe" ? "#FFFFFF" : theme.textSecondary },
          ]}
        >
          {locationCity || t("discover.nearMe")}
        </ThemedText>
      </Pressable>
      <Pressable
        style={[
          styles.toggleButton,
          mode === "worldwide" && { backgroundColor: theme.primary },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onModeChange("worldwide");
        }}
      >
        <Feather
          name="globe"
          size={14}
          color={mode === "worldwide" ? "#FFFFFF" : theme.textSecondary}
        />
        <ThemedText
          type="label"
          style={[
            styles.toggleText,
            { color: mode === "worldwide" ? "#FFFFFF" : theme.textSecondary },
          ]}
        >
          {t("discover.worldwide")}
        </ThemedText>
      </Pressable>
    </View>
  );
}

function EnableLocationCard({
  onEnable,
  loading,
  denied,
}: {
  onEnable: () => void;
  loading: boolean;
  denied: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
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

  const handlePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (denied && Platform.OS !== "web") {
      try {
        await Linking.openSettings();
      } catch (error) {
        console.log("Could not open settings");
      }
    } else {
      onEnable();
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.enableLocationCard, animatedStyle]}
      disabled={loading}
    >
      <LinearGradient
        colors={[theme.primary, "#2D6A4F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.enableLocationGradient}
      >
        <View style={styles.enableLocationIcon}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="map-pin" size={24} color="#FFFFFF" />
          )}
        </View>
        <View style={styles.enableLocationContent}>
          <ThemedText type="h4" style={styles.enableLocationTitle}>
            {denied ? t("discover.locationDenied") : t("discover.enableLocation")}
          </ThemedText>
          <ThemedText type="small" style={styles.enableLocationDesc}>
            {t("discover.enableLocationDesc")}
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
      </LinearGradient>
    </AnimatedPressable>
  );
}

function NoResultsCard() {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.noResultsCard, { backgroundColor: theme.backgroundSecondary }]}>
      <Feather name="search" size={48} color={theme.textSecondary} />
      <ThemedText type="h4" style={styles.noResultsTitle}>
        {t("filters.noResults")}
      </ThemedText>
      <ThemedText type="body" style={[styles.noResultsDesc, { color: theme.textSecondary }]}>
        {t("filters.noResultsDesc")}
      </ThemedText>
    </View>
  );
}

function ActiveFiltersIndicator({ count, onPress }: { count: number; onPress: () => void }) {
  const { theme } = useTheme();

  if (count === 0) return null;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.activeFiltersIndicator, { backgroundColor: theme.accent }]}
    >
      <ThemedText type="caption" style={styles.activeFiltersText}>
        {count}
      </ThemedText>
    </Pressable>
  );
}

const adventureVideoSource = require("../../assets/videos/adventure-clip.mp4");

type GlobeSlide = { type: "image"; url: string } | { type: "video" };

const ADVENTURE_SLIDES: GlobeSlide[] = [
  { type: "image", url: "https://images.unsplash.com/photo-1516426122078-c23e76b4934c?w=300&h=300&fit=crop" },
  { type: "image", url: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=300&h=300&fit=crop" },
  { type: "image", url: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=300&h=300&fit=crop" },
  { type: "video" },
  { type: "image", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=300&h=300&fit=crop" },
  { type: "image", url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=300&h=300&fit=crop" },
  { type: "image", url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=300&h=300&fit=crop" },
  { type: "video" },
  { type: "image", url: "https://images.unsplash.com/photo-1528127269322-539801943592?w=300&h=300&fit=crop" },
  { type: "image", url: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=300&h=300&fit=crop" },
];

const GLOBE_SIZE = 140;
const SLIDE_WIDTH = GLOBE_SIZE;

function GlobeVideoSlide({ size }: { size: number }) {
  const player = useVideoPlayer(adventureVideoSource, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={{ width: size, height: size }}
      nativeControls={false}
      contentFit="cover"
    />
  );
}

function AdventureGlobe() {
  const translateX = useSharedValue(0);
  const totalWidth = ADVENTURE_SLIDES.length * SLIDE_WIDTH;

  useEffect(() => {
    translateX.value = 0;
    translateX.value = withRepeat(
      withTiming(-totalWidth, {
        duration: ADVENTURE_SLIDES.length * 3000,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(translateX);
    };
  }, []);

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const slides = [...ADVENTURE_SLIDES, ...ADVENTURE_SLIDES, ...ADVENTURE_SLIDES];

  return (
    <View style={globeStyles.container}>
      <View style={globeStyles.outerRing}>
        <View style={globeStyles.innerRing}>
          <View style={globeStyles.globeClip}>
            <Animated.View style={[globeStyles.slideStrip, stripStyle]}>
              {slides.map((slide, i) =>
                slide.type === "video" ? (
                  <GlobeVideoSlide key={`slide-${i}`} size={GLOBE_SIZE} />
                ) : (
                  <Image
                    key={`slide-${i}`}
                    source={{ uri: slide.url }}
                    style={globeStyles.slideImage}
                    resizeMode="cover"
                  />
                )
              )}
            </Animated.View>
            <LinearGradient
              colors={["rgba(26,77,46,0.4)", "transparent", "rgba(26,77,46,0.4)"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={globeStyles.sideGradient}
              pointerEvents="none"
            />
            <View style={globeStyles.globeOverlay} pointerEvents="none">
              <View style={globeStyles.meridian1} />
              <View style={globeStyles.meridian2} />
              <View style={globeStyles.equator} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const globeStyles = StyleSheet.create({
  container: {
    position: "absolute",
    right: -10,
    top: "50%",
    marginTop: -(GLOBE_SIZE + 16) / 2,
    zIndex: 0,
  },
  outerRing: {
    width: GLOBE_SIZE + 16,
    height: GLOBE_SIZE + 16,
    borderRadius: (GLOBE_SIZE + 16) / 2,
    borderWidth: 1.5,
    borderColor: "rgba(218,165,32,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  innerRing: {
    width: GLOBE_SIZE + 6,
    height: GLOBE_SIZE + 6,
    borderRadius: (GLOBE_SIZE + 6) / 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  globeClip: {
    width: GLOBE_SIZE,
    height: GLOBE_SIZE,
    borderRadius: GLOBE_SIZE / 2,
    overflow: "hidden",
    position: "relative",
  },
  slideStrip: {
    flexDirection: "row",
    height: GLOBE_SIZE,
    position: "absolute",
    left: 0,
    top: 0,
  },
  slideImage: {
    width: SLIDE_WIDTH,
    height: GLOBE_SIZE,
  },
  sideGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  globeOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  meridian1: {
    position: "absolute",
    width: GLOBE_SIZE * 0.5,
    height: GLOBE_SIZE - 4,
    borderRadius: (GLOBE_SIZE * 0.5) / 2,
    borderWidth: 0.8,
    borderColor: "rgba(255,255,255,0.12)",
  },
  meridian2: {
    position: "absolute",
    width: GLOBE_SIZE * 0.8,
    height: GLOBE_SIZE - 4,
    borderRadius: (GLOBE_SIZE * 0.8) / 2,
    borderWidth: 0.8,
    borderColor: "rgba(255,255,255,0.08)",
  },
  equator: {
    position: "absolute",
    width: GLOBE_SIZE - 4,
    height: 0,
    borderTopWidth: 0.8,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
});

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>("worldwide");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const {
    location,
    loading: locationLoading,
    permissionStatus,
    requestPermission,
  } = useLocation();

  const hasLocationPermission = permissionStatus === Location.PermissionStatus.GRANTED;
  const locationDenied = permissionStatus === Location.PermissionStatus.DENIED;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category !== "all") count++;
    if (filters.priceRange !== "all") count++;
    if (filters.rating !== "all") count++;
    if (filters.verifiedOnly) count++;
    return count;
  }, [filters]);

  const filteredDestinations = useMemo(() => {
    let results = [...FEATURED_DESTINATIONS];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.country.toLowerCase().includes(query)
      );
    }

    if (filters.rating === "4plus") {
      results = results.filter((d) => d.rating >= 4.0);
    } else if (filters.rating === "4.5plus") {
      results = results.filter((d) => d.rating >= 4.5);
    }

    return results;
  }, [searchQuery, filters]);

  const filteredExperiences = useMemo(() => {
    let results = [...ALL_EXPERIENCES];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.description.toLowerCase().includes(query)
      );
    }

    if (filters.category !== "all") {
      const categoryMap: Record<FilterCategory, Experience["category"] | null> = {
        all: null,
        stays: null,
        safaris: "safari",
        dining: "dining",
        companions: "companion",
        guides: "companion",
      };
      const mappedCategory = categoryMap[filters.category];
      if (mappedCategory) {
        results = results.filter((e) => e.category === mappedCategory);
      }
    }

    if (filters.priceRange === "budget") {
      results = results.filter((e) => e.price <= 50);
    } else if (filters.priceRange === "mid") {
      results = results.filter((e) => e.price > 50 && e.price <= 150);
    } else if (filters.priceRange === "luxury") {
      results = results.filter((e) => e.price > 150);
    }

    if (filters.rating === "4plus") {
      results = results.filter((e) => e.rating >= 4.0);
    } else if (filters.rating === "4.5plus") {
      results = results.filter((e) => e.rating >= 4.5);
    }

    if (filters.verifiedOnly) {
      results = results.filter((e) => e.verified);
    }

    return results;
  }, [searchQuery, filters]);

  const filteredFeaturedExperiences = useMemo(() => {
    if (!searchQuery.trim()) return FEATURED_EXPERIENCES;

    const query = searchQuery.toLowerCase();
    return FEATURED_EXPERIENCES.filter(
      (exp) =>
        exp.searchTerms.includes(query) ||
        t(exp.titleKey).toLowerCase().includes(query)
    );
  }, [searchQuery, t]);

  const randomExperience = useMemo(() => {
    if (filteredFeaturedExperiences.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * filteredFeaturedExperiences.length);
    return filteredFeaturedExperiences[randomIndex];
  }, [filteredFeaturedExperiences]);

  const handleEnableLocation = async () => {
    const granted = await requestPermission();
    if (granted) {
      setViewMode("nearMe");
    }
  };

  const hasResults =
    filteredDestinations.length > 0 ||
    filteredExperiences.length > 0 ||
    (randomExperience !== null);

  const isSearching = searchQuery.trim().length > 0 || activeFilterCount > 0;

  const quickActions = [
    {
      icon: "home" as const,
      emoji: "\u{1F3E8}",
      label: t("quickActions.stays"),
      secondaryLabel: t("quickActions.staysSubtitle"),
      gradientColors: ["#1A4D2E", "#2D6A4F"],
      imageUrl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=200",
      onPress: () => navigation.navigate("Main", { screen: "StaysTab" } as any),
    },
    {
      icon: "compass" as const,
      emoji: "\u{1F981}",
      label: t("quickActions.gameSafaris"),
      secondaryLabel: t("quickActions.safarisSubtitle"),
      gradientColors: ["#DAA520", "#B8860B"],
      imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200",
      onPress: () => navigation.navigate("Main", { screen: "ExperiencesTab" } as any),
    },
    {
      icon: "sunrise" as const,
      emoji: "\u{1F3D4}\uFE0F",
      label: t("quickActions.adventures"),
      gradientColors: ["#E67E22", "#D35400"],
      imageUrl: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=200",
      onPress: () => navigation.navigate("Main", { screen: "ExperiencesTab" } as any),
    },
    {
      icon: "users" as const,
      emoji: "\u{1F46B}",
      label: t("quickActions.companions"),
      gradientColors: ["#9B59B6", "#8E44AD"],
      imageUrl: "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=200",
      onPress: () => navigation.navigate("Main", { screen: "ExperiencesTab" } as any),
    },
    {
      icon: "map-pin" as const,
      emoji: "\u{1F9ED}",
      label: t("quickActions.guides"),
      gradientColors: ["#3498DB", "#2980B9"],
      imageUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200",
      onPress: () => navigation.navigate("Main", { screen: "ExperiencesTab" } as any),
    },
    {
      icon: "coffee" as const,
      emoji: "\u{1F37D}\uFE0F",
      label: t("quickActions.restaurants"),
      gradientColors: ["#E74C3C", "#C0392B"],
      imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200",
      onPress: () => navigation.navigate("Main", { screen: "ExperiencesTab" } as any),
    },
    {
      icon: "truck" as const,
      emoji: "\u{1F697}",
      label: "Car Hire",
      gradientColors: ["#2C3E50", "#34495E"],
      imageUrl: "https://images.unsplash.com/photo-1449965408869-ebd13bc9e5a8?w=200",
      onPress: () => navigation.navigate("CarHire" as any),
    },
    {
      icon: "mic" as const,
      emoji: "\u{1F399}\uFE0F",
      label: "Trip Listener",
      gradientColors: ["#DAA520", "#B8860B"],
      imageUrl: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=200",
      onPress: () => navigation.navigate("TripListener" as any),
    },
    {
      icon: "navigation" as const,
      emoji: "\u2708\uFE0F",
      label: "Flight Status",
      gradientColors: ["#0077B6", "#00B4D8"],
      imageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=200",
      onPress: () => navigation.navigate("FlightStatus" as any),
    },
    {
      icon: "briefcase" as const,
      emoji: "",
      label: "Travel Toolkit",
      gradientColors: ["#1A4D2E", "#2D6A4F"],
      imageUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200",
      onPress: () => navigation.navigate("TravelToolkit" as any),
    },
  ];

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={{
          paddingTop: Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <LinearGradient
            colors={isDark ? ["#1A4D2E", "#0F2D1A"] : ["#1A4D2E", "#2D6A4F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <ThemedText type="caption" style={styles.heroLabel}>
                {t("discover.heroLabel")}
              </ThemedText>
              <ThemedText type="hero" style={styles.heroTitle}>
                {t("discover.heroTitle")}
              </ThemedText>
              <ThemedText type="body" style={styles.heroSubtitle}>
                {t("discover.heroSubtitle")}
              </ThemedText>
              {location?.city ? (
                <View style={styles.locationBadge}>
                  <Feather name="map-pin" size={12} color="#DAA520" />
                  <ThemedText type="caption" style={styles.locationText}>
                    {location.city}{location.country ? `, ${location.country}` : ""}
                  </ThemedText>
                </View>
              ) : null}
            </View>
            <AdventureGlobe />
          </LinearGradient>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchWrapper}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t("discover.searchPlaceholder")}
              onFilterPress={() => setFilterModalVisible(true)}
            />
            {activeFilterCount > 0 ? (
              <View style={[styles.filterBadge, { backgroundColor: theme.accent }]}>
                <ThemedText type="caption" style={styles.filterBadgeText}>
                  {activeFilterCount}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.toggleSection}>
          <LocationToggle
            mode={viewMode}
            onModeChange={setViewMode}
            locationCity={location?.city}
          />
        </View>

        {!hasResults && isSearching ? (
          <NoResultsCard />
        ) : (
          <>
            {viewMode === "nearMe" ? (
              <>
                {!hasLocationPermission ? (
                  <View style={styles.section}>
                    <EnableLocationCard
                      onEnable={handleEnableLocation}
                      loading={locationLoading}
                      denied={locationDenied}
                    />
                  </View>
                ) : filteredExperiences.length > 0 ? (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <ThemedText type="h2">📍 {t("discover.nearYou")}</ThemedText>
                      <ThemedText type="link" style={{ color: theme.accent }}>
                        {t("common.viewAll")}
                      </ThemedText>
                    </View>
                    {filteredExperiences.slice(0, 3).map((experience) => (
                      <View key={experience.id} style={styles.experienceCardContainer}>
                        <ExperienceCard experience={experience} onPress={() => {}} />
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}

            {!isSearching ? (
              <View style={styles.quickActionsSection}>
                {quickActions.map((action) => (
                  <QuickActionButton key={action.label} {...action} />
                ))}
              </View>
            ) : null}

            {!isSearching ? (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate("MainTabs" as any, { screen: "DealsTab" });
                }}
                style={styles.dealsBannerContainer}
                testID="deals-banner"
              >
                <LinearGradient
                  colors={["#1A4D2E", "#2D6B45"]}
                  style={styles.dealsBanner}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.dealsBannerContent}>
                    <View style={styles.dealsBannerIcon}>
                      <Feather name="zap" size={20} color="#DAA520" />
                    </View>
                    <View style={styles.dealsBannerTextContainer}>
                      <ThemedText style={styles.dealsBannerTitle}>Flash Deals & Trip Bundles</ThemedText>
                      <ThemedText style={styles.dealsBannerSubtitle}>Save up to 46% on amazing travel experiences</ThemedText>
                    </View>
                    <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
                  </View>
                </LinearGradient>
              </Pressable>
            ) : null}

            {randomExperience ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="h2">⭐ {t("discover.featuredExperience")}</ThemedText>
                </View>
                <View style={styles.featuredContainer}>
                  <FeaturedCard
                    title={t(randomExperience.titleKey)}
                    subtitle={t(randomExperience.subtitleKey)}
                    image={randomExperience.image}
                    badge={t(randomExperience.badgeKey)}
                    onPress={() => {}}
                  />
                </View>
              </View>
            ) : null}

            {filteredDestinations.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="h2">{t("discover.popularDestinations")}</ThemedText>
                  <ThemedText type="link" style={{ color: theme.accent }}>
                    {t("common.viewAll")}
                  </ThemedText>
                </View>
                <View style={styles.destinationsGrid}>
                  {filteredDestinations.map((destination, index) => (
                    <DestinationCard
                      key={destination.id}
                      destination={destination}
                      size={index === 0 && filteredDestinations.length > 1 ? "large" : "small"}
                      onPress={() => {}}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {isSearching && filteredExperiences.length > 0 && viewMode === "worldwide" ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="h2">{t("experiences.title")}</ThemedText>
                  <ThemedText type="link" style={{ color: theme.accent }}>
                    {t("common.viewAll")}
                  </ThemedText>
                </View>
                {filteredExperiences.map((experience) => (
                  <View key={experience.id} style={styles.experienceCardContainer}>
                    <ExperienceCard experience={experience} onPress={() => {}} />
                  </View>
                ))}
              </View>
            ) : null}

            {!isSearching ? (
              <>
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <ThemedText type="h2">Why Tripsbnb?</ThemedText>
                  </View>
                  <View style={styles.whySection}>
                    <View style={[styles.whyCard, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
                      <LinearGradient
                        colors={["#1A4D2E", "#2D6B45"]}
                        style={styles.whyIconBg}
                      >
                        <Feather name="trending-down" size={20} color="#FFF" />
                      </LinearGradient>
                      <View style={styles.whyContent}>
                        <ThemedText style={styles.whyTitle}>Lowest Fees in Travel</ThemedText>
                        <ThemedText style={styles.whyDesc}>Only 12% total fee. Save up to 30% on fees vs Airbnb, VRBO, and Booking.com</ThemedText>
                      </View>
                    </View>
                    <View style={[styles.whyCard, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
                      <LinearGradient
                        colors={["#DAA520", "#B8860B"]}
                        style={styles.whyIconBg}
                      >
                        <Feather name="package" size={20} color="#FFF" />
                      </LinearGradient>
                      <View style={styles.whyContent}>
                        <ThemedText style={styles.whyTitle}>Bundle & Save 20%</ThemedText>
                        <ThemedText style={styles.whyDesc}>Book stays + experiences together</ThemedText>
                      </View>
                    </View>
                    <View style={[styles.whyCard, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
                      <LinearGradient
                        colors={["#9B59B6", "#8E44AD"]}
                        style={styles.whyIconBg}
                      >
                        <Feather name="award" size={20} color="#FFF" />
                      </LinearGradient>
                      <View style={styles.whyContent}>
                        <ThemedText style={styles.whyTitle}>Loyalty Rewards</ThemedText>
                        <ThemedText style={styles.whyDesc}>Earn points, unlock up to 8% discount</ThemedText>
                      </View>
                    </View>
                    <View style={[styles.whyCard, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
                      <LinearGradient
                        colors={["#E74C3C", "#C0392B"]}
                        style={styles.whyIconBg}
                      >
                        <Feather name="users" size={20} color="#FFF" />
                      </LinearGradient>
                      <View style={styles.whyContent}>
                        <ThemedText style={styles.whyTitle}>Refer & Earn 500pts</ThemedText>
                        <ThemedText style={styles.whyDesc}>Invite friends, both get rewarded</ThemedText>
                      </View>
                    </View>
                    <View style={[styles.whyCard, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
                      <LinearGradient
                        colors={["#3498DB", "#2980B9"]}
                        style={styles.whyIconBg}
                      >
                        <Feather name="globe" size={20} color="#FFF" />
                      </LinearGradient>
                      <View style={styles.whyContent}>
                        <ThemedText style={styles.whyTitle}>All-in-One Platform</ThemedText>
                        <ThemedText style={styles.whyDesc}>Stays, safaris, dining, guides in one app</ThemedText>
                      </View>
                    </View>
                    <View style={[styles.whyCard, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
                      <LinearGradient
                        colors={["#1A4D2E", "#0D2617"]}
                        style={styles.whyIconBg}
                      >
                        <Feather name="check-circle" size={20} color="#DAA520" />
                      </LinearGradient>
                      <View style={styles.whyContent}>
                        <ThemedText style={styles.whyTitle}>Best Price Promise</ThemedText>
                        <ThemedText style={styles.whyDesc}>Exclusive flash deals, group discounts up to 20%, and early-bird savings every day</ThemedText>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.section}>
                  <View style={[styles.trustCard, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
                    <LinearGradient
                      colors={["#1A4D2E15", "#1A4D2E05"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.trustGradient}
                    >
                      <View style={[styles.trustIcon, { backgroundColor: theme.primary }]}>
                        <Feather name="shield" size={24} color="#FFFFFF" />
                      </View>
                      <View style={styles.trustContent}>
                        <ThemedText type="h4">{t("discover.protectedBy")}</ThemedText>
                        <ThemedText type="small" style={styles.trustText}>
                          {t("discover.protectedDescription")}
                        </ThemedText>
                      </View>
                      <View style={styles.trustBadges}>
                        <View style={styles.trustBadge}>
                          <Feather name="check-circle" size={16} color={theme.success} />
                          <ThemedText type="caption">{t("discover.verifiedHosts")}</ThemedText>
                        </View>
                        <View style={styles.trustBadge}>
                          <Feather name="lock" size={16} color={theme.accent} />
                          <ThemedText type="caption">{t("discover.securePayments")}</ThemedText>
                        </View>
                      </View>
                    </LinearGradient>
                  </View>
                </View>
              </>
            ) : null}
          </>
        )}

        <View style={styles.poweredByFooter}>
          <ThemedText type="caption" style={styles.poweredByText}>
            Powered by TripVerse
          </ThemedText>
        </View>
      </ScrollView>

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        onApply={setFilters}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  heroGradient: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    minHeight: 200,
    position: "relative",
  },
  heroContent: {
    padding: Spacing.xl,
    zIndex: 1,
  },
  heroLabel: {
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 2,
    marginBottom: Spacing.sm,
    fontWeight: "600",
  },
  heroTitle: {
    color: "#FFFFFF",
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.85)",
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  locationText: {
    color: "#DAA520",
    fontWeight: "600",
  },
  searchSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchWrapper: {
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  toggleSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  toggleContainer: {
    flexDirection: "row",
    borderRadius: BorderRadius.full,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  toggleText: {
    fontWeight: "600",
  },
  enableLocationCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  enableLocationGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  enableLocationIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  enableLocationContent: {
    flex: 1,
  },
  enableLocationTitle: {
    color: "#FFFFFF",
    marginBottom: 2,
  },
  enableLocationDesc: {
    color: "rgba(255,255,255,0.8)",
  },
  noResultsCard: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing["2xl"],
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    gap: Spacing.md,
  },
  noResultsTitle: {
    textAlign: "center",
  },
  noResultsDesc: {
    textAlign: "center",
  },
  activeFiltersIndicator: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  activeFiltersText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  quickActionsSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  dealsBannerContainer: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    ...Shadows.card,
  },
  dealsBanner: {
    borderRadius: BorderRadius.lg,
  },
  dealsBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  dealsBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(218,165,32,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  dealsBannerTextContainer: {
    flex: 1,
  },
  dealsBannerTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  dealsBannerSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  featuredContainer: {
    paddingHorizontal: Spacing.lg,
  },
  experienceCardContainer: {
    paddingHorizontal: Spacing.lg,
  },
  destinationsGrid: {
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.lg,
  },
  whySection: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  whyCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  whyIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  whyContent: {
    flex: 1,
  },
  whyTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  whyDesc: {
    fontSize: 12,
    opacity: 0.7,
  },
  trustCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  trustGradient: {
    padding: Spacing.xl,
  },
  trustIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  trustContent: {
    marginBottom: Spacing.lg,
  },
  trustText: {
    marginTop: Spacing.xs,
    opacity: 0.7,
  },
  trustBadges: {
    flexDirection: "row",
    gap: Spacing.xl,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  poweredByFooter: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    paddingBottom: Spacing["3xl"],
  },
  poweredByText: {
    opacity: 0.4,
    fontStyle: "italic",
  },
});
