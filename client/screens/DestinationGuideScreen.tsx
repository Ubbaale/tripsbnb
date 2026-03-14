import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Modal,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useMutation } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

const { width } = Dimensions.get("window");
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CATEGORY_COLORS: Record<string, string> = {
  nature: "#2D6B45",
  culture: "#6B3FA0",
  food: "#E67E22",
  adventure: "#2980B9",
  history: "#8E44AD",
  shopping: "#E74C3C",
  nightlife: "#9B59B6",
  relaxation: "#1ABC9C",
};

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  nature: "sun",
  culture: "book-open",
  food: "coffee",
  adventure: "compass",
  history: "clock",
  shopping: "shopping-bag",
  nightlife: "moon",
  relaxation: "heart",
};

interface DiscoveredEvent {
  title: string;
  description: string;
  eventType: string;
  venue: string;
  monthsActive: string;
  estimatedAttendance: string;
  ticketInfo: string;
  highlights: string[];
  insiderTip: string;
  category: string;
}

const EVENT_TYPE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  festival: "music",
  concert: "mic",
  sports: "activity",
  cultural: "globe",
  exhibition: "image",
  conference: "briefcase",
  carnival: "star",
  food_festival: "coffee",
  music: "headphones",
  art: "edit-3",
  food: "coffee",
  culture: "globe",
  nature: "sun",
  tech: "cpu",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  festival: "#E67E22",
  concert: "#9B59B6",
  sports: "#2ECC71",
  cultural: "#3498DB",
  exhibition: "#E74C3C",
  conference: "#34495E",
  carnival: "#F39C12",
  food_festival: "#D35400",
  music: "#9B59B6",
  art: "#E74C3C",
  food: "#D35400",
  culture: "#3498DB",
  nature: "#27AE60",
  tech: "#2C3E50",
};

interface GuideData {
  tagline: string;
  bestTimeToVisit: string;
  budgetTips: Array<{ tip: string; estimatedSavings: string }>;
  hiddenGems: Array<{
    name: string;
    description: string;
    cost: string;
    category: string;
  }>;
  localTransport: Array<{
    type: string;
    cost: string;
    insiderTip: string;
  }>;
  foodGuide: Array<{
    dish: string;
    whereToFind: string;
    cost: string;
    insiderTip: string;
  }>;
  culturalEtiquette: Array<{ topic: string; advice: string }>;
  topExperiences: Array<{
    name: string;
    description: string;
    cost: string;
    duration: string;
  }>;
  safetyTips: string[];
  weather: {
    avgTempHigh: string;
    avgTempLow: string;
    rainyMonths: string;
  };
  currency: {
    code: string;
    tippingPercent: string;
    avgMealCost: string;
    dailyTransportCost: string;
  };
}

function SectionHeader({
  title,
  icon,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
}) {
  const { theme } = useTheme();
  return (
    <View style={sectionStyles.header}>
      <View
        style={[
          sectionStyles.iconContainer,
          { backgroundColor: `${theme.accent}15` },
        ]}
      >
        <Feather name={icon} size={20} color={theme.accent} />
      </View>
      <ThemedText type="h3">{title}</ThemedText>
    </View>
  );
}

function AnimatedCard({
  children,
  style,
  testID,
}: {
  children: React.ReactNode;
  style?: any;
  testID?: string;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[animatedStyle, style]}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      testID={testID}
    >
      {children}
    </AnimatedPressable>
  );
}

function BudgetTipCard({
  tip,
  savings,
  index,
}: {
  tip: string;
  savings: string;
  index: number;
}) {
  const { theme } = useTheme();
  return (
    <AnimatedCard
      style={[
        styles.budgetCard,
        { backgroundColor: theme.backgroundDefault },
        Shadows.card,
      ]}
      testID={`budget-tip-${index}`}
    >
      <View style={styles.budgetCardInner}>
        <View
          style={[styles.budgetIconWrap, { backgroundColor: "#27AE6015" }]}
        >
          <Feather name="trending-down" size={18} color="#27AE60" />
        </View>
        <View style={styles.budgetTextWrap}>
          <ThemedText type="small" style={{ flex: 1 }}>
            {tip}
          </ThemedText>
          <View style={[styles.savingsBadge, { backgroundColor: "#27AE6015" }]}>
            <ThemedText
              type="caption"
              style={{ color: "#27AE60", fontWeight: "700" }}
            >
              {savings}
            </ThemedText>
          </View>
        </View>
      </View>
    </AnimatedCard>
  );
}

function HiddenGemCard({
  gem,
  index,
}: {
  gem: GuideData["hiddenGems"][0];
  index: number;
}) {
  const { theme } = useTheme();
  const categoryColor =
    CATEGORY_COLORS[gem.category?.toLowerCase()] || theme.primary;
  const categoryIcon =
    CATEGORY_ICONS[gem.category?.toLowerCase()] || "map-pin";

  const costColor =
    gem.cost?.toLowerCase() === "free"
      ? "#27AE60"
      : gem.cost?.toLowerCase() === "cheap"
        ? "#2980B9"
        : "#E67E22";

  return (
    <AnimatedCard
      style={[
        styles.gemCard,
        { backgroundColor: theme.backgroundDefault },
        Shadows.card,
      ]}
      testID={`hidden-gem-${index}`}
    >
      <LinearGradient
        colors={[categoryColor, `${categoryColor}CC`]}
        style={styles.gemAccent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Feather name={categoryIcon} size={20} color="#FFF" />
      </LinearGradient>
      <View style={styles.gemContent}>
        <View style={styles.gemHeaderRow}>
          <ThemedText type="label" style={{ flex: 1 }} numberOfLines={1}>
            {gem.name}
          </ThemedText>
          <View style={[styles.costBadge, { backgroundColor: `${costColor}15` }]}>
            <ThemedText type="caption" style={{ color: costColor, fontWeight: "700" }}>
              {gem.cost}
            </ThemedText>
          </View>
        </View>
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
          numberOfLines={3}
        >
          {gem.description}
        </ThemedText>
      </View>
    </AnimatedCard>
  );
}

function TransportCard({
  transport,
  index,
}: {
  transport: GuideData["localTransport"][0];
  index: number;
}) {
  const { theme } = useTheme();
  return (
    <AnimatedCard
      style={[
        styles.transportCard,
        { backgroundColor: theme.backgroundDefault },
        Shadows.card,
      ]}
      testID={`transport-${index}`}
    >
      <View style={styles.transportHeader}>
        <View
          style={[
            styles.transportIconWrap,
            { backgroundColor: `${theme.primary}15` },
          ]}
        >
          <Feather name="navigation" size={16} color={theme.primary} />
        </View>
        <ThemedText type="label" style={{ flex: 1 }}>
          {transport.type}
        </ThemedText>
        <View
          style={[
            styles.transportCostBadge,
            { backgroundColor: `${theme.accent}15` },
          ]}
        >
          <ThemedText type="caption" style={{ color: theme.accent, fontWeight: "700" }}>
            {transport.cost}
          </ThemedText>
        </View>
      </View>
      <View style={styles.transportTipRow}>
        <Feather name="info" size={12} color={theme.textSecondary} />
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, flex: 1, marginLeft: Spacing.xs }}
        >
          {transport.insiderTip}
        </ThemedText>
      </View>
    </AnimatedCard>
  );
}

function FoodCard({
  food,
  index,
}: {
  food: GuideData["foodGuide"][0];
  index: number;
}) {
  const { theme } = useTheme();
  return (
    <AnimatedCard
      style={[
        styles.foodCard,
        { backgroundColor: theme.backgroundDefault },
        Shadows.card,
      ]}
      testID={`food-${index}`}
    >
      <View style={styles.foodHeader}>
        <View style={[styles.foodIconWrap, { backgroundColor: "#E67E2215" }]}>
          <Feather name="coffee" size={16} color="#E67E22" />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="label">{food.dish}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {food.whereToFind}
          </ThemedText>
        </View>
        <View
          style={[
            styles.foodCostBadge,
            { backgroundColor: `${theme.accent}15` },
          ]}
        >
          <ThemedText type="caption" style={{ color: theme.accent, fontWeight: "700" }}>
            {food.cost}
          </ThemedText>
        </View>
      </View>
      <View style={styles.foodTipRow}>
        <Feather name="star" size={12} color="#E67E22" />
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, flex: 1, marginLeft: Spacing.xs }}
        >
          {food.insiderTip}
        </ThemedText>
      </View>
    </AnimatedCard>
  );
}

function EtiquetteCard({
  item,
  index,
}: {
  item: GuideData["culturalEtiquette"][0];
  index: number;
}) {
  const { theme } = useTheme();
  return (
    <AnimatedCard
      style={[
        styles.etiquetteCard,
        { backgroundColor: theme.backgroundDefault },
        Shadows.card,
      ]}
      testID={`etiquette-${index}`}
    >
      <View style={styles.etiquetteHeader}>
        <View
          style={[styles.etiquetteIconWrap, { backgroundColor: "#6B3FA015" }]}
        >
          <Feather name="book" size={16} color="#6B3FA0" />
        </View>
        <ThemedText type="label" style={{ flex: 1 }}>
          {item.topic}
        </ThemedText>
      </View>
      <ThemedText
        type="caption"
        style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
      >
        {item.advice}
      </ThemedText>
    </AnimatedCard>
  );
}

function ExperienceCard({
  experience,
  index,
}: {
  experience: GuideData["topExperiences"][0];
  index: number;
}) {
  const { theme, isDark } = useTheme();
  return (
    <AnimatedCard
      style={[
        styles.experienceCard,
        { backgroundColor: theme.backgroundDefault },
        Shadows.card,
      ]}
      testID={`experience-${index}`}
    >
      <LinearGradient
        colors={isDark ? ["#1A4D2E", "#0D2617"] : ["#1A4D2E", "#2D6B45"]}
        style={styles.experienceGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Feather name="star" size={22} color="#DAA520" />
      </LinearGradient>
      <View style={styles.experienceContent}>
        <ThemedText type="label" numberOfLines={1}>
          {experience.name}
        </ThemedText>
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
          numberOfLines={2}
        >
          {experience.description}
        </ThemedText>
        <View style={styles.experienceMeta}>
          <View style={styles.experienceMetaItem}>
            <Feather name="dollar-sign" size={12} color={theme.accent} />
            <ThemedText type="caption" style={{ color: theme.accent, marginLeft: 2 }}>
              {experience.cost}
            </ThemedText>
          </View>
          <View style={styles.experienceMetaItem}>
            <Feather name="clock" size={12} color={theme.textSecondary} />
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginLeft: 2 }}
            >
              {experience.duration}
            </ThemedText>
          </View>
        </View>
      </View>
    </AnimatedCard>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.infoCard,
        { backgroundColor: theme.backgroundDefault },
        Shadows.card,
      ]}
    >
      <View
        style={[styles.infoCardIcon, { backgroundColor: `${theme.accent}15` }]}
      >
        <Feather name={icon} size={16} color={theme.accent} />
      </View>
      <ThemedText type="caption" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
      <ThemedText type="label" style={{ marginTop: 2 }} numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

function EventCard({
  event,
  index,
  onPress,
}: {
  event: DiscoveredEvent;
  index: number;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const typeColor = EVENT_TYPE_COLORS[event.eventType?.toLowerCase()] ||
    EVENT_TYPE_COLORS[event.category?.toLowerCase()] || "#DAA520";
  const typeIcon = EVENT_TYPE_ICONS[event.eventType?.toLowerCase()] ||
    EVENT_TYPE_ICONS[event.category?.toLowerCase()] || "calendar";
  const isFeatured = index === 0;

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[
        animatedStyle,
        eventStyles.card,
        { backgroundColor: theme.backgroundDefault },
        Shadows.card,
        isFeatured ? { borderWidth: 1.5, borderColor: "#DAA520" } : null,
      ]}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      testID={`event-card-${index}`}
    >
      <LinearGradient
        colors={[typeColor, `${typeColor}CC`]}
        style={eventStyles.cardAccent}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Feather name={typeIcon} size={22} color="#FFF" />
        {isFeatured ? (
          <View style={eventStyles.featuredBadge}>
            <Feather name="award" size={10} color="#DAA520" />
          </View>
        ) : null}
      </LinearGradient>
      <View style={eventStyles.cardContent}>
        <View style={eventStyles.cardHeader}>
          <ThemedText type="label" style={{ flex: 1 }} numberOfLines={1}>
            {event.title}
          </ThemedText>
          {isFeatured ? (
            <View style={eventStyles.promotedTag}>
              <ThemedText style={eventStyles.promotedText}>
                FEATURED
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
          numberOfLines={2}
        >
          {event.description}
        </ThemedText>
        <View style={eventStyles.metaRow}>
          <View style={eventStyles.metaItem}>
            <Feather name="map-pin" size={11} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 3 }}>
              {event.venue}
            </ThemedText>
          </View>
          <View style={eventStyles.metaItem}>
            <Feather name="calendar" size={11} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 3 }}>
              {event.monthsActive}
            </ThemedText>
          </View>
        </View>
        <View style={eventStyles.ticketRow}>
          <View style={[eventStyles.ticketBadge, { backgroundColor: `${typeColor}15` }]}>
            <Feather name="tag" size={11} color={typeColor} />
            <ThemedText type="caption" style={{ color: typeColor, fontWeight: "700", marginLeft: 3 }}>
              {event.ticketInfo}
            </ThemedText>
          </View>
          <View style={eventStyles.attendanceBadge}>
            <Feather name="users" size={11} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 3 }}>
              {event.estimatedAttendance}
            </ThemedText>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

function EventDetailModal({
  event,
  visible,
  onClose,
  isLocked,
  onUnlock,
}: {
  event: DiscoveredEvent | null;
  visible: boolean;
  onClose: () => void;
  isLocked: boolean;
  onUnlock: () => void;
}) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  if (!event) return null;

  const typeColor = EVENT_TYPE_COLORS[event.eventType?.toLowerCase()] ||
    EVENT_TYPE_COLORS[event.category?.toLowerCase()] || "#DAA520";
  const typeIcon = EVENT_TYPE_ICONS[event.eventType?.toLowerCase()] ||
    EVENT_TYPE_ICONS[event.category?.toLowerCase()] || "calendar";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[eventStyles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[eventStyles.modalHeader, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            onPress={onClose}
            style={[eventStyles.modalClose, { backgroundColor: theme.backgroundDefault }]}
            testID="button-close-event"
          >
            <Feather name="x" size={20} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing["2xl"] }}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={isDark ? [typeColor, `${typeColor}55`] : [typeColor, `${typeColor}CC`]}
            style={eventStyles.modalBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={eventStyles.modalBannerIcon}>
              <Feather name={typeIcon} size={36} color="#FFF" />
            </View>
            <ThemedText style={eventStyles.modalTitle}>
              {event.title}
            </ThemedText>
            <View style={eventStyles.modalBannerMeta}>
              <View style={eventStyles.modalBannerBadge}>
                <Feather name="map-pin" size={13} color="#FFF" />
                <ThemedText style={eventStyles.modalBannerText}>
                  {event.venue}
                </ThemedText>
              </View>
              <View style={eventStyles.modalBannerBadge}>
                <Feather name="calendar" size={13} color="#FFF" />
                <ThemedText style={eventStyles.modalBannerText}>
                  {event.monthsActive}
                </ThemedText>
              </View>
            </View>
          </LinearGradient>

          <View style={eventStyles.modalBody}>
            <ThemedText type="body" style={{ lineHeight: 22 }}>
              {event.description}
            </ThemedText>

            <View style={eventStyles.modalInfoRow}>
              <View style={[eventStyles.modalInfoCard, { backgroundColor: theme.backgroundDefault }]}>
                <Feather name="users" size={18} color={typeColor} />
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                  Attendance
                </ThemedText>
                <ThemedText type="label" style={{ marginTop: 2 }}>
                  {event.estimatedAttendance}
                </ThemedText>
              </View>
              <View style={[eventStyles.modalInfoCard, { backgroundColor: theme.backgroundDefault }]}>
                <Feather name="tag" size={18} color={typeColor} />
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                  Tickets
                </ThemedText>
                <ThemedText type="label" style={{ marginTop: 2 }}>
                  {event.ticketInfo}
                </ThemedText>
              </View>
            </View>

            {isLocked ? (
              <View style={eventStyles.paywallSection}>
                <LinearGradient
                  colors={isDark ? ["#1A4D2E", "#0D2617"] : ["#1A4D2E", "#2D6B45"]}
                  style={eventStyles.paywallCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Feather name="lock" size={28} color="#DAA520" />
                  <ThemedText style={eventStyles.paywallTitle}>
                    Unlock Full Event Details
                  </ThemedText>
                  <ThemedText style={eventStyles.paywallDesc}>
                    Get insider tips, highlights, venue directions, and exclusive ticket links
                  </ThemedText>
                  <Pressable
                    style={eventStyles.paywallButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onUnlock();
                    }}
                    testID="button-unlock-event"
                  >
                    <Feather name="zap" size={16} color="#1A4D2E" />
                    <ThemedText style={eventStyles.paywallButtonText}>
                      Unlock for $1.99
                    </ThemedText>
                  </Pressable>
                </LinearGradient>
              </View>
            ) : (
              <>
                {event.highlights?.length > 0 ? (
                  <View style={{ marginTop: Spacing.xl }}>
                    <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
                      Highlights
                    </ThemedText>
                    {event.highlights.map((h, i) => (
                      <View key={i} style={eventStyles.highlightRow}>
                        <View style={[eventStyles.highlightDot, { backgroundColor: typeColor }]} />
                        <ThemedText type="small" style={{ flex: 1 }}>
                          {h}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                ) : null}

                {event.insiderTip ? (
                  <View style={[eventStyles.tipCard, { backgroundColor: `${typeColor}10` }]}>
                    <View style={eventStyles.tipHeader}>
                      <Feather name="zap" size={16} color={typeColor} />
                      <ThemedText type="label" style={{ color: typeColor, marginLeft: Spacing.sm }}>
                        Insider Tip
                      </ThemedText>
                    </View>
                    <ThemedText type="small" style={{ marginTop: Spacing.sm, lineHeight: 20 }}>
                      {event.insiderTip}
                    </ThemedText>
                  </View>
                ) : null}
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function PromoteEventBanner({ destination }: { destination: string }) {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[animatedStyle, eventStyles.promoteBanner, Shadows.card]}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate("EventSubmission", { destination });
      }}
      testID="button-promote-event"
    >
      <LinearGradient
        colors={["#1A4D2E", "#2D6B45"]}
        style={eventStyles.promoteBannerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={eventStyles.promoteLeft}>
          <View style={eventStyles.promoteIconWrap}>
            <Feather name="trending-up" size={20} color="#DAA520" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={eventStyles.promoteTitle}>
              Hosting an event in {destination}?
            </ThemedText>
            <ThemedText style={eventStyles.promoteDesc}>
              Advertise to thousands of travelers. From $29.99
            </ThemedText>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
      </LinearGradient>
    </AnimatedPressable>
  );
}

export function DestinationGuideScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();

  const { destination, country } = route.params as {
    destination: string;
    country?: string;
  };

  const [selectedEvent, setSelectedEvent] = useState<DiscoveredEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [unlockedEvents, setUnlockedEvents] = useState<Set<string>>(new Set());

  const guideMutation = useMutation({
    mutationFn: async (data: { destination: string; country?: string }) => {
      const response = await apiRequest("POST", "/api/destination-guide", data);
      return response.json();
    },
  });

  const eventsMutation = useMutation({
    mutationFn: async (data: { destination: string; country?: string }) => {
      const response = await apiRequest("POST", "/api/destination-events/discover", data);
      return response.json();
    },
  });

  useEffect(() => {
    guideMutation.mutate({ destination, country });
    eventsMutation.mutate({ destination, country });
  }, [destination]);

  const raw: any = guideMutation.data;
  const guide: GuideData | null = raw
    ? {
        tagline: raw.tagline || "",
        bestTimeToVisit: typeof raw.bestTimeToVisit === "object"
          ? raw.bestTimeToVisit.recommended || raw.bestTimeToVisit.peak || ""
          : raw.bestTimeToVisit || "",
        budgetTips: (raw.budgetTips || []).map((t: any) => ({
          tip: t.tip || "",
          estimatedSavings: t.savingsEstimate || t.estimatedSavings || "",
        })),
        hiddenGems: (raw.hiddenGems || []).map((g: any) => ({
          name: g.name || "",
          description: g.description || "",
          cost: g.cost || "unknown",
          category: g.category || "culture",
        })),
        localTransport: (raw.localTransport || []).map((t: any) => ({
          type: t.type || "",
          cost: t.cost || "",
          insiderTip: t.tip || t.insiderTip || "",
        })),
        foodGuide: (raw.foodGuide || []).map((f: any) => ({
          dish: f.item || f.dish || "",
          whereToFind: f.where || f.whereToFind || "",
          cost: f.cost || "",
          insiderTip: f.tip || f.insiderTip || "",
        })),
        culturalEtiquette: (raw.culturalEtiquette || []).map((c: any) => ({
          topic: c.topic || "",
          advice: c.advice || "",
        })),
        topExperiences: (raw.topExperiences || []).map((e: any) => ({
          name: e.name || "",
          description: e.description || "",
          cost: e.cost || "",
          duration: e.duration || "",
        })),
        safetyTips: raw.safetyTips || [],
        weather: {
          avgTempHigh: raw.weather?.avgTempHigh || "",
          avgTempLow: raw.weather?.avgTempLow || "",
          rainyMonths: raw.weather?.rainyMonths || "",
        },
        currency: {
          code: raw.currencyInfo?.code || raw.currency?.code || "",
          tippingPercent: raw.currencyInfo?.tipPercentage || raw.currency?.tippingPercent || "",
          avgMealCost: raw.currencyInfo?.avgMealCost || raw.currency?.avgMealCost || "",
          dailyTransportCost: raw.currencyInfo?.avgTransportDaily || raw.currency?.dailyTransportCost || "",
        },
      }
    : null;

  if (guideMutation.isPending) {
    return (
      <View
        style={[
          styles.centerContainer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: Spacing.md,
          },
        ]}
      >
        <LinearGradient
          colors={isDark ? ["#1A4D2E", "#0D2617"] : ["#1A4D2E", "#2D6B45"]}
          style={styles.loadingGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Feather name="compass" size={48} color="#DAA520" />
        </LinearGradient>
        <ActivityIndicator
          size="large"
          color={theme.accent}
          style={{ marginTop: Spacing["2xl"] }}
        />
        <ThemedText type="h3" style={{ marginTop: Spacing.lg, textAlign: "center" }}>
          Creating your guide for {destination}...
        </ThemedText>
        <ThemedText
          type="caption"
          style={{
            color: theme.textSecondary,
            marginTop: Spacing.sm,
            textAlign: "center",
          }}
        >
          Discovering hidden gems, local tips, and more
        </ThemedText>
      </View>
    );
  }

  if (guideMutation.isError) {
    return (
      <View
        style={[
          styles.centerContainer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: Spacing.md,
          },
        ]}
      >
        <View
          style={[styles.errorIconWrap, { backgroundColor: `${theme.error}15` }]}
        >
          <Feather name="alert-circle" size={40} color={theme.error} />
        </View>
        <ThemedText type="h3" style={{ marginTop: Spacing.lg, textAlign: "center" }}>
          Something went wrong
        </ThemedText>
        <ThemedText
          type="caption"
          style={{
            color: theme.textSecondary,
            marginTop: Spacing.sm,
            textAlign: "center",
            paddingHorizontal: Spacing["3xl"],
          }}
        >
          {guideMutation.error?.message || "Failed to generate guide"}
        </ThemedText>
        <Pressable
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            guideMutation.mutate({ destination, country });
          }}
          testID="button-retry"
        >
          <Feather name="refresh-cw" size={18} color="#FFF" />
          <ThemedText type="label" style={{ color: "#FFF", marginLeft: Spacing.sm }}>
            Try Again
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  if (!guide) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: theme.backgroundRoot, paddingTop: Spacing.md },
        ]}
      >
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: Spacing.md,
        paddingBottom: insets.bottom + Spacing.xl,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroSection}>
        <LinearGradient
          colors={isDark ? ["#1A4D2E", "#0D2617"] : ["#1A4D2E", "#2D6B45"]}
          style={styles.heroBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroIconRow}>
              <View style={styles.heroIconWrap}>
                <Feather name="map" size={24} color="#DAA520" />
              </View>
            </View>
            <ThemedText style={styles.heroTitle}>
              {destination}
            </ThemedText>
            {country ? (
              <ThemedText style={styles.heroCountry}>
                {country}
              </ThemedText>
            ) : null}
            <ThemedText style={styles.heroTagline}>
              {guide.tagline}
            </ThemedText>
            <View style={styles.bestTimeBadge}>
              <Feather name="calendar" size={14} color="#DAA520" />
              <ThemedText style={styles.bestTimeText}>
                Best Time: {guide.bestTimeToVisit}
              </ThemedText>
            </View>
          </View>
        </LinearGradient>
      </View>

      {eventsMutation.data?.events?.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Mega Events" icon="zap" />
          {(eventsMutation.data.events as DiscoveredEvent[]).map(
            (event: DiscoveredEvent, i: number) => (
              <EventCard
                key={i}
                event={event}
                index={i}
                onPress={() => {
                  setSelectedEvent(event);
                  setShowEventModal(true);
                }}
              />
            )
          )}
          <PromoteEventBanner destination={destination} />
        </View>
      ) : eventsMutation.isPending ? (
        <View style={styles.section}>
          <SectionHeader title="Mega Events" icon="zap" />
          <View style={{ alignItems: "center", paddingVertical: Spacing.xl }}>
            <ActivityIndicator size="small" color={theme.accent} />
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
            >
              Discovering events...
            </ThemedText>
          </View>
        </View>
      ) : null}

      <EventDetailModal
        event={selectedEvent}
        visible={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setSelectedEvent(null);
        }}
        isLocked={
          selectedEvent
            ? !unlockedEvents.has(selectedEvent.title)
            : true
        }
        onUnlock={async () => {
          if (selectedEvent) {
            try {
              const dbEvents = eventsMutation.data?.events || eventsMutation.data || [];
              const dbEvent = dbEvents.find((e: any) => e.title === selectedEvent.title);
              if (dbEvent?.id) {
                const response = await apiRequest("POST", `/api/destination-events/${dbEvent.id}/unlock`, {
                  deviceId: "mobile",
                });
                const result = await response.json();
                if (result.url) {
                  Linking.openURL(result.url);
                }
              }
              setUnlockedEvents(prev => {
                const next = new Set(prev);
                next.add(selectedEvent.title);
                return next;
              });
            } catch (err) {
              Alert.alert("Payment Error", "Could not process payment. Please try again.");
            }
          }
        }}
      />

      {guide.budgetTips?.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Save Money" icon="dollar-sign" />
          {guide.budgetTips.map((tip, i) => (
            <BudgetTipCard
              key={i}
              tip={tip.tip}
              savings={tip.estimatedSavings}
              index={i}
            />
          ))}
        </View>
      ) : null}

      {guide.hiddenGems?.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Hidden Gems" icon="map-pin" />
          {guide.hiddenGems.map((gem, i) => (
            <HiddenGemCard key={i} gem={gem} index={i} />
          ))}
        </View>
      ) : null}

      {guide.localTransport?.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Getting Around" icon="navigation" />
          {guide.localTransport.map((transport, i) => (
            <TransportCard key={i} transport={transport} index={i} />
          ))}
        </View>
      ) : null}

      {guide.foodGuide?.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Local Flavors" icon="coffee" />
          {guide.foodGuide.map((food, i) => (
            <FoodCard key={i} food={food} index={i} />
          ))}
        </View>
      ) : null}

      {guide.culturalEtiquette?.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Local Customs" icon="book" />
          {guide.culturalEtiquette.map((item, i) => (
            <EtiquetteCard key={i} item={item} index={i} />
          ))}
        </View>
      ) : null}

      {guide.topExperiences?.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Must-Do Experiences" icon="star" />
          {guide.topExperiences.map((exp, i) => (
            <ExperienceCard key={i} experience={exp} index={i} />
          ))}
        </View>
      ) : null}

      {guide.safetyTips?.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Stay Safe" icon="shield" />
          <View
            style={[
              styles.safetyContainer,
              { backgroundColor: theme.backgroundDefault },
              Shadows.card,
            ]}
          >
            {guide.safetyTips.map((tip, i) => (
              <View key={i} style={styles.safetyRow}>
                <View
                  style={[
                    styles.safetyBullet,
                    { backgroundColor: `${theme.primary}15` },
                  ]}
                >
                  <Feather name="check" size={12} color={theme.primary} />
                </View>
                <ThemedText
                  type="small"
                  style={{ flex: 1, color: theme.text }}
                >
                  {tip}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {guide.weather || guide.currency ? (
        <View style={styles.section}>
          <SectionHeader title="Good to Know" icon="info" />
          <View style={styles.infoGrid}>
            {guide.weather ? (
              <>
                <InfoCard
                  icon="thermometer"
                  label="High Temp"
                  value={guide.weather.avgTempHigh}
                />
                <InfoCard
                  icon="thermometer"
                  label="Low Temp"
                  value={guide.weather.avgTempLow}
                />
                <InfoCard
                  icon="cloud-rain"
                  label="Rainy Months"
                  value={guide.weather.rainyMonths}
                />
              </>
            ) : null}
            {guide.currency ? (
              <>
                <InfoCard
                  icon="credit-card"
                  label="Currency"
                  value={guide.currency.code}
                />
                <InfoCard
                  icon="percent"
                  label="Tipping"
                  value={guide.currency.tippingPercent}
                />
                <InfoCard
                  icon="shopping-bag"
                  label="Avg Meal"
                  value={guide.currency.avgMealCost}
                />
                <InfoCard
                  icon="truck"
                  label="Daily Transport"
                  value={guide.currency.dailyTransportCost}
                />
              </>
            ) : null}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const sectionStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  loadingGradient: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing["2xl"],
  },
  heroSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  heroBanner: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    padding: Spacing["2xl"],
  },
  heroContent: {
    alignItems: "center",
  },
  heroIconRow: {
    marginBottom: Spacing.lg,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    fontFamily: "CormorantGaramond_700Bold",
  },
  heroCountry: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    marginTop: Spacing.xs,
    fontFamily: "Inter_500Medium",
  },
  heroTagline: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginTop: Spacing.md,
    lineHeight: 22,
    fontFamily: "Inter_500Medium",
    paddingHorizontal: Spacing.md,
  },
  bestTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  bestTimeText: {
    fontSize: 13,
    color: "#DAA520",
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  budgetCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  budgetCardInner: {
    flexDirection: "row",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  budgetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  budgetTextWrap: {
    flex: 1,
    gap: Spacing.sm,
  },
  savingsBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  gemCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.md,
    flexDirection: "row",
  },
  gemAccent: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  gemContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  gemHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  costBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  transportCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  transportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  transportIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  transportCostBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  transportTipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: Spacing.md,
    paddingLeft: Spacing["4xl"] + Spacing.md,
  },
  foodCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  foodHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  foodIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  foodCostBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  foodTipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: Spacing.md,
    paddingLeft: Spacing["4xl"] + Spacing.md,
  },
  etiquetteCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  etiquetteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  etiquetteIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  experienceCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.md,
    flexDirection: "row",
  },
  experienceGradient: {
    width: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  experienceContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  experienceMeta: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  experienceMetaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  safetyContainer: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    padding: Spacing.lg,
  },
  safetyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  safetyBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  infoCard: {
    width: (width - Spacing.lg * 2 - Spacing.md) / 2,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    padding: Spacing.lg,
  },
  infoCardIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
});

const eventStyles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.md,
    flexDirection: "row",
  },
  cardAccent: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  featuredBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  promotedTag: {
    backgroundColor: "#DAA52020",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  promotedText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#DAA520",
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  ticketRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  ticketBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },
  attendanceBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBanner: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing["2xl"],
    alignItems: "center",
  },
  modalBannerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    fontFamily: "CormorantGaramond_700Bold",
  },
  modalBannerMeta: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.lg,
  },
  modalBannerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  modalBannerText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  modalBody: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  modalInfoRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  modalInfoCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: "center",
  },
  paywallSection: {
    marginTop: Spacing.xl,
  },
  paywallCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing["2xl"],
    alignItems: "center",
  },
  paywallTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: Spacing.lg,
    fontFamily: "CormorantGaramond_700Bold",
  },
  paywallDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  paywallButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DAA520",
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  paywallButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A4D2E",
  },
  highlightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  highlightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  tipCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  promoteBanner: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginTop: Spacing.sm,
  },
  promoteBannerGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  promoteLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  promoteIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  promoteTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  promoteDesc: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
});
