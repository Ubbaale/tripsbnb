import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";

const { width: screenWidth } = Dimensions.get("window");

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type FilterCategory = "all" | "stays" | "safaris" | "dining" | "companions" | "guides";
export type PriceRange = "all" | "budget" | "mid" | "luxury";
export type RatingFilter = "all" | "4plus" | "4.5plus";

export interface FilterState {
  category: FilterCategory;
  priceRange: PriceRange;
  rating: RatingFilter;
  verifiedOnly: boolean;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.backgroundSecondary,
          borderColor: selected ? theme.primary : theme.border,
        },
        animatedStyle,
      ]}
    >
      <ThemedText
        type="label"
        style={[styles.chipText, { color: selected ? "#FFFFFF" : theme.text }]}
      >
        {label}
      </ThemedText>
    </AnimatedPressable>
  );
}

function ToggleSwitch({
  value,
  onToggle,
}: {
  value: boolean;
  onToggle: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
      style={[
        styles.toggle,
        {
          backgroundColor: value ? theme.primary : theme.backgroundSecondary,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.toggleKnob,
          {
            backgroundColor: "#FFFFFF",
            transform: [{ translateX: value ? 20 : 2 }],
          },
        ]}
      />
    </Pressable>
  );
}

export function FilterModal({
  visible,
  onClose,
  filters,
  onApply,
}: FilterModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLocalFilters({
      category: "all",
      priceRange: "all",
      rating: "all",
      verifiedOnly: false,
    });
  };

  const handleApply = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onApply(localFilters);
    onClose();
  };

  const categories: { key: FilterCategory; label: string }[] = [
    { key: "all", label: t("filters.allCategories") },
    { key: "stays", label: t("quickActions.stays") },
    { key: "safaris", label: t("quickActions.gameSafaris") },
    { key: "dining", label: t("quickActions.restaurants") },
    { key: "companions", label: t("experiences.companions") },
    { key: "guides", label: t("quickActions.guides") },
  ];

  const priceRanges: { key: PriceRange; label: string }[] = [
    { key: "all", label: t("filters.allPrices") },
    { key: "budget", label: t("filters.budget") },
    { key: "mid", label: t("filters.midRange") },
    { key: "luxury", label: t("filters.luxury") },
  ];

  const ratings: { key: RatingFilter; label: string }[] = [
    { key: "all", label: t("filters.allRatings") },
    { key: "4plus", label: "4.0+" },
    { key: "4.5plus", label: "4.5+" },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.modal,
            {
              backgroundColor: theme.backgroundDefault,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <ThemedText type="h3">{t("filters.title")}</ThemedText>
            <Pressable onPress={handleReset}>
              <ThemedText type="link">{t("filters.reset")}</ThemedText>
            </Pressable>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                {t("filters.category")}
              </ThemedText>
              <View style={styles.chipGrid}>
                {categories.map((cat) => (
                  <FilterChip
                    key={cat.key}
                    label={cat.label}
                    selected={localFilters.category === cat.key}
                    onPress={() =>
                      setLocalFilters({ ...localFilters, category: cat.key })
                    }
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                {t("filters.priceRange")}
              </ThemedText>
              <View style={styles.chipGrid}>
                {priceRanges.map((price) => (
                  <FilterChip
                    key={price.key}
                    label={price.label}
                    selected={localFilters.priceRange === price.key}
                    onPress={() =>
                      setLocalFilters({ ...localFilters, priceRange: price.key })
                    }
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                {t("filters.rating")}
              </ThemedText>
              <View style={styles.chipGrid}>
                {ratings.map((rating) => (
                  <FilterChip
                    key={rating.key}
                    label={rating.label}
                    selected={localFilters.rating === rating.key}
                    onPress={() =>
                      setLocalFilters({ ...localFilters, rating: rating.key })
                    }
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabel}>
                  <Feather name="check-circle" size={20} color={theme.accent} />
                  <ThemedText type="h4">{t("filters.verifiedOnly")}</ThemedText>
                </View>
                <ToggleSwitch
                  value={localFilters.verifiedOnly}
                  onToggle={() =>
                    setLocalFilters({
                      ...localFilters,
                      verifiedOnly: !localFilters.verifiedOnly,
                    })
                  }
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.cancelButton, { borderColor: theme.border }]}
              onPress={onClose}
            >
              <ThemedText type="label">{t("common.cancel")}</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.applyButton, { backgroundColor: theme.primary }]}
              onPress={handleApply}
            >
              <ThemedText type="label" style={styles.applyButtonText}>
                {t("filters.applyFilters")}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modal: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "80%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  toggleLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  applyButton: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#FFFFFF",
  },
});
