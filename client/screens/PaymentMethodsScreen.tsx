import React, { useCallback, useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { getApiUrl, apiRequest } from "@/lib/query-client";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

const BRAND_EMOJIS: Record<string, string> = {
  visa: "\u{1F499}",
  mastercard: "\u{1F534}",
  amex: "\u{1F49C}",
  discover: "\u{1F7E0}",
};

function getBrandEmoji(brand: string): string {
  return BRAND_EMOJIS[brand.toLowerCase()] || "\u{1F4B3}";
}

function getBrandName(brand: string): string {
  const names: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
  };
  return names[brand.toLowerCase()] || brand;
}

export default function PaymentMethodsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const qc = useQueryClient();
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("@tripverse_device_id").then((id) => {
      setDeviceId(id);
    });
  }, []);

  const {
    data: paymentMethods = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods", deviceId],
    enabled: !!deviceId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      await apiRequest("DELETE", `/api/payment-methods/${paymentMethodId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/payment-methods", deviceId] });
    },
  });

  const handleDeleteCard = useCallback(
    (paymentMethodId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        "Remove Card",
        "Are you sure you want to remove this payment method?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => deleteMutation.mutate(paymentMethodId),
          },
        ]
      );
    },
    [deleteMutation]
  );

  const handleAddCard = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!deviceId) return;

    const url = `${getApiUrl()}api/payment-methods/add-card?deviceId=${deviceId}`;
    await WebBrowser.openBrowserAsync(url);
    refetch();
  }, [deviceId, refetch]);

  const renderCardItem = useCallback(
    ({ item }: { item: PaymentMethod }) => (
      <View
        style={[
          styles.cardItem,
          { backgroundColor: theme.backgroundDefault },
          Shadows.card,
        ]}
        testID={`card-item-${item.id}`}
      >
        <View style={styles.cardBrandSection}>
          <Text style={styles.brandEmoji}>{getBrandEmoji(item.brand)}</Text>
          <View style={styles.cardDetails}>
            <ThemedText type="label" style={styles.cardNumber}>
              {getBrandName(item.brand)} {"\u2022\u2022\u2022\u2022"} {item.last4}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Expires {String(item.expMonth).padStart(2, "0")}/{item.expYear}
            </ThemedText>
          </View>
        </View>
        <Pressable
          testID={`button-delete-card-${item.id}`}
          style={({ pressed }) => [
            styles.deleteButton,
            { backgroundColor: pressed ? theme.error + "20" : "transparent" },
          ]}
          onPress={() => handleDeleteCard(item.id)}
        >
          <Feather name="trash-2" size={18} color={theme.error} />
        </Pressable>
      </View>
    ),
    [theme, handleDeleteCard]
  );

  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>{"\u{1F4B3}"}</Text>
        <ThemedText type="h3" style={styles.emptyTitle}>
          No payment methods yet
        </ThemedText>
        <ThemedText
          type="small"
          style={[styles.emptySubtitle, { color: theme.textSecondary }]}
        >
          Add your first card for easier checkout
        </ThemedText>
      </View>
    ),
    [theme]
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.headerCard}>
        <LinearGradient
          colors={["#1A4D2E", "#2D6A4F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <Text style={styles.headerEmoji}>{"\u{1F4B3}"}</Text>
          <ThemedText type="h2" style={styles.headerTitle}>
            Payment Methods
          </ThemedText>
          <ThemedText type="small" style={styles.headerSubtitle}>
            Manage your saved cards
          </ThemedText>
        </LinearGradient>
      </View>
    ),
    []
  );

  if (!deviceId) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: theme.backgroundRoot, paddingTop: Spacing.md },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: theme.backgroundRoot, paddingTop: Spacing.md },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="small" style={{ marginTop: Spacing.md }}>
          Loading payment methods...
        </ThemedText>
      </View>
    );
  }

  if (isError) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: theme.backgroundRoot, paddingTop: Spacing.md },
        ]}
      >
        <Text style={styles.errorEmoji}>{"\u26A0\uFE0F"}</Text>
        <ThemedText type="h3" style={{ marginTop: Spacing.md }}>
          Something went wrong
        </ThemedText>
        <ThemedText
          type="small"
          style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
        >
          Could not load your payment methods
        </ThemedText>
        <Pressable
          testID="button-retry"
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
          onPress={() => refetch()}
        >
          <ThemedText type="label" style={{ color: "#FFFFFF" }}>
            Try Again
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={paymentMethods}
        keyExtractor={(item) => item.id}
        renderItem={renderCardItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={{
          paddingTop: Spacing.md,
          paddingBottom: insets.bottom + Spacing["3xl"] + 80,
          paddingHorizontal: Spacing.lg,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        testID="payment-methods-list"
      />

      <View
        style={[
          styles.addButtonContainer,
          { paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <Pressable
          testID="button-add-card"
          style={({ pressed }) => [
            styles.addButton,
            { opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={handleAddCard}
        >
          <LinearGradient
            colors={["#DAA520", "#C4961A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addButtonGradient}
          >
            <Feather name="plus-circle" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add New Card</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  headerCard: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  headerGradient: {
    padding: Spacing["2xl"],
    alignItems: "center",
  },
  headerEmoji: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    color: "#FFFFFF",
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.8)",
  },
  cardItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  cardBrandSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  brandEmoji: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  cardDetails: {
    flex: 1,
  },
  cardNumber: {
    marginBottom: 2,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["6xl"],
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
  },
  errorEmoji: {
    fontSize: 48,
  },
  retryButton: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  addButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  addButton: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    ...Shadows.card,
  },
  addButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
