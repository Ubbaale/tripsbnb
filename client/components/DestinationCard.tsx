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
import { BorderRadius, Spacing } from "@/constants/theme";

export interface Destination {
  id: string;
  name: string;
  country: string;
  image: string;
  rating: number;
  price: string;
}

interface DestinationCardProps {
  destination: Destination;
  onPress?: () => void;
  size?: "small" | "large";
}

const { width } = Dimensions.get("window");
const CARD_WIDTH_SMALL = (width - Spacing.lg * 3) / 2;
const CARD_WIDTH_LARGE = width - Spacing.lg * 2;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function DestinationCard({
  destination,
  onPress,
  size = "small",
}: DestinationCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const cardWidth = size === "large" ? CARD_WIDTH_LARGE : CARD_WIDTH_SMALL;
  const cardHeight = size === "large" ? 220 : 180;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        { width: cardWidth, height: cardHeight },
        animatedStyle,
      ]}
    >
      <ImageBackground
        source={{ uri: destination.image }}
        style={styles.image}
        imageStyle={styles.imageStyle}
      >
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)"]}
          style={styles.gradient}
        >
          <View style={styles.ratingBadge}>
            <Feather name="star" size={12} color="#DAA520" />
            <ThemedText type="caption" style={styles.ratingText}>
              {destination.rating.toFixed(1)}
            </ThemedText>
          </View>
          <View style={styles.content}>
            <ThemedText type="h4" style={styles.name} numberOfLines={1}>
              {destination.name}
            </ThemedText>
            <View style={styles.row}>
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={12} color="rgba(255,255,255,0.8)" />
                <ThemedText type="caption" style={styles.country}>
                  {destination.country}
                </ThemedText>
              </View>
              <ThemedText type="label" style={styles.price}>
                {destination.price}
              </ThemedText>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  image: {
    flex: 1,
    backgroundColor: "#E0E0E0",
  },
  imageStyle: {
    borderRadius: BorderRadius.lg,
    resizeMode: "cover",
  },
  gradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: Spacing.md,
  },
  ratingBadge: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    gap: 4,
  },
  ratingText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  content: {
    gap: 4,
  },
  name: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  country: {
    color: "rgba(255,255,255,0.8)",
  },
  price: {
    color: "#DAA520",
  },
});
