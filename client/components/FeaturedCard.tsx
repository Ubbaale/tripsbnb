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

interface FeaturedCardProps {
  title: string;
  subtitle: string;
  image: string;
  badge?: string;
  onPress?: () => void;
}

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - Spacing.lg * 2;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FeaturedCard({
  title,
  subtitle,
  image,
  badge,
  onPress,
}: FeaturedCardProps) {
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
    onPress?.();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedStyle]}
    >
      <ImageBackground
        source={{ uri: image }}
        style={styles.image}
        imageStyle={styles.imageStyle}
      >
        <LinearGradient
          colors={["rgba(26,77,46,0.3)", "rgba(26,77,46,0.9)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        >
          {badge ? (
            <View style={styles.badge}>
              <Feather name="award" size={12} color="#DAA520" />
              <ThemedText type="caption" style={styles.badgeText}>
                {badge}
              </ThemedText>
            </View>
          ) : null}
          <View style={styles.content}>
            <ThemedText type="h1" style={styles.title}>
              {title}
            </ThemedText>
            <ThemedText type="body" style={styles.subtitle}>
              {subtitle}
            </ThemedText>
            <View style={styles.cta}>
              <ThemedText type="label" style={styles.ctaText}>
                Explore Now
              </ThemedText>
              <Feather name="arrow-right" size={16} color="#DAA520" />
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: 260,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    shadowColor: "#1A4D2E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  image: {
    flex: 1,
    backgroundColor: "#2D6A4F",
  },
  imageStyle: {
    borderRadius: BorderRadius.xl,
    resizeMode: "cover",
  },
  gradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: Spacing.xl,
  },
  badge: {
    position: "absolute",
    top: Spacing.lg,
    left: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  badgeText: {
    color: "#DAA520",
    fontWeight: "600",
  },
  content: {
    gap: Spacing.sm,
  },
  title: {
    color: "#FFFFFF",
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  ctaText: {
    color: "#DAA520",
  },
});
