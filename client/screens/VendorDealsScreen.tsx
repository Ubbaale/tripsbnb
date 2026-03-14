import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Text,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { formatPrice } from "@/lib/currency";

type VendorType = "restaurant" | "safari" | "accommodation";

const VENDOR_TYPE_CONFIG: Record<VendorType, { label: string; plural: string; endpoint: string; icon: keyof typeof Feather.glyphMap }> = {
  restaurant: { label: "Restaurant", plural: "Restaurants", endpoint: "/api/restaurants", icon: "coffee" },
  safari: { label: "Safari", plural: "Safaris", endpoint: "/api/safaris", icon: "sunrise" },
  accommodation: { label: "Accommodation", plural: "Accommodations", endpoint: "/api/accommodations", icon: "home" },
};

const DURATION_OPTIONS = [
  { label: "24 Hours", hours: 24 },
  { label: "48 Hours", hours: 48 },
  { label: "3 Days", hours: 72 },
  { label: "7 Days", hours: 168 },
];

interface VendorListing {
  id: string;
  name: string;
  city: string;
  country: string;
  bookingPrice: number | null;
  bookingCurrency: string | null;
  imageUrl: string | null;
}

interface Deal {
  id: string;
  vendorType: string;
  vendorId: string;
  vendorName: string;
  title: string;
  description: string | null;
  originalPrice: number;
  dealPrice: number;
  currency: string | null;
  discountPercent: number;
  city: string;
  country: string;
  startsAt: string;
  expiresAt: string;
  maxRedemptions: number;
  currentRedemptions: number;
  isActive: boolean;
  createdAt: string;
}

function getDealStatus(deal: Deal): { label: string; color: string; icon: keyof typeof Feather.glyphMap } {
  if (!deal.isActive) return { label: "Inactive", color: "#95A5A6", icon: "x-circle" };
  const now = new Date();
  if (new Date(deal.expiresAt) < now) return { label: "Expired", color: "#E74C3C", icon: "clock" };
  if (deal.maxRedemptions > 0 && deal.currentRedemptions >= deal.maxRedemptions) return { label: "Sold Out", color: "#F39C12", icon: "alert-circle" };
  return { label: "Active", color: "#27AE60", icon: "check-circle" };
}

export function VendorDealsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [activeType, setActiveType] = useState<VendorType>("restaurant");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<VendorListing | null>(null);
  const [dealTitle, setDealTitle] = useState("");
  const [dealDescription, setDealDescription] = useState("");
  const [discountPercent, setDiscountPercent] = useState("20");
  const [selectedDuration, setSelectedDuration] = useState(24);
  const [maxRedemptions, setMaxRedemptions] = useState("");

  const config = VENDOR_TYPE_CONFIG[activeType];

  const { data: listings = [], isLoading: listingsLoading, refetch: refetchListings } = useQuery<VendorListing[]>({
    queryKey: [config.endpoint],
  });

  const allVendorIds = useMemo(() => listings.map((l) => l.id), [listings]);

  const { data: allDeals = [], isLoading: dealsLoading, refetch: refetchDeals } = useQuery<Deal[]>({
    queryKey: [`/api/deals?vendorType=${activeType}&activeOnly=false`],
  });

  const vendorDeals = useMemo(() => {
    const idSet = new Set(allVendorIds);
    return allDeals.filter((d) => idSet.has(d.vendorId));
  }, [allDeals, allVendorIds]);

  const createDealMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/deals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deals`] });
      refetchDeals();
      resetForm();
      setShowCreateModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deactivateDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      return apiRequest("PUT", `/api/deals/${dealId}`, { isActive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      refetchDeals();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const resetForm = () => {
    setSelectedListing(null);
    setDealTitle("");
    setDealDescription("");
    setDiscountPercent("20");
    setSelectedDuration(24);
    setMaxRedemptions("");
  };

  const refreshAll = useCallback(() => {
    refetchListings();
    refetchDeals();
  }, [refetchListings, refetchDeals]);

  const handleCreateDeal = () => {
    if (!selectedListing) return;
    if (!dealTitle.trim()) return;

    const discount = parseInt(discountPercent, 10);
    if (isNaN(discount) || discount < 10 || discount > 90) return;

    const originalPrice = selectedListing.bookingPrice || 0;
    if (originalPrice <= 0) return;

    const dealPrice = Math.round(originalPrice * (1 - discount / 100));
    const now = new Date();
    const expiresAt = new Date(now.getTime() + selectedDuration * 60 * 60 * 1000);
    const maxRedeem = parseInt(maxRedemptions, 10);

    createDealMutation.mutate({
      vendorType: activeType,
      vendorId: selectedListing.id,
      vendorName: selectedListing.name,
      title: dealTitle.trim(),
      description: dealDescription.trim() || null,
      imageUrl: selectedListing.imageUrl || null,
      originalPrice,
      dealPrice,
      currency: selectedListing.bookingCurrency || "usd",
      discountPercent: discount,
      city: selectedListing.city,
      country: selectedListing.country,
      startsAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      maxRedemptions: isNaN(maxRedeem) ? 0 : maxRedeem,
      isActive: true,
    });
  };

  const calculatedDealPrice = useMemo(() => {
    if (!selectedListing) return 0;
    const originalPrice = selectedListing.bookingPrice || 0;
    const discount = parseInt(discountPercent, 10);
    if (isNaN(discount) || discount < 10 || discount > 90) return originalPrice;
    return Math.round(originalPrice * (1 - discount / 100));
  }, [selectedListing, discountPercent]);

  const isLoading = listingsLoading || dealsLoading;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: Spacing.md }]}>
        <ActivityIndicator size="large" color="#DAA520" />
        <ThemedText style={{ marginTop: Spacing.md }}>Loading deals...</ThemedText>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: insets.bottom + Spacing.xl }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refreshAll} tintColor="#DAA520" />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.segmentContainer}>
          {(Object.keys(VENDOR_TYPE_CONFIG) as VendorType[]).map((type) => {
            const cfg = VENDOR_TYPE_CONFIG[type];
            const isActive = activeType === type;
            return (
              <Pressable
                key={type}
                style={[
                  styles.segmentButton,
                  { backgroundColor: isActive ? "#1A4D2E" : theme.backgroundDefault, borderColor: isActive ? "#1A4D2E" : theme.border },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveType(type);
                }}
                testID={`segment-${type}`}
              >
                <Feather name={cfg.icon} size={14} color={isActive ? "#FFF" : theme.textSecondary} />
                <ThemedText style={[styles.segmentText, { color: isActive ? "#FFF" : theme.textSecondary }]}>
                  {cfg.plural}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <LinearGradient
          colors={["#1A4D2E", "#2E7D32"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Feather name="list" size={20} color="#DAA520" />
              <ThemedText style={styles.summaryNumber}>{listings.length}</ThemedText>
              <ThemedText style={styles.summaryLabel}>Listings</ThemedText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Feather name="zap" size={20} color="#DAA520" />
              <ThemedText style={styles.summaryNumber}>
                {vendorDeals.filter((d) => getDealStatus(d).label === "Active").length}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>Active Deals</ThemedText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Feather name="tag" size={20} color="#DAA520" />
              <ThemedText style={styles.summaryNumber}>{vendorDeals.length}</ThemedText>
              <ThemedText style={styles.summaryLabel}>Total Deals</ThemedText>
            </View>
          </View>
        </LinearGradient>

        <Pressable
          style={styles.createButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            resetForm();
            setShowCreateModal(true);
          }}
          testID="button-create-deal"
        >
          <LinearGradient
            colors={["#DAA520", "#B8860B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createButtonGradient}
          >
            <Feather name="plus-circle" size={18} color="#FFF" />
            <ThemedText style={styles.createButtonText}>Create New Deal</ThemedText>
          </LinearGradient>
        </Pressable>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Your Deals ({vendorDeals.length})
          </ThemedText>

          {vendorDeals.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="tag" size={40} color={theme.textSecondary} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                No deals created yet
              </ThemedText>
              <ThemedText style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                Create a flash deal to attract more customers
              </ThemedText>
            </View>
          ) : (
            vendorDeals.map((deal) => {
              const status = getDealStatus(deal);
              return (
                <View key={deal.id} style={[styles.dealCard, { backgroundColor: theme.backgroundDefault }]}>
                  <View style={styles.dealHeader}>
                    <View style={styles.dealTitleRow}>
                      <ThemedText style={[styles.dealTitle, { color: theme.text }]} numberOfLines={1}>
                        {deal.title}
                      </ThemedText>
                      <View style={[styles.statusBadge, { backgroundColor: status.color + "20" }]}>
                        <Feather name={status.icon} size={12} color={status.color} />
                        <ThemedText style={[styles.statusText, { color: status.color }]}>
                          {status.label}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText style={[styles.dealVendor, { color: theme.textSecondary }]}>
                      {deal.vendorName}
                    </ThemedText>
                  </View>

                  <View style={styles.dealPriceRow}>
                    <View style={styles.priceBlock}>
                      <ThemedText style={[styles.priceLabel, { color: theme.textSecondary }]}>Original</ThemedText>
                      <ThemedText style={[styles.originalPrice, { color: theme.textSecondary }]}>
                        {formatPrice(deal.originalPrice, deal.currency || "usd", true)}
                      </ThemedText>
                    </View>
                    <Feather name="arrow-right" size={16} color="#DAA520" />
                    <View style={styles.priceBlock}>
                      <ThemedText style={[styles.priceLabel, { color: theme.textSecondary }]}>Deal Price</ThemedText>
                      <ThemedText style={[styles.dealPriceText, { color: "#27AE60" }]}>
                        {formatPrice(deal.dealPrice, deal.currency || "usd", true)}
                      </ThemedText>
                    </View>
                    <View style={styles.discountBadge}>
                      <ThemedText style={styles.discountText}>-{deal.discountPercent}%</ThemedText>
                    </View>
                  </View>

                  <View style={styles.dealInfoRow}>
                    <View style={styles.dealInfoItem}>
                      <Feather name="clock" size={12} color={theme.textSecondary} />
                      <ThemedText style={[styles.dealInfoText, { color: theme.textSecondary }]}>
                        {new Date(deal.expiresAt).toLocaleDateString()}
                      </ThemedText>
                    </View>
                    <View style={styles.dealInfoItem}>
                      <Feather name="users" size={12} color={theme.textSecondary} />
                      <ThemedText style={[styles.dealInfoText, { color: theme.textSecondary }]}>
                        {deal.currentRedemptions}{deal.maxRedemptions > 0 ? `/${deal.maxRedemptions}` : ""} redeemed
                      </ThemedText>
                    </View>
                  </View>

                  {status.label === "Active" ? (
                    <Pressable
                      style={[styles.deactivateButton, { borderColor: "#E74C3C" }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        deactivateDealMutation.mutate(deal.id);
                      }}
                      testID={`button-deactivate-${deal.id}`}
                    >
                      <Feather name="x-circle" size={14} color="#E74C3C" />
                      <ThemedText style={styles.deactivateText}>Deactivate</ThemedText>
                    </Pressable>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Your {config.plural} ({listings.length})
          </ThemedText>
          {listings.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name={config.icon} size={40} color={theme.textSecondary} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                No {config.plural.toLowerCase()} found
              </ThemedText>
            </View>
          ) : (
            listings.map((listing) => {
              const listingDeals = vendorDeals.filter((d) => d.vendorId === listing.id);
              const activeDeals = listingDeals.filter((d) => getDealStatus(d).label === "Active").length;
              return (
                <View key={listing.id} style={[styles.listingCard, { backgroundColor: theme.backgroundDefault }]}>
                  <View style={styles.listingContent}>
                    <View style={[styles.listingIcon, { backgroundColor: "#1A4D2E15" }]}>
                      <Feather name={config.icon} size={20} color="#1A4D2E" />
                    </View>
                    <View style={styles.listingInfo}>
                      <ThemedText style={[styles.listingName, { color: theme.text }]} numberOfLines={1}>
                        {listing.name}
                      </ThemedText>
                      <ThemedText style={[styles.listingLocation, { color: theme.textSecondary }]}>
                        {listing.city}, {listing.country}
                      </ThemedText>
                      <View style={styles.listingMeta}>
                        {listing.bookingPrice ? (
                          <ThemedText style={[styles.listingPrice, { color: "#1A4D2E" }]}>
                            {formatPrice(listing.bookingPrice, listing.bookingCurrency || "usd", true)}
                          </ThemedText>
                        ) : (
                          <ThemedText style={[styles.listingPrice, { color: theme.textSecondary }]}>No price set</ThemedText>
                        )}
                        {activeDeals > 0 ? (
                          <View style={styles.activeDealsTag}>
                            <ThemedText style={styles.activeDealsText}>{activeDeals} active</ThemedText>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    {listing.bookingPrice ? (
                      <Pressable
                        style={styles.listingDealButton}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedListing(listing);
                          resetForm();
                          setSelectedListing(listing);
                          setShowCreateModal(true);
                        }}
                        testID={`button-deal-${listing.id}`}
                      >
                        <Feather name="plus" size={16} color="#DAA520" />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <ThemedText style={[styles.modalTitle, { color: theme.text }]}>Create Flash Deal</ThemedText>
                <Pressable
                  onPress={() => setShowCreateModal(false)}
                  testID="button-close-deal-modal"
                >
                  <Feather name="x" size={24} color={theme.text} />
                </Pressable>
              </View>

              <ThemedText style={[styles.inputLabel, { color: theme.text }]}>Select Listing</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listingPicker}>
                {listings.filter((l) => l.bookingPrice && l.bookingPrice > 0).map((listing) => (
                  <Pressable
                    key={listing.id}
                    style={[
                      styles.listingPickerItem,
                      {
                        borderColor: selectedListing?.id === listing.id ? "#DAA520" : theme.border,
                        backgroundColor: selectedListing?.id === listing.id ? "#DAA52015" : "transparent",
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedListing(listing);
                    }}
                    testID={`picker-listing-${listing.id}`}
                  >
                    <Feather name={config.icon} size={14} color={selectedListing?.id === listing.id ? "#DAA520" : theme.textSecondary} />
                    <ThemedText
                      style={[styles.listingPickerText, { color: selectedListing?.id === listing.id ? "#DAA520" : theme.text }]}
                      numberOfLines={1}
                    >
                      {listing.name}
                    </ThemedText>
                    <ThemedText style={[styles.listingPickerPrice, { color: theme.textSecondary }]}>
                      {formatPrice(listing.bookingPrice, listing.bookingCurrency || "usd", true)}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>

              {selectedListing ? (
                <>
                  <ThemedText style={[styles.inputLabel, { color: theme.text }]}>Deal Title</ThemedText>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    value={dealTitle}
                    onChangeText={setDealTitle}
                    placeholder="e.g. Weekend Flash Sale"
                    placeholderTextColor={theme.textSecondary}
                    testID="input-deal-title"
                  />

                  <ThemedText style={[styles.inputLabel, { color: theme.text }]}>Description (optional)</ThemedText>
                  <TextInput
                    style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border }]}
                    value={dealDescription}
                    onChangeText={setDealDescription}
                    placeholder="Describe your deal..."
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    numberOfLines={3}
                    testID="input-deal-description"
                  />

                  <ThemedText style={[styles.inputLabel, { color: theme.text }]}>Discount Percentage</ThemedText>
                  <View style={styles.discountRow}>
                    {[10, 20, 30, 40, 50].map((pct) => (
                      <Pressable
                        key={pct}
                        style={[
                          styles.discountOption,
                          {
                            borderColor: parseInt(discountPercent) === pct ? "#DAA520" : theme.border,
                            backgroundColor: parseInt(discountPercent) === pct ? "#DAA52015" : "transparent",
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setDiscountPercent(pct.toString());
                        }}
                        testID={`discount-${pct}`}
                      >
                        <ThemedText style={[styles.discountOptionText, { color: parseInt(discountPercent) === pct ? "#DAA520" : theme.text }]}>
                          {pct}%
                        </ThemedText>
                      </Pressable>
                    ))}
                    <TextInput
                      style={[styles.discountInput, { color: theme.text, borderColor: theme.border }]}
                      value={discountPercent}
                      onChangeText={(text) => {
                        const num = text.replace(/[^0-9]/g, "");
                        setDiscountPercent(num);
                      }}
                      keyboardType="number-pad"
                      maxLength={2}
                      testID="input-discount-custom"
                    />
                  </View>

                  <View style={styles.pricePreview}>
                    <View style={styles.pricePreviewItem}>
                      <ThemedText style={[styles.pricePreviewLabel, { color: theme.textSecondary }]}>Original</ThemedText>
                      <ThemedText style={[styles.pricePreviewValue, { color: theme.text, textDecorationLine: "line-through" }]}>
                        {formatPrice(selectedListing.bookingPrice, selectedListing.bookingCurrency || "usd", true)}
                      </ThemedText>
                    </View>
                    <Feather name="arrow-right" size={16} color="#DAA520" />
                    <View style={styles.pricePreviewItem}>
                      <ThemedText style={[styles.pricePreviewLabel, { color: theme.textSecondary }]}>Deal Price</ThemedText>
                      <ThemedText style={[styles.pricePreviewValue, { color: "#27AE60" }]}>
                        {formatPrice(calculatedDealPrice, selectedListing.bookingCurrency || "usd", true)}
                      </ThemedText>
                    </View>
                  </View>

                  <ThemedText style={[styles.inputLabel, { color: theme.text }]}>Duration</ThemedText>
                  <View style={styles.durationRow}>
                    {DURATION_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt.hours}
                        style={[
                          styles.durationOption,
                          {
                            borderColor: selectedDuration === opt.hours ? "#1A4D2E" : theme.border,
                            backgroundColor: selectedDuration === opt.hours ? "#1A4D2E" : "transparent",
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedDuration(opt.hours);
                        }}
                        testID={`duration-${opt.hours}`}
                      >
                        <ThemedText style={[styles.durationText, { color: selectedDuration === opt.hours ? "#FFF" : theme.text }]}>
                          {opt.label}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>

                  <ThemedText style={[styles.inputLabel, { color: theme.text }]}>Max Redemptions (0 = unlimited)</ThemedText>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    value={maxRedemptions}
                    onChangeText={(text) => setMaxRedemptions(text.replace(/[^0-9]/g, ""))}
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="number-pad"
                    testID="input-max-redemptions"
                  />

                  <Pressable
                    style={[styles.submitButton, createDealMutation.isPending ? { opacity: 0.6 } : null]}
                    onPress={handleCreateDeal}
                    disabled={createDealMutation.isPending || !dealTitle.trim()}
                    testID="button-submit-deal"
                  >
                    <LinearGradient
                      colors={["#DAA520", "#B8860B"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.submitGradient}
                    >
                      {createDealMutation.isPending ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <>
                          <Feather name="zap" size={16} color="#FFF" />
                          <ThemedText style={styles.submitText}>Create Deal</ThemedText>
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>

                  {createDealMutation.isError ? (
                    <ThemedText style={styles.errorText}>
                      {(createDealMutation.error as Error)?.message || "Something went wrong"}
                    </ThemedText>
                  ) : null}
                </>
              ) : (
                <View style={styles.selectListingHint}>
                  <Feather name="arrow-up" size={20} color={theme.textSecondary} />
                  <ThemedText style={[styles.selectListingText, { color: theme.textSecondary }]}>
                    Select a listing above to create a deal
                  </ThemedText>
                </View>
              )}
            </ScrollView>
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
  segmentContainer: {
    flexDirection: "row",
    marginHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  segmentButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 4,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "600",
  },
  summaryCard: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  summaryItem: {
    alignItems: "center",
    gap: 4,
  },
  summaryNumber: {
    fontSize: 24,
    fontFamily: "CormorantGaramond_700Bold",
    color: "#FFF",
  },
  summaryLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  createButton: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  createButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "CormorantGaramond_700Bold",
    marginBottom: Spacing.sm,
  },
  emptyCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing["3xl"],
    alignItems: "center",
    gap: Spacing.sm,
    ...Shadows.card,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: Spacing.sm,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: "center",
  },
  dealCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  dealHeader: {
    marginBottom: Spacing.sm,
  },
  dealTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginRight: Spacing.sm,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  dealVendor: {
    fontSize: 13,
    marginTop: 2,
  },
  dealPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.08)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  priceBlock: {
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: "line-through",
  },
  dealPriceText: {
    fontSize: 16,
    fontWeight: "700",
  },
  discountBadge: {
    backgroundColor: "#E74C3C",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginLeft: "auto",
  },
  discountText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  dealInfoRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  dealInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dealInfoText: {
    fontSize: 12,
  },
  deactivateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
    gap: 6,
  },
  deactivateText: {
    color: "#E74C3C",
    fontSize: 13,
    fontWeight: "600",
  },
  listingCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  listingContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  listingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  listingInfo: {
    flex: 1,
  },
  listingName: {
    fontSize: 15,
    fontWeight: "600",
  },
  listingLocation: {
    fontSize: 12,
    marginTop: 2,
  },
  listingMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: 4,
  },
  listingPrice: {
    fontSize: 13,
    fontWeight: "600",
  },
  activeDealsTag: {
    backgroundColor: "#27AE6020",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  activeDealsText: {
    color: "#27AE60",
    fontSize: 10,
    fontWeight: "600",
  },
  listingDealButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DAA52015",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
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
    fontSize: 22,
    fontFamily: "CormorantGaramond_700Bold",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  listingPicker: {
    maxHeight: 80,
  },
  listingPickerItem: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 120,
  },
  listingPickerText: {
    fontSize: 13,
    fontWeight: "600",
    maxWidth: 100,
  },
  listingPickerPrice: {
    fontSize: 11,
  },
  discountRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  discountOption: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  discountOptionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  discountInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    width: 60,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  pricePreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    backgroundColor: "#1A4D2E10",
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  pricePreviewItem: {
    alignItems: "center",
  },
  pricePreviewLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  pricePreviewValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  durationRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  durationOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  durationText: {
    fontSize: 12,
    fontWeight: "600",
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
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  errorText: {
    color: "#E74C3C",
    fontSize: 13,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  selectListingHint: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    gap: Spacing.sm,
  },
  selectListingText: {
    fontSize: 14,
    textAlign: "center",
  },
});
