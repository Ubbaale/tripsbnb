import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, RouteProp } from "@react-navigation/native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { formatPriceDetailed } from "@/lib/currency";

type VendorWalletParams = {
  VendorWallet: {
    vendorId: string;
    vendorType: string;
    vendorName: string;
  };
};

const STATUS_COLORS: Record<string, string> = {
  held: "#F39C12",
  released: "#27AE60",
  refunded: "#E74C3C",
  disputed: "#9B59B6",
  pending: "#F39C12",
  completed: "#27AE60",
  rejected: "#E74C3C",
};

const STATUS_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  held: "lock",
  released: "unlock",
  refunded: "rotate-ccw",
  disputed: "alert-triangle",
  pending: "clock",
  completed: "check-circle",
  rejected: "x-circle",
};

export function VendorWalletScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const route = useRoute<RouteProp<VendorWalletParams, "VendorWallet">>();
  const { vendorId, vendorType, vendorName } = route.params;

  const [activeTab, setActiveTab] = useState<"overview" | "escrow" | "payouts">("overview");
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("bank_transfer");
  const [payoutEmail, setPayoutEmail] = useState("");

  const walletUrl = `${getApiUrl()}/api/vendor-wallet/${vendorType}/${vendorId}`;
  const escrowUrl = `${getApiUrl()}/api/vendor-wallet/${vendorType}/${vendorId}/escrow`;
  const payoutsUrl = `${getApiUrl()}/api/vendor-wallet/${vendorType}/${vendorId}/payouts`;

  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useQuery<any>({
    queryKey: ["/api/vendor-wallet", vendorType, vendorId],
    queryFn: () => fetch(walletUrl).then(r => r.json()),
  });

  const { data: escrowList = [], refetch: refetchEscrow } = useQuery<any[]>({
    queryKey: ["/api/vendor-wallet", vendorType, vendorId, "escrow"],
    queryFn: () => fetch(escrowUrl).then(r => r.json()),
  });

  const { data: payoutsList = [], refetch: refetchPayouts } = useQuery<any[]>({
    queryKey: ["/api/vendor-wallet", vendorType, vendorId, "payouts"],
    queryFn: () => fetch(payoutsUrl).then(r => r.json()),
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async (data: { amount: number; payoutMethod: string; payoutEmail: string }) => {
      const res = await fetch(payoutsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to request payout");
      }
      return res.json();
    },
    onSuccess: () => {
      refetchWallet();
      refetchPayouts();
      setShowPayoutModal(false);
      setPayoutAmount("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const refreshAll = useCallback(() => {
    refetchWallet();
    refetchEscrow();
    refetchPayouts();
  }, []);

  if (walletLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: Spacing.md }]}>
        <ActivityIndicator size="large" color="#DAA520" />
        <ThemedText style={{ marginTop: Spacing.md }}>Loading wallet...</ThemedText>
      </View>
    );
  }

  const handleRequestPayout = () => {
    const amountCents = Math.round(parseFloat(payoutAmount) * 100);
    if (isNaN(amountCents) || amountCents < 1000) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    requestPayoutMutation.mutate({ amount: amountCents, payoutMethod, payoutEmail });
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: insets.bottom + Spacing.xl }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refreshAll} tintColor="#DAA520" />}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#1A4D2E", "#2E7D32"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceHeader}>
            <View style={styles.walletIconContainer}>
              <Feather name="briefcase" size={24} color="#DAA520" />
            </View>
            <ThemedText style={styles.vendorNameText}>{vendorName}</ThemedText>
            <ThemedText style={styles.vendorTypeText}>{vendorType.charAt(0).toUpperCase() + vendorType.slice(1)}</ThemedText>
          </View>

          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <ThemedText style={styles.balanceLabel}>Available</ThemedText>
              <ThemedText style={styles.balanceAmount}>
                {formatPriceDetailed(wallet?.availableBalance || 0)}
              </ThemedText>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <ThemedText style={styles.balanceLabel}>Pending</ThemedText>
              <ThemedText style={[styles.balanceAmount, { color: "#F39C12" }]}>
                {formatPriceDetailed(wallet?.pendingBalance || 0)}
              </ThemedText>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Feather name="trending-up" size={14} color="#90EE90" />
              <ThemedText style={styles.statText}>
                Earned: {formatPriceDetailed(wallet?.totalEarned || 0)}
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <Feather name="arrow-up-right" size={14} color="#87CEEB" />
              <ThemedText style={styles.statText}>
                Paid Out: {formatPriceDetailed(wallet?.totalPaidOut || 0)}
              </ThemedText>
            </View>
          </View>

          <Pressable
            style={styles.payoutButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowPayoutModal(true);
            }}
            testID="button-request-payout"
          >
            <Feather name="dollar-sign" size={16} color="#1A4D2E" />
            <ThemedText style={styles.payoutButtonText}>Request Payout</ThemedText>
          </Pressable>
        </LinearGradient>

        <View style={styles.tabBar}>
          {(["overview", "escrow", "payouts"] as const).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab ? { borderBottomColor: "#DAA520", borderBottomWidth: 2 } : null]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab);
              }}
              testID={`tab-${tab}`}
            >
              <ThemedText
                style={[styles.tabText, { color: activeTab === tab ? "#DAA520" : theme.textSecondary }]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {activeTab === "overview" ? (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Wallet Summary</ThemedText>

            <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.infoRow}>
                <Feather name="shield" size={18} color="#27AE60" />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <ThemedText style={[styles.infoTitle, { color: theme.text }]}>Escrow Protection</ThemedText>
                  <ThemedText style={[styles.infoDesc, { color: theme.textSecondary }]}>
                    Payments are held securely until service is confirmed delivered
                  </ThemedText>
                </View>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.infoRow}>
                <Feather name="clock" size={18} color="#F39C12" />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <ThemedText style={[styles.infoTitle, { color: theme.text }]}>Processing Time</ThemedText>
                  <ThemedText style={[styles.infoDesc, { color: theme.textSecondary }]}>
                    Payouts are processed within 3-5 business days after request
                  </ThemedText>
                </View>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.infoRow}>
                <Feather name="percent" size={18} color="#DAA520" />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <ThemedText style={[styles.infoTitle, { color: theme.text }]}>Platform Fee</ThemedText>
                  <ThemedText style={[styles.infoDesc, { color: theme.textSecondary }]}>
                    12% service fee is deducted from each booking before payout
                  </ThemedText>
                </View>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.infoRow}>
                <Feather name="dollar-sign" size={18} color="#3498DB" />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <ThemedText style={[styles.infoTitle, { color: theme.text }]}>Minimum Payout</ThemedText>
                  <ThemedText style={[styles.infoDesc, { color: theme.textSecondary }]}>
                    Minimum payout amount is $10.00
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        ) : activeTab === "escrow" ? (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
              Escrow Transactions ({escrowList.length})
            </ThemedText>
            {escrowList.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.backgroundDefault }]}>
                <Feather name="inbox" size={40} color={theme.textSecondary} />
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No escrow transactions yet
                </ThemedText>
              </View>
            ) : (
              escrowList.map((escrow: any) => (
                <View key={escrow.id} style={[styles.transactionCard, { backgroundColor: theme.backgroundDefault }]}>
                  <View style={styles.transactionHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[escrow.status] + "20" }]}>
                      <Feather name={STATUS_ICONS[escrow.status] || "circle"} size={12} color={STATUS_COLORS[escrow.status] || "#999"} />
                      <ThemedText style={[styles.statusText, { color: STATUS_COLORS[escrow.status] || "#999" }]}>
                        {escrow.status?.charAt(0).toUpperCase() + escrow.status?.slice(1)}
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.transactionDate, { color: theme.textSecondary }]}>
                      {new Date(escrow.createdAt).toLocaleDateString()}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.transactionDesc, { color: theme.text }]} numberOfLines={1}>
                    {escrow.description || "Booking payment"}
                  </ThemedText>
                  <View style={styles.transactionAmounts}>
                    <View>
                      <ThemedText style={[styles.amountLabel, { color: theme.textSecondary }]}>Booking</ThemedText>
                      <ThemedText style={[styles.amountValue, { color: theme.text }]}>
                        {formatPriceDetailed(escrow.bookingAmount)}
                      </ThemedText>
                    </View>
                    <View>
                      <ThemedText style={[styles.amountLabel, { color: theme.textSecondary }]}>Fee</ThemedText>
                      <ThemedText style={[styles.amountValue, { color: "#E74C3C" }]}>
                        -{formatPriceDetailed(escrow.platformFee)}
                      </ThemedText>
                    </View>
                    <View>
                      <ThemedText style={[styles.amountLabel, { color: theme.textSecondary }]}>Your Payout</ThemedText>
                      <ThemedText style={[styles.amountValue, { color: "#27AE60" }]}>
                        {formatPriceDetailed(escrow.vendorPayout)}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
              Payout Requests ({payoutsList.length})
            </ThemedText>
            {payoutsList.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.backgroundDefault }]}>
                <Feather name="credit-card" size={40} color={theme.textSecondary} />
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No payout requests yet
                </ThemedText>
              </View>
            ) : (
              payoutsList.map((payout: any) => (
                <View key={payout.id} style={[styles.transactionCard, { backgroundColor: theme.backgroundDefault }]}>
                  <View style={styles.transactionHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[payout.status] + "20" }]}>
                      <Feather name={STATUS_ICONS[payout.status] || "circle"} size={12} color={STATUS_COLORS[payout.status] || "#999"} />
                      <ThemedText style={[styles.statusText, { color: STATUS_COLORS[payout.status] || "#999" }]}>
                        {payout.status?.charAt(0).toUpperCase() + payout.status?.slice(1)}
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.transactionDate, { color: theme.textSecondary }]}>
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </ThemedText>
                  </View>
                  <View style={styles.payoutRow}>
                    <ThemedText style={[styles.payoutAmountLarge, { color: theme.text }]}>
                      {formatPriceDetailed(payout.amount)}
                    </ThemedText>
                    <View style={styles.payoutMethodBadge}>
                      <Feather name={payout.payoutMethod === "bank_transfer" ? "briefcase" : "mail"} size={12} color="#DAA520" />
                      <ThemedText style={styles.payoutMethodText}>
                        {payout.payoutMethod === "bank_transfer" ? "Bank Transfer" : payout.payoutMethod}
                      </ThemedText>
                    </View>
                  </View>
                  {payout.processedAt ? (
                    <ThemedText style={[styles.processedText, { color: theme.textSecondary }]}>
                      Processed: {new Date(payout.processedAt).toLocaleDateString()}
                    </ThemedText>
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showPayoutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPayoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>Request Payout</ThemedText>
              <Pressable
                onPress={() => setShowPayoutModal(false)}
                testID="button-close-payout-modal"
              >
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ThemedText style={[styles.modalLabel, { color: theme.textSecondary }]}>
              Available: {formatPriceDetailed(wallet?.availableBalance || 0)}
            </ThemedText>

            <ThemedText style={[styles.inputLabel, { color: theme.text }]}>Amount ($)</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.textSecondary + "40" }]}
              value={payoutAmount}
              onChangeText={setPayoutAmount}
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              testID="input-payout-amount"
            />

            <ThemedText style={[styles.inputLabel, { color: theme.text }]}>Payout Method</ThemedText>
            <View style={styles.methodRow}>
              {["bank_transfer", "paypal"].map((method) => (
                <Pressable
                  key={method}
                  style={[
                    styles.methodButton,
                    { borderColor: payoutMethod === method ? "#DAA520" : theme.textSecondary + "40" },
                    payoutMethod === method ? { backgroundColor: "#DAA52020" } : null,
                  ]}
                  onPress={() => setPayoutMethod(method)}
                  testID={`button-method-${method}`}
                >
                  <Feather
                    name={method === "bank_transfer" ? "briefcase" : "mail"}
                    size={16}
                    color={payoutMethod === method ? "#DAA520" : theme.textSecondary}
                  />
                  <ThemedText style={[styles.methodText, { color: payoutMethod === method ? "#DAA520" : theme.text }]}>
                    {method === "bank_transfer" ? "Bank" : "PayPal"}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText style={[styles.inputLabel, { color: theme.text }]}>Payout Email</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.textSecondary + "40" }]}
              value={payoutEmail}
              onChangeText={setPayoutEmail}
              placeholder="email@example.com"
              placeholderTextColor={theme.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="input-payout-email"
            />

            <Pressable
              style={[styles.submitButton, requestPayoutMutation.isPending ? { opacity: 0.6 } : null]}
              onPress={handleRequestPayout}
              disabled={requestPayoutMutation.isPending}
              testID="button-submit-payout"
            >
              <LinearGradient
                colors={["#DAA520", "#B8860B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {requestPayoutMutation.isPending ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Feather name="send" size={16} color="#FFF" />
                    <ThemedText style={styles.submitText}>Submit Payout Request</ThemedText>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            {requestPayoutMutation.isError ? (
              <ThemedText style={styles.errorText}>
                {(requestPayoutMutation.error as Error)?.message || "Something went wrong"}
              </ThemedText>
            ) : null}
          </View>
        </View>
      </Modal>
    </ThemedView>
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
  balanceCard: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  balanceHeader: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  walletIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(218,165,32,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  vendorNameText: {
    fontSize: 20,
    fontFamily: "CormorantGaramond_700Bold",
    color: "#FFF",
  },
  vendorTypeText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  balanceItem: {
    flex: 1,
    alignItems: "center",
  },
  balanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  balanceLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 28,
    fontFamily: "CormorantGaramond_700Bold",
    color: "#FFF",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    marginBottom: Spacing.md,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  payoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DAA520",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  payoutButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A4D2E",
  },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "CormorantGaramond_700Bold",
    marginBottom: Spacing.md,
  },
  infoCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.tile,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  infoDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  emptyCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.tile,
  },
  emptyText: {
    fontSize: 14,
    marginTop: Spacing.md,
  },
  transactionCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.tile,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionDesc: {
    fontSize: 13,
    marginBottom: Spacing.sm,
  },
  transactionAmounts: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  amountLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  payoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  payoutAmountLarge: {
    fontSize: 22,
    fontFamily: "CormorantGaramond_700Bold",
  },
  payoutMethodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DAA52015",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  payoutMethodText: {
    fontSize: 11,
    color: "#DAA520",
    fontWeight: "600",
  },
  processedText: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "CormorantGaramond_700Bold",
  },
  modalLabel: {
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  methodRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  methodButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
  },
  methodText: {
    fontSize: 14,
    fontWeight: "500",
  },
  submitButton: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    gap: 8,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
  },
  errorText: {
    color: "#E74C3C",
    fontSize: 13,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
});
