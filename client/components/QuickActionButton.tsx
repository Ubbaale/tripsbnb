import React from "react";
import { StyleSheet, Pressable, View, ImageBackground, Dimensions, Text } from "react-native";
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
import { BorderRadius, Spacing } from "@/constants/theme";

interface QuickActionButtonProps {
  icon: keyof typeof Feather.glyphMap;
  emoji?: string;
  label: string;
  secondaryLabel?: string;
  gradientColors: string[];
  imageUrl?: string;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { width: screenWidth } = Dimensions.get("window");
const TILE_WIDTH = (screenWidth - Spacing.lg * 2 - Spacing.md) / 2;

export function QuickActionButton({
  icon,
  emoji,
  label,
  secondaryLabel,
  gradientColors,
  imageUrl,
  onPress,
}: QuickActionButtonProps) {
  const { theme } = useTheme();
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

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedStyle]}
    >
      <ImageBackground
        source={{ uri: imageUrl }}
        style={styles.tile}
        imageStyle={styles.imageStyle}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.6)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.overlay}
        >
          <View style={styles.iconWrapper}>
            {emoji ? (
              <Text style={styles.emoji}>{emoji}</Text>
            ) : (
              <Feather name={icon} size={18} color="#FFFFFF" />
            )}
          </View>
          <View style={styles.labelContainer}>
            <ThemedText style={styles.primaryLabel} numberOfLines={3}>
              {label}
            </ThemedText>
            {secondaryLabel ? (
              <ThemedText style={styles.secondaryLabel} numberOfLines={2}>
                {secondaryLabel}
              </ThemedText>
            ) : null}
          </View>
        </LinearGradient>
      </ImageBackground>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: TILE_WIDTH,
    marginBottom: Spacing.md,
  },
  tile: {
    width: "100%",
    height: 110,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  imageStyle: {
    borderRadius: BorderRadius.lg,
    resizeMode: "cover",
  },
  overlay: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: "space-between",
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 18,
  },
  labelContainer: {
    alignItems: "flex-start",
    flex: 1,
    justifyContent: "flex-end",
  },
  primaryLabel: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    lineHeight: 16,
  },
  secondaryLabel: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    lineHeight: 16,
  },
});
