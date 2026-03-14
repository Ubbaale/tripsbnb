import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";

interface ProfileSectionItem {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

interface ProfileSectionProps {
  title: string;
  items: ProfileSectionItem[];
}

export function ProfileSection({ title, items }: ProfileSectionProps) {
  const { theme } = useTheme();

  const handlePress = (item: ProfileSectionItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    item.onPress?.();
  };

  return (
    <View style={styles.container}>
      <ThemedText type="label" style={styles.title}>
        {title}
      </ThemedText>
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
        {items.map((item, index) => (
          <Pressable
            key={item.label}
            onPress={() => handlePress(item)}
            style={({ pressed }) => [
              styles.item,
              pressed && { opacity: 0.7 },
              index < items.length - 1 && [
                styles.itemBorder,
                { borderBottomColor: theme.border },
              ],
            ]}
          >
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: item.danger
                    ? theme.error + "15"
                    : theme.primary + "15",
                },
              ]}
            >
              <Feather
                name={item.icon}
                size={18}
                color={item.danger ? theme.error : theme.primary}
              />
            </View>
            <View style={styles.content}>
              <ThemedText
                type="body"
                style={item.danger ? { color: theme.error } : undefined}
              >
                {item.label}
              </ThemedText>
              {item.value ? (
                <ThemedText type="caption">{item.value}</ThemedText>
              ) : null}
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing["2xl"],
  },
  title: {
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    opacity: 0.6,
  },
  card: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  itemBorder: {
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
});
