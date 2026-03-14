import React from "react";
import { StyleSheet, Pressable, View, ImageBackground, Dimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { PriceComparisonBadge } from "@/components/PriceComparisonBadge";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";

export interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  verified: boolean;
  type: "room" | "apartment" | "home";
}

interface PropertyCardProps {
  property: Property;
  onPress?: () => void;
}

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - Spacing.lg * 2;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PropertyCard({ property, onPress }: PropertyCardProps) {
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
    onPress?.();
  };

  const getTypeLabel = () => {
    switch (property.type) {
      case "room":
        return "Private Room";
      case "apartment":
        return "Entire Apartment";
      case "home":
        return "Entire Home";
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedStyle]}
    >
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
        <ImageBackground
          source={{ uri: property.image }}
          style={styles.image}
          imageStyle={styles.imageStyle}
        >
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.3)"]}
            style={styles.imageGradient}
          />
          {property.verified ? (
            <View style={[styles.verifiedBadge, { backgroundColor: theme.accent }]}>
              <Feather name="check" size={12} color="#FFFFFF" />
              <ThemedText type="caption" style={styles.verifiedText}>
                Verified
              </ThemedText>
            </View>
          ) : null}
          <View style={styles.typeBadge}>
            <ThemedText type="caption" style={styles.typeText}>
              {getTypeLabel()}
            </ThemedText>
          </View>
        </ImageBackground>
        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="h4" numberOfLines={1} style={styles.title}>
              {property.title}
            </ThemedText>
            <View style={styles.rating}>
              <Feather name="star" size={14} color={theme.accent} />
              <ThemedText type="label" style={styles.ratingText}>
                {property.rating.toFixed(1)}
              </ThemedText>
              <ThemedText type="caption">({property.reviews})</ThemedText>
            </View>
          </View>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={styles.location}>
              {property.location}
            </ThemedText>
          </View>
          <PriceComparisonBadge price={property.price * 100} compact />
          <View style={styles.divider} />
          <View style={styles.footer}>
            <View style={styles.priceContainer}>
              <ThemedText type="h3" style={{ color: theme.primary }}>
                ${property.price}
              </ThemedText>
              <ThemedText type="caption"> / night</ThemedText>
            </View>
            <View style={[styles.bookButton, { backgroundColor: theme.primary }]}>
              <ThemedText type="label" style={styles.bookButtonText}>
                View
              </ThemedText>
              <Feather name="arrow-right" size={14} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 200,
    backgroundColor: "#E0E0E0",
  },
  imageStyle: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    resizeMode: "cover",
  },
  imageGradient: {
    flex: 1,
  },
  verifiedBadge: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  verifiedText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  typeBadge: {
    position: "absolute",
    bottom: Spacing.md,
    left: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  typeText: {
    color: "#FFFFFF",
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  title: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    marginLeft: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  location: {
    marginLeft: Spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginBottom: Spacing.md,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  bookButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  bookButtonText: {
    color: "#FFFFFF",
  },
});
