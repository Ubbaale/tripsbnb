import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

const { width } = Dimensions.get("window");

const TIER_EMOJIS: Record<string, string> = {
  Bronze: "\u{1F949}",
  Silver: "\u{1F948}",
  Gold: "\u{1F947}",
  Platinum: "\u{1F48E}",
};

const TIER_BENEFITS = [
  { name: "Bronze", emoji: "\u{1F949}", benefit: "Earn 1pt/$1 spent", threshold: 0 },
  { name: "Silver", emoji: "\u{1F948}", benefit: "3% bonus discount", threshold: 2500 },
  { name: "Gold", emoji: "\u{1F947}", benefit: "5% bonus + priority support", threshold: 10000 },
  { name: "Platinum", emoji: "\u{1F48E}", benefit: "8% bonus + free upgrades", threshold: 25000 },
];

const EARN_METHODS = [
  { emoji: "\u{1F3E8}", label: "Book accommodation", detail: "1 point per $1" },
  { emoji: "\u{1F981}", label: "Book safari", detail: "2 points per $1" },
  { emoji: "\u{1F37D}\uFE0F", label: "Book dining", detail: "1 point per $1" },
  { emoji: "\u{1F465}", label: "Refer a friend", detail: "500 bonus points" },
  { emoji: "\u{1F4E6}", label: "Book a bundle", detail: "3 points per $1" },
];

function AnimatedPressable({
  children,
  onPress,
  style,
  testID,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  testID?: string;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 150 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onPress) onPress();
      }}
      testID={testID}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

export function LoyaltyRewardsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("@tripverse_device_id").then((id) => {
      setDeviceId(id);
    });
  }, []);

  const { data: loyaltyData, isLoading: loyaltyLoading } = useQuery<any>({
    queryKey: ["/api/loyalty", deviceId],
    enabled: !!deviceId,
  });

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery<any>({
    queryKey: [`/api/loyalty/${deviceId}/transactions`],
    enabled: !!deviceId,
  });

  const totalPoints = loyaltyData?.totalPoints ?? 0;
  const lifetimePoints = loyaltyData?.lifetimePoints ?? 0;
  const currentTier = loyaltyData?.tier ?? "Bronze";
  const pointsToNextTier = loyaltyData?.pointsToNextTier ?? 2500;
  const nextTierInfo = loyaltyData?.nextTierInfo;
  const currentTierInfo = loyaltyData?.currentTierInfo;

  const currentTierThreshold = currentTierInfo?.minPoints ?? 0;
  const nextTierThreshold = nextTierInfo?.minPoints ?? 2500;
  const progressRange = nextTierThreshold - currentTierThreshold;
  const progressValue = progressRange > 0 ? (lifetimePoints - currentTierThreshold) / progressRange : 1;
  const progressPercent = Math.min(Math.max(progressValue, 0), 1);

  const tierEmoji = TIER_EMOJIS[currentTier] ?? "\u{1F949}";
  const transactions = Array.isArray(transactionsData) ? transactionsData : [];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loyaltyLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.backgroundRoot, paddingTop: Spacing.md },
        ]}
      >
        <ActivityIndicator size="large" color="#DAA520" />
        <ThemedText style={{ marginTop: Spacing.md, opacity: 0.6 }}>
          Loading rewards...
        </ThemedText>
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
      <AnimatedPressable
        style={[styles.tierCard]}
        testID="card-tier-progress"
      >
        <LinearGradient
          colors={isDark ? ["#1A4D2E", "#0F2D1A"] : ["#1A4D2E", "#2D6A4F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tierCardGradient}
        >
          <View style={styles.tierHeader}>
            <ThemedText style={styles.tierEmoji}>{tierEmoji}</ThemedText>
            <View style={styles.tierHeaderText}>
              <ThemedText style={styles.tierLabel}>Current Tier</ThemedText>
              <ThemedText style={styles.tierName}>{currentTier}</ThemedText>
            </View>
            <Feather name="award" size={28} color="#DAA520" />
          </View>

          <View style={styles.pointsSection}>
            <ThemedText style={styles.pointsValue}>
              {totalPoints.toLocaleString()}
            </ThemedText>
            <ThemedText style={styles.pointsLabel}>Available Points</ThemedText>
          </View>

          <View style={styles.progressSection}>
            <View
              style={[
                styles.progressBarBg,
                { backgroundColor: "rgba(255,255,255,0.15)" },
              ]}
            >
              <LinearGradient
                colors={["#DAA520", "#F5D680"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progressPercent * 100}%` }]}
              />
            </View>
            {nextTierInfo ? (
              <ThemedText style={styles.progressText}>
                {pointsToNextTier.toLocaleString()} points to {nextTierInfo.name}
              </ThemedText>
            ) : (
              <ThemedText style={styles.progressText}>
                You've reached the highest tier!
              </ThemedText>
            )}
          </View>

          <View style={styles.lifetimeRow}>
            <Feather name="trending-up" size={14} color="rgba(255,255,255,0.6)" />
            <ThemedText style={styles.lifetimeText}>
              {lifetimePoints.toLocaleString()} lifetime points
            </ThemedText>
          </View>
        </LinearGradient>
      </AnimatedPressable>

      <View style={styles.section}>
        <ThemedText type="label" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          TIER BENEFITS
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tierBenefitsContainer}
        >
          {TIER_BENEFITS.map((tier) => {
            const isCurrentTier = tier.name === currentTier;
            return (
              <AnimatedPressable
                key={tier.name}
                style={[
                  styles.tierBenefitCard,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: isCurrentTier ? "#DAA520" : theme.border,
                    borderWidth: isCurrentTier ? 2 : 1,
                  },
                ]}
                testID={`card-tier-${tier.name.toLowerCase()}`}
              >
                <ThemedText style={styles.tierBenefitEmoji}>{tier.emoji}</ThemedText>
                <ThemedText
                  type="label"
                  style={[
                    styles.tierBenefitName,
                    { color: isCurrentTier ? "#DAA520" : theme.text },
                  ]}
                >
                  {tier.name}
                </ThemedText>
                {tier.threshold > 0 ? (
                  <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
                    {tier.threshold.toLocaleString()} pts
                  </ThemedText>
                ) : null}
                <View style={styles.tierBenefitDivider} />
                <ThemedText
                  type="caption"
                  style={[styles.tierBenefitDetail, { color: theme.textSecondary }]}
                >
                  {tier.benefit}
                </ThemedText>
                {isCurrentTier ? (
                  <View style={styles.currentBadge}>
                    <ThemedText style={styles.currentBadgeText}>Current</ThemedText>
                  </View>
                ) : null}
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <ThemedText type="label" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          HOW TO EARN POINTS
        </ThemedText>
        <View
          style={[
            styles.earnCard,
            { backgroundColor: theme.backgroundDefault },
            Shadows.card,
          ]}
        >
          {EARN_METHODS.map((method, index) => (
            <View key={method.label}>
              <View style={styles.earnRow}>
                <ThemedText style={styles.earnEmoji}>{method.emoji}</ThemedText>
                <View style={styles.earnTextContainer}>
                  <ThemedText type="label" style={{ color: theme.text }}>
                    {method.label}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    {method.detail}
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={18} color={theme.textSecondary} />
              </View>
              {index < EARN_METHODS.length - 1 ? (
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
              ) : null}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="label" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          POINTS HISTORY
        </ThemedText>
        {transactionsLoading ? (
          <ActivityIndicator size="small" color="#DAA520" style={{ marginTop: Spacing.lg }} />
        ) : transactions.length > 0 ? (
          <View
            style={[
              styles.historyCard,
              { backgroundColor: theme.backgroundDefault },
              Shadows.card,
            ]}
          >
            {transactions.map((tx: any, index: number) => (
              <View key={`${tx.createdAt}-${index}`}>
                <View style={styles.historyRow}>
                  <View
                    style={[
                      styles.historyIcon,
                      {
                        backgroundColor:
                          tx.points > 0 ? "rgba(26,77,46,0.1)" : "rgba(255,59,48,0.1)",
                      },
                    ]}
                  >
                    <Feather
                      name={tx.points > 0 ? "plus" : "minus"}
                      size={16}
                      color={tx.points > 0 ? "#1A4D2E" : "#FF3B30"}
                    />
                  </View>
                  <View style={styles.historyTextContainer}>
                    <ThemedText type="label" style={{ color: theme.text }}>
                      {tx.description}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      {formatDate(tx.createdAt)}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="label"
                    style={{
                      color: tx.points > 0 ? "#1A4D2E" : "#FF3B30",
                      fontWeight: "700",
                    }}
                  >
                    {tx.points > 0 ? "+" : ""}
                    {tx.points}
                  </ThemedText>
                </View>
                {index < transactions.length - 1 ? (
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <View
            style={[
              styles.emptyHistory,
              { backgroundColor: theme.backgroundDefault },
              Shadows.card,
            ]}
          >
            <Feather name="clock" size={32} color={theme.textSecondary} />
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
            >
              No transactions yet
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
            >
              Start booking to earn points!
            </ThemedText>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tierCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    ...Shadows.card,
  },
  tierCardGradient: {
    padding: Spacing.xl,
  },
  tierHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  tierEmoji: {
    fontSize: 36,
    marginRight: Spacing.md,
  },
  tierHeaderText: {
    flex: 1,
  },
  tierLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "500",
  },
  tierName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "CormorantGaramond_700Bold",
  },
  pointsSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  pointsValue: {
    color: "#DAA520",
    fontSize: 42,
    fontWeight: "700",
    fontFamily: "CormorantGaramond_700Bold",
    letterSpacing: 1,
  },
  pointsLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "500",
    marginTop: Spacing.xs,
  },
  progressSection: {
    marginBottom: Spacing.md,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  lifetimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  lifetimeText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    marginLeft: Spacing.lg + Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    opacity: 0.6,
  },
  tierBenefitsContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  tierBenefitCard: {
    width: 140,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    position: "relative",
  },
  tierBenefitEmoji: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  tierBenefitName: {
    marginBottom: Spacing.xs,
  },
  tierBenefitDivider: {
    width: 30,
    height: 2,
    backgroundColor: "rgba(218,165,32,0.3)",
    borderRadius: 1,
    marginVertical: Spacing.sm,
  },
  tierBenefitDetail: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 16,
  },
  currentBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: "#DAA520",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  currentBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  earnCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  earnRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  earnEmoji: {
    fontSize: 28,
    marginRight: Spacing.md,
    width: 36,
    textAlign: "center",
  },
  earnTextContainer: {
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
  historyCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  historyTextContainer: {
    flex: 1,
  },
  emptyHistory: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing["3xl"],
    alignItems: "center",
  },
});
