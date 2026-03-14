import React from "react";
import { StyleSheet, Pressable, View, Dimensions, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";

const { width: screenWidth } = Dimensions.get("window");
const TILE_WIDTH = (screenWidth - Spacing.lg * 2 - Spacing.md) / 2;

interface ProfileTileProps {
  icon: keyof typeof Feather.glyphMap;
  emoji?: string;
  label: string;
  value?: string;
  color?: string;
  onPress?: () => void;
  danger?: boolean;
}

export function ProfileTile({
  icon,
  emoji,
  label,
  value,
  color,
  onPress,
  danger,
}: ProfileTileProps) {
  const { theme } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const iconColor = danger ? theme.error : color || theme.primary;
  const iconBgColor = danger ? theme.error + "15" : (color || theme.primary) + "15";

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.backgroundDefault },
        Shadows.card,
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        {emoji ? (
          <Text style={styles.emoji}>{emoji}</Text>
        ) : (
          <Feather name={icon} size={22} color={iconColor} />
        )}
      </View>
      <ThemedText
        type="body"
        style={[styles.label, danger && { color: theme.error }]}
        numberOfLines={2}
      >
        {label}
      </ThemedText>
      {value ? (
        <ThemedText type="caption" style={styles.value} numberOfLines={1}>
          {value}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: TILE_WIDTH,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  emoji: {
    fontSize: 24,
  },
  value: {
    opacity: 0.6,
  },
});
