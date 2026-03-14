import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing } from "@/constants/theme";
import { formatPrice } from "@/lib/currency";

interface PriceComparisonBadgeProps {
  price: number;
  compact?: boolean;
}

const COMPETITOR_MARKUP = 0.172;
const PLATFORM_FEE = 0.12;

export function PriceComparisonBadge({ price, compact = false }: PriceComparisonBadgeProps) {
  const competitorPrice = Math.round(price * (1 + COMPETITOR_MARKUP));
  const ourPrice = Math.round(price * (1 + PLATFORM_FEE));
  const savings = competitorPrice - ourPrice;
  const savingsPercent = Math.round((savings / competitorPrice) * 100);

  if (savings <= 0) return null;

  if (compact) {
    return (
      <View style={styles.compactBadge}>
        <Feather name="trending-down" size={10} color="#FFFFFF" />
        <ThemedText style={styles.compactText}>Save {savingsPercent}%</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.badge}>
      <View style={styles.savingsRow}>
        <Feather name="trending-down" size={14} color="#2ECC71" />
        <ThemedText style={styles.savingsText}>
          Save {formatPrice(savings)} vs competitors
        </ThemedText>
      </View>
      <ThemedText style={styles.feeText}>
        Only 12% fee vs 17%+ elsewhere
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: "rgba(46, 204, 113, 0.12)",
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: "#2ECC71",
  },
  savingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: 2,
  },
  savingsText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2ECC71",
  },
  feeText: {
    fontSize: 11,
    color: "#888",
    marginLeft: 18,
  },
  compactBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#2ECC71",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  compactText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
