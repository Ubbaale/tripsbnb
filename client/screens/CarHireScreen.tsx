import React, { useState } from "react";
import { StyleSheet, View, FlatList, ActivityIndicator, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
import { SegmentedControl } from "@/components/SegmentedControl";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { formatPrice } from "@/lib/currency";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CarRental {
  id: string;
  name: string;
  description: string | null;
  vehicleType: string;
  transmission: string;
  fuelType: string;
  seats: number;
  year: number | null;
  make: string | null;
  model: string | null;
  features: string | null;
  city: string;
  country: string;
  verified: boolean;
  averageRating: string;
  totalRatings: number;
  bookingPrice: number | null;
  bookingCurrency: string | null;
  pickupLocations: string | null;
  insuranceIncluded: boolean;
  mileageLimit: string | null;
  minimumAge: number | null;
  [key: string]: any;
}

const VEHICLE_TYPE_ICONS: Record<string, string> = {
  sedan: "navigation",
  suv: "truck",
  van: "truck",
  pickup: "truck",
  convertible: "wind",
  luxury: "star",
  minibus: "truck",
};

const VEHICLE_SEGMENTS = ["All", "Sedan", "SUV", "Van", "Luxury", "Minibus"];

function CarRentalCard({
  item,
  onPress,
}: {
  item: CarRental;
  onPress: () => void;
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
  const iconName = VEHICLE_TYPE_ICONS[item.vehicleType] || "truck";
  const featuresList = item.features ? item.features.split(",").map((f: string) => f.trim()) : [];

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.card, animatedStyle]}
      testID={`card-car-rental-${item.id}`}
    >
      <View style={[styles.cardInner, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
        <View style={styles.cardImage}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.cardImagePhoto} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={["#1A4D2E", "#2D6A4F"] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardImageGradient}
            >
              <Feather name={iconName as any} size={32} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          )}
          {item.verified ? (
            <View style={[styles.verifiedBadge, { backgroundColor: theme.accent }]}>
              <Feather name="check" size={10} color="#FFFFFF" />
            </View>
          ) : null}
          {price ? (
            <View style={styles.priceBadge}>
              <ThemedText type="label" style={styles.priceText}>
                {price}
              </ThemedText>
              <ThemedText type="small" style={styles.priceLabel}>
                /day
              </ThemedText>
            </View>
          ) : null}
          <View style={styles.transmissionBadge}>
            <ThemedText type="small" style={styles.transmissionText}>
              {item.transmission === "automatic" ? "Auto" : "Manual"}
            </ThemedText>
          </View>
        </View>
        <View style={styles.cardBody}>
          <ThemedText type="h4" numberOfLines={1}>
            {item.name}
          </ThemedText>
          <ThemedText type="caption" style={styles.vehicleType} numberOfLines={1}>
            {item.vehicleType.replace(/_/g, " ")} {item.make ? `- ${item.make}` : ""} {item.model || ""}
          </ThemedText>
          <View style={styles.cardMeta}>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={12} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
                {item.city}, {item.country}
              </ThemedText>
            </View>
            <View style={styles.ratingRow}>
              <Feather name="star" size={12} color={theme.accent} />
              <ThemedText type="caption" style={{ color: theme.accent }}>
                {rating > 0 ? rating.toFixed(1) : "New"}
              </ThemedText>
              {item.totalRatings > 0 ? (
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  ({item.totalRatings})
                </ThemedText>
              ) : null}
            </View>
          </View>
          <View style={styles.specsRow}>
            <View style={[styles.specTag, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="users" size={10} color={theme.textSecondary} />
              <ThemedText type="small">{item.seats} seats</ThemedText>
            </View>
            <View style={[styles.specTag, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="zap" size={10} color={theme.textSecondary} />
              <ThemedText type="small">{item.fuelType}</ThemedText>
            </View>
            {item.insuranceIncluded ? (
              <View style={[styles.specTag, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="shield" size={10} color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.primary }}>Insured</ThemedText>
              </View>
            ) : null}
          </View>
          {featuresList.length > 0 ? (
            <View style={styles.featuresRow}>
              {featuresList.slice(0, 4).map((feature: string) => (
                <View
                  key={feature}
                  style={[styles.featureTag, { backgroundColor: theme.backgroundSecondary }]}
                >
                  <ThemedText type="small" numberOfLines={1}>
                    {feature.replace(/_/g, " ")}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function CarHireScreen() {
  const insets = useSafeAreaInsets();

  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSegment, setSelectedSegment] = useState(0);

  const { data: carRentals = [], isLoading } = useQuery<CarRental[]>({
    queryKey: ["/api/car-rentals"],
  });

  const filtered = carRentals.filter((car) => {
    const matchesSearch =
      car.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      car.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      car.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      car.vehicleType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (car.make || "").toLowerCase().includes(searchQuery.toLowerCase());

    const segmentFilter = VEHICLE_SEGMENTS[selectedSegment].toLowerCase();
    const matchesSegment = segmentFilter === "all" || car.vehicleType.toLowerCase() === segmentFilter;

    return matchesSearch && matchesSegment;
  });

  const renderItem = ({ item }: { item: CarRental }) => (
    <CarRentalCard
      item={item}
      onPress={() =>
        navigation.navigate("VendorDetail", {
          vendorType: "car_rental",
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
        title="No vehicles available"
        subtitle="Check back soon for car hire options in your area"
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
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
          flexGrow: 1,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search vehicles, cities..."
              onFilterPress={() => {}}
            />
            <SegmentedControl
              segments={VEHICLE_SEGMENTS}
              selectedIndex={selectedSegment}
              onIndexChange={setSelectedSegment}
            />
          </View>
        }
        ListEmptyComponent={renderEmpty}
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
  header: { marginBottom: Spacing.xl, gap: Spacing.md },
  card: { marginBottom: Spacing.lg },
  cardInner: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  cardImage: { height: 160, position: "relative" },
  cardImagePhoto: {
    width: "100%",
    height: "100%",
  },
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
  transmissionBadge: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  transmissionText: { color: "#FFFFFF", fontSize: 11 },
  cardBody: { padding: Spacing.lg },
  vehicleType: { opacity: 0.7, marginTop: 2, textTransform: "capitalize" },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  specsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  specTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },
  featuresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  featureTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
});
