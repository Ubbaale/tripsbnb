import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";

interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  cuisineType: string;
  priceRange: string;
  imageUrl: string | null;
  address: string;
  city: string;
  country: string;
  verified: boolean;
  averageRating: string;
  totalRatings: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function RestaurantCard({
  restaurant,
  onPress,
}: {
  restaurant: Restaurant;
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

  const rating = parseFloat(restaurant.averageRating) || 0;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.cardContainer, animatedStyle]}
    >
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
        <View style={styles.cardImage}>
          {restaurant.imageUrl ? (
            <Image source={{ uri: restaurant.imageUrl }} style={styles.cardImagePhoto} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={["#1A4D2E", "#2D6A4F"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.imagePlaceholder}
            >
              <Feather name="coffee" size={32} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          )}
          {restaurant.verified ? (
            <View style={[styles.verifiedBadge, { backgroundColor: theme.accent }]}>
              <Feather name="check" size={10} color="#FFFFFF" />
            </View>
          ) : null}
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <ThemedText type="h4" numberOfLines={1} style={styles.cardTitle}>
              {restaurant.name}
            </ThemedText>
            <View style={styles.ratingBadge}>
              <Feather name="star" size={12} color={theme.accent} />
              <ThemedText type="caption" style={{ color: theme.accent }}>
                {rating > 0 ? rating.toFixed(1) : "New"}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="caption" style={styles.cuisineText}>
            {restaurant.cuisineType} • {restaurant.priceRange}
          </ThemedText>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={12} color={theme.textSecondary} />
            <ThemedText type="small" style={styles.locationText} numberOfLines={1}>
              {restaurant.city}, {restaurant.country}
            </ThemedText>
          </View>
          {restaurant.totalRatings > 0 ? (
            <ThemedText type="caption" style={styles.reviewsText}>
              {restaurant.totalRatings} review{restaurant.totalRatings !== 1 ? "s" : ""}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.arrowContainer}>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </View>
    </AnimatedPressable>
  );
}

export function RestaurantsListScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { country, city } = route.params || {};

  const [selectedCountry, setSelectedCountry] = useState<string | null>(country || null);

  const { data: countries = [] } = useQuery<string[]>({
    queryKey: ["/api/locations/countries"],
  });

  const { data: restaurants = [], isLoading, refetch, isRefetching } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants", selectedCountry ? `?country=${selectedCountry}` : ""],
  });

  const filteredRestaurants = useMemo(() => {
    if (!selectedCountry) return restaurants;
    return restaurants.filter(
      (r) => r.country.toLowerCase() === selectedCountry.toLowerCase()
    );
  }, [restaurants, selectedCountry]);

  const renderCountryFilter = () => (
    <View style={styles.filterContainer}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedCountry(null);
        }}
        style={[
          styles.filterChip,
          {
            backgroundColor: !selectedCountry ? theme.primary : theme.backgroundSecondary,
          },
        ]}
      >
        <ThemedText
          type="caption"
          style={{ color: !selectedCountry ? "#FFFFFF" : theme.text }}
        >
          All
        </ThemedText>
      </Pressable>
      {countries.map((c) => (
        <Pressable
          key={c}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedCountry(c);
          }}
          style={[
            styles.filterChip,
            {
              backgroundColor:
                selectedCountry === c ? theme.primary : theme.backgroundSecondary,
            },
          ]}
        >
          <ThemedText
            type="caption"
            style={{ color: selectedCountry === c ? "#FFFFFF" : theme.text }}
          >
            {c}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <ThemedText type="h2">Restaurants</ThemedText>
      <ThemedText type="body" style={styles.subtitle}>
        Discover dining experiences worldwide
      </ThemedText>
      {countries.length > 0 && renderCountryFilter()}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="coffee" size={40} color={theme.textSecondary} />
      </View>
      <ThemedText type="h4" style={styles.emptyTitle}>
        No Restaurants Yet
      </ThemedText>
      <ThemedText type="body" style={styles.emptyText}>
        {selectedCountry
          ? `No restaurants found in ${selectedCountry}`
          : "Be the first to register your restaurant!"}
      </ThemedText>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate("RestaurantOnboarding");
        }}
        style={[styles.addButton, { backgroundColor: theme.primary }]}
      >
        <Feather name="plus" size={18} color="#FFFFFF" />
        <ThemedText type="label" style={styles.addButtonText}>
          Add Restaurant
        </ThemedText>
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={filteredRestaurants}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RestaurantCard
            restaurant={item}
            onPress={() =>
              navigation.navigate("RestaurantDetail", { restaurantId: item.id })
            }
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: Spacing.lg, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
      />

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.navigate("RestaurantOnboarding");
        }}
        style={[styles.fab, { bottom: insets.bottom + Spacing.xl }]}
      >
        <LinearGradient
          colors={["#1A4D2E", "#2D6A4F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Feather name="plus" size={24} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
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
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  subtitle: {
    opacity: 0.7,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  filterContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  cardContainer: {
    marginBottom: Spacing.md,
  },
  card: {
    flexDirection: "row",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  cardImage: {
    width: 100,
    height: 100,
  },
  cardImagePhoto: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: "center",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  cardTitle: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cuisineText: {
    opacity: 0.7,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    flex: 1,
    opacity: 0.7,
  },
  reviewsText: {
    marginTop: 4,
    opacity: 0.5,
  },
  arrowContainer: {
    justifyContent: "center",
    paddingRight: Spacing.md,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
  },
  emptyText: {
    textAlign: "center",
    opacity: 0.7,
    marginBottom: Spacing.xl,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  addButtonText: {
    color: "#FFFFFF",
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    borderRadius: 28,
    overflow: "hidden",
    ...Shadows.fab,
  },
  fabGradient: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
});
