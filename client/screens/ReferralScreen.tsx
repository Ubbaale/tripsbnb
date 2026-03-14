import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

const { width } = Dimensions.get("window");

const STEPS = [
  { emoji: "\u{1F4E4}", title: "Share your unique code", description: "Send your referral code to friends" },
  { emoji: "\u{1F465}", title: "Friend signs up with your code", description: "They enter your code when joining" },
  { emoji: "\u{1F389}", title: "You both earn bonus points", description: "You: 500pts, Friend: 250pts" },
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
      <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
    </Pressable>
  );
}

export function ReferralScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const qc = useQueryClient();

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [applyCode, setApplyCode] = useState("");
  const [applyMessage, setApplyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copyMessage, setCopyMessage] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("@tripverse_device_id").then((id) => {
      if (id) setDeviceId(id);
    });
  }, []);

  const { data: loyaltyData, isLoading: loyaltyLoading } = useQuery<{
    referralCode: string;
    [key: string]: any;
  }>({
    queryKey: ["/api/loyalty", deviceId],
    enabled: !!deviceId,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<{
    referralCode: string;
    totalReferrals: number;
    totalBonusEarned: number;
  }>({
    queryKey: ["/api/referral", deviceId, "stats"],
    enabled: !!deviceId,
  });

  const applyMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/referral/apply", {
        referralCode: code,
        deviceId,
      });
      return res.json();
    },
    onSuccess: () => {
      setApplyMessage({ type: "success", text: "Referral code applied successfully! You earned 250 bonus points." });
      setApplyCode("");
      qc.invalidateQueries({ queryKey: ["/api/referral", deviceId, "stats"] });
      qc.invalidateQueries({ queryKey: ["/api/loyalty", deviceId] });
    },
    onError: (error: Error) => {
      setApplyMessage({ type: "error", text: error.message || "Failed to apply referral code." });
    },
  });

  const referralCode = loyaltyData?.referralCode || "TV-XXXXXX";
  const totalReferrals = statsData?.totalReferrals ?? 0;
  const totalBonusEarned = statsData?.totalBonusEarned ?? 0;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(referralCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopyMessage(true);
    setTimeout(() => setCopyMessage(false), 2000);
  };

  const handleShare = async () => {
    await Clipboard.setStringAsync(
      `Join Tripsbnb with my referral code: ${referralCode} and earn 250 bonus points!`
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopyMessage(true);
    setTimeout(() => setCopyMessage(false), 2000);
  };

  const handleApply = () => {
    if (!applyCode.trim()) {
      setApplyMessage({ type: "error", text: "Please enter a referral code." });
      return;
    }
    setApplyMessage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    applyMutation.mutate(applyCode.trim());
  };

  if (!deviceId) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
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
      <View style={styles.heroCard}>
        <LinearGradient
          colors={isDark ? ["#1A4D2E", "#0A2615"] : ["#1A4D2E", "#0F2D1A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={styles.heroHeader}>
            <ThemedText style={styles.heroEmoji}>{"\u{1F381}"}</ThemedText>
            <ThemedText type="h2" style={styles.heroTitle}>
              Invite Friends, Earn Rewards
            </ThemedText>
          </View>
          <ThemedText type="small" style={styles.heroSubtitle}>
            Share your code and earn 500 points for every friend who joins
          </ThemedText>

          <View style={[styles.codeBox, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <ThemedText type="h3" style={styles.codeText}>
              {loyaltyLoading ? "Loading..." : referralCode}
            </ThemedText>
            <AnimatedPressable onPress={handleCopy} style={styles.copyButton} testID="button-copy-code">
              <Feather name={copyMessage ? "check" : "copy"} size={20} color="#FFFFFF" />
            </AnimatedPressable>
          </View>

          {copyMessage ? (
            <View style={styles.copiedBadge}>
              <Feather name="check-circle" size={14} color="#34C759" />
              <ThemedText type="caption" style={styles.copiedText}>
                Copied to clipboard!
              </ThemedText>
            </View>
          ) : null}
        </LinearGradient>
      </View>

      <View style={styles.section}>
        <ThemedText type="h3" style={{ color: theme.text, marginBottom: Spacing.lg }}>
          How It Works
        </ThemedText>
        {STEPS.map((step, index) => (
          <View
            key={index}
            style={[
              styles.stepRow,
              { backgroundColor: theme.backgroundDefault },
              Shadows.card,
            ]}
          >
            <View style={[styles.stepNumber, { backgroundColor: "#1A4D2E" }]}>
              <ThemedText style={styles.stepNumberText}>{index + 1}</ThemedText>
            </View>
            <View style={styles.stepContent}>
              <View style={styles.stepTitleRow}>
                <ThemedText style={styles.stepEmoji}>{step.emoji}</ThemedText>
                <ThemedText type="label" style={{ color: theme.text, flex: 1 }}>
                  {step.title}
                </ThemedText>
              </View>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {step.description}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <ThemedText type="h3" style={{ color: theme.text, marginBottom: Spacing.lg }}>
          Apply a Referral Code
        </ThemedText>
        <View
          style={[
            styles.applyCard,
            { backgroundColor: theme.backgroundDefault },
            Shadows.card,
          ]}
        >
          <View style={styles.applyInputRow}>
            <TextInput
              style={[
                styles.applyInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Enter referral code"
              placeholderTextColor={theme.textSecondary}
              value={applyCode}
              onChangeText={(text) => {
                setApplyCode(text);
                setApplyMessage(null);
              }}
              autoCapitalize="characters"
              testID="input-referral-code"
            />
            <AnimatedPressable
              onPress={handleApply}
              style={[styles.applyButton, { backgroundColor: "#1A4D2E", opacity: applyMutation.isPending ? 0.6 : 1 }]}
              testID="button-apply-code"
            >
              {applyMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.applyButtonText}>Apply</ThemedText>
              )}
            </AnimatedPressable>
          </View>

          {applyMessage ? (
            <View
              style={[
                styles.messageBox,
                {
                  backgroundColor:
                    applyMessage.type === "success"
                      ? "rgba(52, 199, 89, 0.12)"
                      : "rgba(255, 59, 48, 0.12)",
                },
              ]}
            >
              <Feather
                name={applyMessage.type === "success" ? "check-circle" : "alert-circle"}
                size={16}
                color={applyMessage.type === "success" ? "#34C759" : "#FF3B30"}
              />
              <ThemedText
                type="caption"
                style={{
                  color: applyMessage.type === "success" ? "#34C759" : "#FF3B30",
                  flex: 1,
                }}
              >
                {applyMessage.text}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h3" style={{ color: theme.text, marginBottom: Spacing.lg }}>
          Your Referral Stats
        </ThemedText>
        <View
          style={[
            styles.statsCard,
            { backgroundColor: theme.backgroundDefault },
            Shadows.card,
          ]}
        >
          {statsLoading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIconBox, { backgroundColor: "rgba(26, 77, 46, 0.1)" }]}>
                  <Feather name="users" size={22} color="#1A4D2E" />
                </View>
                <ThemedText type="h2" style={{ color: theme.primary }}>
                  {totalReferrals}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Total Referrals
                </ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <View style={[styles.statIconBox, { backgroundColor: "rgba(218, 165, 32, 0.1)" }]}>
                  <Feather name="star" size={22} color="#DAA520" />
                </View>
                <ThemedText type="h2" style={{ color: "#DAA520" }}>
                  {totalBonusEarned}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Bonus Points Earned
                </ThemedText>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.shareSection}>
        <AnimatedPressable
          onPress={handleShare}
          style={styles.shareButtonWrapper}
          testID="button-share-referral"
        >
          <LinearGradient
            colors={["#DAA520", "#B8860B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shareButton}
          >
            <Feather name="share-2" size={22} color="#FFFFFF" />
            <ThemedText style={styles.shareButtonText}>Share Your Referral Code</ThemedText>
          </LinearGradient>
        </AnimatedPressable>
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
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    ...Shadows.card,
  },
  heroGradient: {
    padding: Spacing.xl,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  heroEmoji: {
    fontSize: 28,
  },
  heroTitle: {
    color: "#FFFFFF",
    flex: 1,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.8)",
    marginBottom: Spacing.xl,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  codeText: {
    color: "#FFFFFF",
    letterSpacing: 3,
    fontWeight: "700",
    fontSize: 22,
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  copiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    alignSelf: "center",
  },
  copiedText: {
    color: "#34C759",
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  stepEmoji: {
    fontSize: 18,
  },
  applyCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  applyInputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  applyInput: {
    flex: 1,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    borderWidth: 1,
    fontFamily: "Inter_500Medium",
  },
  applyButton: {
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  messageBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  statsCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.xs,
  },
  statIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  statDivider: {
    width: 1,
    height: 60,
  },
  shareSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  shareButtonWrapper: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.lg,
  },
  shareButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
  },
});
