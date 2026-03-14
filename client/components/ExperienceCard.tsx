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
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";

export interface Experience {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  rating: number;
  image: string;
  verified: boolean;
  category: "safari" | "companion" | "dining";
}

interface ExperienceCardProps {
  experience: Experience;
  onPress?: () => void;
  compact?: boolean;
}

const { width } = Dimensions.get("window");

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const getCategoryColor = (category: Experience["category"]): readonly [string, string] => {
  switch (category) {
    case "safari":
      return ["#DAA520", "#B8860B"] as const;
    case "companion":
      return ["#9B59B6", "#8E44AD"] as const;
    case "dining":
      return ["#E74C3C", "#C0392B"] as const;
  }
};

const getCategoryIcon = (category: Experience["category"]): keyof typeof Feather.glyphMap => {
  switch (category) {
    case "safari":
      return "sun";
    case "companion":
      return "users";
    case "dining":
      return "coffee";
  }
};

export function ExperienceCard({ experience, onPress, compact = false }: ExperienceCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const categoryColors = getCategoryColor(experience.category);

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

  if (compact) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.compactContainer, animatedStyle]}
      >
        <View style={[styles.compactCard, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
          <ImageBackground
            source={{ uri: experience.image }}
            style={styles.compactImage}
            imageStyle={styles.compactImageStyle}
          >
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.5)"]}
              style={styles.compactGradient}
            />
          </ImageBackground>
          <View style={styles.compactContent}>
            <ThemedText type="label" numberOfLines={1}>
              {experience.title}
            </ThemedText>
            <ThemedText type="caption" numberOfLines={1}>
              {experience.duration}
            </ThemedText>
            <ThemedText type="label" style={{ color: theme.primary }}>
              ${experience.price}
            </ThemedText>
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedStyle]}
    >
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
        <ImageBackground
          source={{ uri: experience.image }}
          style={styles.image}
          imageStyle={styles.imageStyle}
        >
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.4)"]}
            style={styles.imageGradient}
          />
          {experience.verified ? (
            <View style={[styles.verifiedBadge, { backgroundColor: theme.accent }]}>
              <Feather name="check" size={12} color="#FFFFFF" />
              <ThemedText type="caption" style={styles.verifiedText}>
                Verified
              </ThemedText>
            </View>
          ) : null}
          <LinearGradient
            colors={categoryColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.categoryBadge}
          >
            <Feather name={getCategoryIcon(experience.category)} size={12} color="#FFFFFF" />
            <ThemedText type="caption" style={styles.categoryText}>
              {experience.category.charAt(0).toUpperCase() + experience.category.slice(1)}
            </ThemedText>
          </LinearGradient>
        </ImageBackground>
        <View style={styles.content}>
          <ThemedText type="h4" numberOfLines={1}>
            {experience.title}
          </ThemedText>
          <ThemedText type="small" numberOfLines={2} style={styles.description}>
            {experience.description}
          </ThemedText>
          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Feather name="clock" size={14} color={theme.textSecondary} />
              <ThemedText type="caption" style={styles.metaText}>
                {experience.duration}
              </ThemedText>
            </View>
            <View style={styles.metaItem}>
              <Feather name="star" size={14} color={theme.accent} />
              <ThemedText type="caption" style={styles.metaText}>
                {experience.rating.toFixed(1)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.footer}>
            <View style={styles.priceContainer}>
              <ThemedText type="h3" style={{ color: theme.primary }}>
                ${experience.price}
              </ThemedText>
              <ThemedText type="caption"> / experience</ThemedText>
            </View>
            <View style={[styles.bookButton, { backgroundColor: theme.primary }]}>
              <ThemedText type="label" style={styles.bookButtonText}>
                Book
              </ThemedText>
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
    height: 180,
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
  categoryBadge: {
    position: "absolute",
    bottom: Spacing.md,
    left: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  categoryText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  content: {
    padding: Spacing.lg,
  },
  description: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    opacity: 0.7,
  },
  meta: {
    flexDirection: "row",
    gap: Spacing.xl,
    marginBottom: Spacing.md,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    marginLeft: 2,
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
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  bookButtonText: {
    color: "#FFFFFF",
  },
  compactContainer: {
    width: 160,
    marginRight: Spacing.md,
  },
  compactCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  compactImage: {
    width: "100%",
    height: 100,
    backgroundColor: "#E0E0E0",
  },
  compactImageStyle: {
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
    resizeMode: "cover",
  },
  compactGradient: {
    flex: 1,
  },
  compactContent: {
    padding: Spacing.md,
    gap: 2,
  },
});
