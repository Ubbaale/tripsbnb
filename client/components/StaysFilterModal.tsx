import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Slider from "@react-native-community/slider";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface StaysFilterState {
  propertyType: string;
  priceMin: number;
  priceMax: number;
  bedrooms: number;
  bathrooms: number;
  beds: number;
  guests: number;
  amenities: string[];
  instantBook: boolean;
  selfCheckIn: boolean;
  freeCancellation: boolean;
  verifiedOnly: boolean;
  rating: string;
}

export const DEFAULT_STAYS_FILTERS: StaysFilterState = {
  propertyType: "all",
  priceMin: 0,
  priceMax: 1000,
  bedrooms: 0,
  bathrooms: 0,
  beds: 0,
  guests: 0,
  amenities: [],
  instantBook: false,
  selfCheckIn: false,
  freeCancellation: false,
  verifiedOnly: false,
  rating: "all",
};

interface StaysFilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: StaysFilterState;
  onApply: (filters: StaysFilterState) => void;
}

const PROPERTY_TYPES = [
  { key: "all", label: "All", icon: "grid" as const },
  { key: "house", label: "House", icon: "home" as const },
  { key: "apartment", label: "Apartment", icon: "square" as const },
  { key: "guesthouse", label: "Guesthouse", icon: "users" as const },
  { key: "hotel", label: "Hotel", icon: "briefcase" as const },
  { key: "villa", label: "Villa", icon: "sun" as const },
  { key: "cabin", label: "Cabin", icon: "triangle" as const },
  { key: "cottage", label: "Cottage", icon: "coffee" as const },
  { key: "resort", label: "Resort", icon: "star" as const },
  { key: "lodge", label: "Lodge", icon: "map" as const },
  { key: "camp", label: "Camp", icon: "compass" as const },
  { key: "farmstay", label: "Farmstay", icon: "wind" as const },
  { key: "treehouse", label: "Treehouse", icon: "feather" as const },
  { key: "houseboat", label: "Houseboat", icon: "anchor" as const },
  { key: "hostel", label: "Hostel", icon: "layers" as const },
];

const AMENITY_OPTIONS = [
  { key: "wifi", label: "WiFi", icon: "wifi" as const },
  { key: "kitchen", label: "Kitchen", icon: "coffee" as const },
  { key: "pool", label: "Pool", icon: "droplet" as const },
  { key: "parking", label: "Parking", icon: "truck" as const },
  { key: "air conditioning", label: "AC", icon: "wind" as const },
  { key: "heating", label: "Heating", icon: "thermometer" as const },
  { key: "washer", label: "Washer", icon: "loader" as const },
  { key: "tv", label: "TV", icon: "tv" as const },
  { key: "gym", label: "Gym", icon: "activity" as const },
  { key: "hot tub", label: "Hot Tub", icon: "droplet" as const },
  { key: "bbq", label: "BBQ", icon: "zap" as const },
  { key: "balcony", label: "Balcony", icon: "maximize" as const },
  { key: "garden", label: "Garden", icon: "feather" as const },
  { key: "elevator", label: "Elevator", icon: "arrow-up" as const },
  { key: "fireplace", label: "Fireplace", icon: "sun" as const },
  { key: "workspace", label: "Workspace", icon: "monitor" as const },
];

const RATING_OPTIONS = [
  { key: "all", label: "Any" },
  { key: "3plus", label: "3.0+" },
  { key: "4plus", label: "4.0+" },
  { key: "4.5plus", label: "4.5+" },
];

function FilterChip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: string;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onPressIn={() => { scale.value = withSpring(0.95, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.backgroundSecondary,
          borderColor: selected ? theme.primary : theme.border,
        },
        animatedStyle,
      ]}
    >
      {icon ? (
        <Feather name={icon as any} size={14} color={selected ? "#FFFFFF" : theme.textSecondary} />
      ) : null}
      <ThemedText
        type="label"
        style={{ color: selected ? "#FFFFFF" : theme.text, fontSize: 13 }}
      >
        {label}
      </ThemedText>
    </AnimatedPressable>
  );
}

function CounterRow({
  label,
  value,
  onIncrement,
  onDecrement,
  icon,
}: {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  icon: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.counterRow}>
      <View style={styles.counterLabel}>
        <Feather name={icon as any} size={18} color={theme.textSecondary} />
        <ThemedText type="body">{label}</ThemedText>
      </View>
      <View style={styles.counterControls}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDecrement();
          }}
          style={[
            styles.counterButton,
            {
              borderColor: value > 0 ? theme.primary : theme.border,
              opacity: value > 0 ? 1 : 0.4,
            },
          ]}
          disabled={value <= 0}
        >
          <Feather name="minus" size={16} color={value > 0 ? theme.primary : theme.textSecondary} />
        </Pressable>
        <ThemedText type="body" style={styles.counterValue}>
          {value > 0 ? `${value}+` : "Any"}
        </ThemedText>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onIncrement();
          }}
          style={[styles.counterButton, { borderColor: theme.primary }]}
        >
          <Feather name="plus" size={16} color={theme.primary} />
        </Pressable>
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  subtitle,
  value,
  onToggle,
  icon,
}: {
  label: string;
  subtitle: string;
  value: boolean;
  onToggle: () => void;
  icon: string;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
      style={styles.toggleRow}
    >
      <View style={styles.toggleInfo}>
        <Feather name={icon as any} size={18} color={theme.textSecondary} />
        <View style={{ flex: 1 }}>
          <ThemedText type="body">{label}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {subtitle}
          </ThemedText>
        </View>
      </View>
      <View
        style={[
          styles.toggle,
          { backgroundColor: value ? theme.primary : theme.backgroundSecondary },
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
      </View>
    </Pressable>
  );
}

export function StaysFilterModal({
  visible,
  onClose,
  filters,
  onApply,
}: StaysFilterModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [local, setLocal] = useState<StaysFilterState>(filters);

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLocal({ ...DEFAULT_STAYS_FILTERS });
  };

  const handleApply = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onApply(local);
    onClose();
  };

  const toggleAmenity = (key: string) => {
    setLocal((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(key)
        ? prev.amenities.filter((a) => a !== key)
        : [...prev.amenities, key],
    }));
  };

  const activeCount =
    (local.propertyType !== "all" ? 1 : 0) +
    (local.priceMin > 0 || local.priceMax < 1000 ? 1 : 0) +
    (local.bedrooms > 0 ? 1 : 0) +
    (local.bathrooms > 0 ? 1 : 0) +
    (local.beds > 0 ? 1 : 0) +
    (local.guests > 0 ? 1 : 0) +
    local.amenities.length +
    (local.instantBook ? 1 : 0) +
    (local.selfCheckIn ? 1 : 0) +
    (local.freeCancellation ? 1 : 0) +
    (local.verifiedOnly ? 1 : 0) +
    (local.rating !== "all" ? 1 : 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
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
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={22} color={theme.text} />
            </Pressable>
            <ThemedText type="h4">Filters</ThemedText>
            <Pressable onPress={handleReset} hitSlop={8}>
              <ThemedText type="link" style={{ fontSize: 14 }}>Clear all</ThemedText>
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>Property Type</ThemedText>
              <View style={styles.chipGrid}>
                {PROPERTY_TYPES.map((pt) => (
                  <FilterChip
                    key={pt.key}
                    label={pt.label}
                    icon={pt.icon}
                    selected={local.propertyType === pt.key}
                    onPress={() => setLocal({ ...local, propertyType: pt.key })}
                  />
                ))}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>Price Range</ThemedText>
              <View style={styles.priceRow}>
                <View style={[styles.priceInput, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>Min</ThemedText>
                  <ThemedText type="body">${local.priceMin}</ThemedText>
                </View>
                <ThemedText type="body" style={{ color: theme.textSecondary }}>-</ThemedText>
                <View style={[styles.priceInput, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>Max</ThemedText>
                  <ThemedText type="body">${local.priceMax === 1000 ? "1000+" : `${local.priceMax}`}</ThemedText>
                </View>
              </View>
              <View style={styles.sliderContainer}>
                <Slider
                  minimumValue={0}
                  maximumValue={1000}
                  step={10}
                  value={local.priceMin}
                  onValueChange={(v: number) => setLocal({ ...local, priceMin: Math.min(v, local.priceMax - 10) })}
                  minimumTrackTintColor={theme.primary}
                  maximumTrackTintColor={theme.border}
                  thumbTintColor={theme.primary}
                  style={styles.slider}
                />
                <Slider
                  minimumValue={0}
                  maximumValue={1000}
                  step={10}
                  value={local.priceMax}
                  onValueChange={(v: number) => setLocal({ ...local, priceMax: Math.max(v, local.priceMin + 10) })}
                  minimumTrackTintColor={theme.border}
                  maximumTrackTintColor={theme.primary}
                  thumbTintColor={theme.primary}
                  style={styles.slider}
                />
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>Rooms & Beds</ThemedText>
              <CounterRow
                label="Bedrooms"
                value={local.bedrooms}
                icon="moon"
                onIncrement={() => setLocal({ ...local, bedrooms: Math.min(local.bedrooms + 1, 10) })}
                onDecrement={() => setLocal({ ...local, bedrooms: Math.max(local.bedrooms - 1, 0) })}
              />
              <CounterRow
                label="Bathrooms"
                value={local.bathrooms}
                icon="droplet"
                onIncrement={() => setLocal({ ...local, bathrooms: Math.min(local.bathrooms + 1, 10) })}
                onDecrement={() => setLocal({ ...local, bathrooms: Math.max(local.bathrooms - 1, 0) })}
              />
              <CounterRow
                label="Beds"
                value={local.beds}
                icon="sidebar"
                onIncrement={() => setLocal({ ...local, beds: Math.min(local.beds + 1, 10) })}
                onDecrement={() => setLocal({ ...local, beds: Math.max(local.beds - 1, 0) })}
              />
              <CounterRow
                label="Guests"
                value={local.guests}
                icon="users"
                onIncrement={() => setLocal({ ...local, guests: Math.min(local.guests + 1, 20) })}
                onDecrement={() => setLocal({ ...local, guests: Math.max(local.guests - 1, 0) })}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>Amenities</ThemedText>
              <View style={styles.chipGrid}>
                {AMENITY_OPTIONS.map((am) => (
                  <FilterChip
                    key={am.key}
                    label={am.label}
                    icon={am.icon}
                    selected={local.amenities.includes(am.key)}
                    onPress={() => toggleAmenity(am.key)}
                  />
                ))}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>Booking Options</ThemedText>
              <ToggleRow
                label="Instant Book"
                subtitle="Book without waiting for host approval"
                icon="zap"
                value={local.instantBook}
                onToggle={() => setLocal({ ...local, instantBook: !local.instantBook })}
              />
              <ToggleRow
                label="Self Check-in"
                subtitle="Keypad, lockbox, or doorman"
                icon="key"
                value={local.selfCheckIn}
                onToggle={() => setLocal({ ...local, selfCheckIn: !local.selfCheckIn })}
              />
              <ToggleRow
                label="Free Cancellation"
                subtitle="Flexible cancellation policy"
                icon="x-circle"
                value={local.freeCancellation}
                onToggle={() => setLocal({ ...local, freeCancellation: !local.freeCancellation })}
              />
              <ToggleRow
                label="Verified Only"
                subtitle="Properties verified by Tripsbnb"
                icon="check-circle"
                value={local.verifiedOnly}
                onToggle={() => setLocal({ ...local, verifiedOnly: !local.verifiedOnly })}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>Guest Rating</ThemedText>
              <View style={styles.chipGrid}>
                {RATING_OPTIONS.map((r) => (
                  <FilterChip
                    key={r.key}
                    label={r.label}
                    selected={local.rating === r.key}
                    onPress={() => setLocal({ ...local, rating: r.key })}
                  />
                ))}
              </View>
            </View>

            <View style={{ height: Spacing.xl }} />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.cancelButton, { borderColor: theme.border }]}
              onPress={onClose}
            >
              <ThemedText type="label">Cancel</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.applyButton, { backgroundColor: theme.primary }]}
              onPress={handleApply}
            >
              <ThemedText type="label" style={{ color: "#FFFFFF" }}>
                {activeCount > 0 ? `Show Results (${activeCount})` : "Show All Results"}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  modal: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "90%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  content: { paddingHorizontal: Spacing.xl },
  section: { paddingVertical: Spacing.lg },
  sectionTitle: { marginBottom: Spacing.md },
  divider: { height: 1 },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  sliderContainer: { marginTop: Spacing.md },
  slider: { width: "100%", height: 36 },
  counterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  counterLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  counterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  counterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  counterValue: {
    width: 40,
    textAlign: "center",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  toggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.md,
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
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
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
});
