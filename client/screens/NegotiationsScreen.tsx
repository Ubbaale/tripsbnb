import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { formatPrice } from "@/lib/currency";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Feather.glyphMap }> = {
  pending: { label: "Pending", color: "#F39C12", icon: "clock" },
  countered: { label: "Countered", color: "#3498DB", icon: "refresh-cw" },
  accepted: { label: "Accepted", color: "#27AE60", icon: "check-circle" },
  declined: { label: "Declined", color: "#E74C3C", icon: "x-circle" },
  expired: { label: "Expired", color: "#95A5A6", icon: "alert-circle" },
};

const VENDOR_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  restaurant: "coffee",
  safari: "compass",
  accommodation: "home",
  companion: "users",
};

export function NegotiationsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [deviceId, setDeviceId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"active" | "resolved">("active");

  useEffect(() => {
    AsyncStorage.getItem("@tripverse_device_id").then((id) => {
      if (id) setDeviceId(id);
    });
  }, []);

  const { data: negotiations = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/negotiations", deviceId],
    enabled: !!deviceId,
  });

  const activeNegotiations = negotiations.filter(
    (n: any) => n.status === "pending" || n.status === "countered"
  );
  const resolvedNegotiations = negotiations.filter(
    (n: any) => n.status === "accepted" || n.status === "declined" || n.status === "expired"
  );
  const displayList = activeTab === "active" ? activeNegotiations : resolvedNegotiations;

  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PUT", `/api/negotiations/${id}/accept`, { acceptedBy: "buyer" });
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/negotiations"] });
      Alert.alert("Offer Accepted!", "The negotiated price has been confirmed. You can now proceed to book at the agreed price.");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to accept");
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PUT", `/api/negotiations/${id}/decline`, { reason: "Buyer declined" });
      return res.json();
    },
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      queryClient.invalidateQueries({ queryKey: ["/api/negotiations"] });
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to decline");
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, newOffer, message }: { id: string; newOffer: number; message?: string }) => {
      const res = await apiRequest("PUT", `/api/negotiations/${id}/respond`, { newOffer, message });
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/negotiations"] });
    },
  });

  const renderNegotiationCard = (negotiation: any) => {
    const status = STATUS_CONFIG[negotiation.status] || STATUS_CONFIG.pending;
    const currency = negotiation.bookingCurrency || "usd";
    const originalPriceFormatted = formatPrice(negotiation.originalPrice, currency);
    const currentOfferFormatted = formatPrice(negotiation.currentOffer, currency);
    const counterOfferFormatted = negotiation.counterOffer ? formatPrice(negotiation.counterOffer, currency) : null;
    const savings = negotiation.originalPrice - negotiation.currentOffer;
    const savingsPercent = Math.round((savings / negotiation.originalPrice) * 100);
    const vendorIcon = VENDOR_ICONS[negotiation.vendorType] || "briefcase";
    const timeAgo = getTimeAgo(negotiation.createdAt);

    return (
      <View
        key={negotiation.id}
        style={[styles.negotiationCard, { backgroundColor: theme.backgroundDefault }, Shadows.card]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardVendorInfo}>
            <View style={[styles.cardVendorIcon, { backgroundColor: theme.primary + "15" }]}>
              <Feather name={vendorIcon} size={18} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="label" numberOfLines={1}>{negotiation.vendorName}</ThemedText>
              <ThemedText type="caption" style={{ opacity: 0.6 }}>
                {negotiation.vendorType.charAt(0).toUpperCase() + negotiation.vendorType.slice(1)} • {timeAgo}
              </ThemedText>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + "15" }]}>
            <Feather name={status.icon} size={12} color={status.color} />
            <ThemedText type="caption" style={{ color: status.color, fontWeight: "600", fontSize: 11 }}>
              {status.label}
            </ThemedText>
          </View>
        </View>

        <View style={styles.priceSection}>
          <View style={styles.priceColumn}>
            <ThemedText type="caption" style={{ opacity: 0.5 }}>Listed</ThemedText>
            <ThemedText type="body" style={{ textDecorationLine: "line-through", opacity: 0.5 }}>
              {originalPriceFormatted}
            </ThemedText>
          </View>
          <Feather name="arrow-right" size={16} color={theme.textSecondary} />
          <View style={styles.priceColumn}>
            <ThemedText type="caption" style={{ opacity: 0.5 }}>Your Offer</ThemedText>
            <ThemedText type="h4" style={{ color: theme.primary }}>{currentOfferFormatted}</ThemedText>
          </View>
          {counterOfferFormatted ? (
            <>
              <Feather name="arrow-right" size={16} color={theme.textSecondary} />
              <View style={styles.priceColumn}>
                <ThemedText type="caption" style={{ opacity: 0.5 }}>Counter</ThemedText>
                <ThemedText type="h4" style={{ color: "#3498DB" }}>{counterOfferFormatted}</ThemedText>
              </View>
            </>
          ) : null}
        </View>

        {negotiation.status === "pending" ? (
          <View style={[styles.savingsBanner, { backgroundColor: "#27AE6010" }]}>
            <Feather name="trending-down" size={14} color="#27AE60" />
            <ThemedText type="caption" style={{ color: "#27AE60", fontWeight: "600" }}>
              Potential savings: {formatPrice(savings, currency)} ({savingsPercent}% off)
            </ThemedText>
          </View>
        ) : null}

        {negotiation.status === "countered" && counterOfferFormatted ? (
          <View style={styles.actionButtons}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                acceptMutation.mutate(negotiation.id);
              }}
              style={[styles.acceptButton, { backgroundColor: theme.primary }]}
              testID={`button-accept-${negotiation.id}`}
            >
              <Feather name="check" size={16} color="#FFF" />
              <ThemedText type="caption" style={{ color: "#FFF", fontWeight: "700" }}>
                Accept {counterOfferFormatted}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                declineMutation.mutate(negotiation.id);
              }}
              style={[styles.declineButton, { borderColor: theme.error }]}
              testID={`button-decline-${negotiation.id}`}
            >
              <Feather name="x" size={16} color={theme.error} />
              <ThemedText type="caption" style={{ color: theme.error, fontWeight: "700" }}>
                Decline
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {negotiation.status === "accepted" ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("VendorDetail", {
                vendorType: negotiation.vendorType,
                vendorId: negotiation.vendorId,
              });
            }}
            style={[styles.bookNowButton, { backgroundColor: theme.accent }]}
            testID={`button-book-negotiated-${negotiation.id}`}
          >
            <Feather name="calendar" size={16} color="#FFF" />
            <ThemedText type="caption" style={{ color: "#FFF", fontWeight: "700" }}>
              Book at Agreed Price
            </ThemedText>
          </Pressable>
        ) : null}

        {negotiation.vendorMessage ? (
          <View style={[styles.messageBox, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="message-circle" size={12} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ flex: 1, opacity: 0.7 }}>
              {negotiation.vendorMessage}
            </ThemedText>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={theme.primary} />
        }
      >
        <LinearGradient
          colors={["#1A4D2E", "#2D6A4F"]}
          style={styles.headerCard}
        >
          <View style={styles.headerIconBg}>
            <Feather name="tag" size={28} color="#DAA520" />
          </View>
          <ThemedText type="h3" style={{ color: "#FFF" }}>💰 My Negotiations</ThemedText>
          <ThemedText type="body" style={{ color: "rgba(255,255,255,0.8)", textAlign: "center" }}>
            Track your price offers and save on bookings
          </ThemedText>
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <ThemedText type="h4" style={{ color: "#DAA520" }}>{activeNegotiations.length}</ThemedText>
              <ThemedText type="caption" style={{ color: "rgba(255,255,255,0.7)" }}>Active</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
            <View style={styles.headerStat}>
              <ThemedText type="h4" style={{ color: "#27AE60" }}>
                {resolvedNegotiations.filter((n: any) => n.status === "accepted").length}
              </ThemedText>
              <ThemedText type="caption" style={{ color: "rgba(255,255,255,0.7)" }}>Accepted</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
            <View style={styles.headerStat}>
              <ThemedText type="h4" style={{ color: "#FFF" }}>{negotiations.length}</ThemedText>
              <ThemedText type="caption" style={{ color: "rgba(255,255,255,0.7)" }}>Total</ThemedText>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setActiveTab("active")}
            style={[
              styles.tab,
              activeTab === "active"
                ? { backgroundColor: theme.primary }
                : { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText
              type="label"
              style={{ color: activeTab === "active" ? "#FFF" : theme.textSecondary, fontSize: 13 }}
            >
              Active ({activeNegotiations.length})
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("resolved")}
            style={[
              styles.tab,
              activeTab === "resolved"
                ? { backgroundColor: theme.primary }
                : { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText
              type="label"
              style={{ color: activeTab === "resolved" ? "#FFF" : theme.textSecondary, fontSize: 13 }}
            >
              Resolved ({resolvedNegotiations.length})
            </ThemedText>
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: Spacing["3xl"] }} />
        ) : displayList.length > 0 ? (
          <View style={styles.cardList}>
            {displayList.map(renderNegotiationCard)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.primary + "10" }]}>
              <Feather name="tag" size={40} color={theme.primary} />
            </View>
            <ThemedText type="h4" style={{ textAlign: "center" }}>
              {activeTab === "active" ? "No Active Negotiations" : "No Resolved Negotiations"}
            </ThemedText>
            <ThemedText type="body" style={{ textAlign: "center", opacity: 0.6 }}>
              {activeTab === "active"
                ? `Make an offer on any listing ${formatPrice(10000, "usd")}+ to start negotiating a better price!`
                : "Your completed negotiations will appear here."}
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { gap: Spacing.lg },
  headerCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.md,
  },
  headerIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xl,
    marginTop: Spacing.sm,
  },
  headerStat: { alignItems: "center" },
  statDivider: { width: 1, height: 30 },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: "center",
  },
  cardList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  negotiationCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardVendorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  cardVendorIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  priceSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  priceColumn: {
    alignItems: "center",
  },
  savingsBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  acceptButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  declineButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  bookNowButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  messageBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing["3xl"],
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
});
