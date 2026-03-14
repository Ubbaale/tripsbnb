import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
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

export interface TimelineItem {
  id: string;
  type: "flight" | "stay" | "safari" | "companion" | "dining";
  title: string;
  subtitle: string;
  date: string;
  time: string;
  status: "upcoming" | "active" | "completed";
}

interface TimelineCardProps {
  item: TimelineItem;
  isFirst?: boolean;
  isLast?: boolean;
  onPress?: () => void;
}

const getIcon = (type: TimelineItem["type"]): keyof typeof Feather.glyphMap => {
  switch (type) {
    case "flight":
      return "navigation";
    case "stay":
      return "home";
    case "safari":
      return "sun";
    case "companion":
      return "users";
    case "dining":
      return "coffee";
    default:
      return "circle";
  }
};

const getTypeGradient = (type: TimelineItem["type"]): readonly [string, string] => {
  switch (type) {
    case "flight":
      return ["#4A90D9", "#357ABD"] as const;
    case "stay":
      return ["#1A4D2E", "#2D6A4F"] as const;
    case "safari":
      return ["#DAA520", "#B8860B"] as const;
    case "companion":
      return ["#9B59B6", "#8E44AD"] as const;
    case "dining":
      return ["#E74C3C", "#C0392B"] as const;
    default:
      return ["#1A4D2E", "#2D6A4F"] as const;
  }
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TimelineCard({ item, isFirst, isLast, onPress }: TimelineCardProps) {
  const { theme } = useTheme();
  const typeGradient = getTypeGradient(item.type);
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

  return (
    <View style={styles.container}>
      <View style={styles.timeline}>
        {!isFirst ? (
          <LinearGradient
            colors={["transparent", typeGradient[0]]}
            style={styles.lineTop}
          />
        ) : null}
        <LinearGradient
          colors={typeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.dot}
        >
          <Feather name={getIcon(item.type)} size={18} color="#FFFFFF" />
        </LinearGradient>
        {!isLast ? (
          <LinearGradient
            colors={[typeGradient[1], "transparent"]}
            style={styles.lineBottom}
          />
        ) : null}
      </View>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.cardWrapper, animatedStyle]}
      >
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
          <View style={styles.header}>
            <LinearGradient
              colors={typeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.badge}
            >
              <ThemedText type="caption" style={styles.badgeText}>
                {item.type.toUpperCase()}
              </ThemedText>
            </LinearGradient>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    item.status === "active"
                      ? theme.success + "20"
                      : item.status === "completed"
                      ? theme.textSecondary + "20"
                      : theme.accent + "20",
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      item.status === "active"
                        ? theme.success
                        : item.status === "completed"
                        ? theme.textSecondary
                        : theme.accent,
                  },
                ]}
              />
              <ThemedText
                type="caption"
                style={{
                  color:
                    item.status === "active"
                      ? theme.success
                      : item.status === "completed"
                      ? theme.textSecondary
                      : theme.accent,
                }}
              >
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="h4" style={styles.title}>
            {item.title}
          </ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            {item.subtitle}
          </ThemedText>
          <View style={styles.divider} />
          <View style={styles.dateTime}>
            <View style={styles.dateTimeItem}>
              <Feather name="calendar" size={14} color={theme.textSecondary} />
              <ThemedText type="caption">{item.date}</ThemedText>
            </View>
            <View style={styles.dateTimeItem}>
              <Feather name="clock" size={14} color={theme.textSecondary} />
              <ThemedText type="caption">{item.time}</ThemedText>
            </View>
            <View style={styles.arrow}>
              <Feather name="chevron-right" size={18} color={theme.textSecondary} />
            </View>
          </View>
        </View>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  timeline: {
    width: 44,
    alignItems: "center",
  },
  lineTop: {
    position: "absolute",
    top: 0,
    width: 3,
    height: 22,
    borderRadius: 1.5,
  },
  lineBottom: {
    position: "absolute",
    bottom: -Spacing.md,
    width: 3,
    height: "100%",
    borderRadius: 1.5,
  },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  cardWrapper: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  subtitle: {
    marginBottom: Spacing.md,
    opacity: 0.7,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginBottom: Spacing.md,
  },
  dateTime: {
    flexDirection: "row",
    gap: Spacing.xl,
  },
  dateTimeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  arrow: {
    flex: 1,
    alignItems: "flex-end",
  },
});
