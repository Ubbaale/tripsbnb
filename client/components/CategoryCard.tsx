import React from "react";
import { StyleSheet, Pressable, View, ImageBackground } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";

interface CategoryCardProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  gradient: string[];
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CategoryCard({
  title,
  subtitle,
  icon,
  gradient,
  onPress,
}: CategoryCardProps) {
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
    onPress?.();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedStyle]}
    >
      <View style={[styles.card, { backgroundColor: gradient[0] }, Shadows.card]}>
        <View style={styles.iconContainer}>
          <Feather name={icon} size={24} color="#FFFFFF" />
        </View>
        <View style={styles.content}>
          <ThemedText type="h4" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText type="caption" style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        </View>
        <View style={styles.arrow}>
          <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    minHeight: 80,
    overflow: "hidden",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  content: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    marginBottom: 2,
  },
  subtitle: {
    color: "rgba(255,255,255,0.8)",
  },
  arrow: {
    marginLeft: Spacing.sm,
  },
});
