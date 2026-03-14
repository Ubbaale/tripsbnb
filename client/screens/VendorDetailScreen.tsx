import React, { useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { formatPrice, formatPriceDetailed, getCurrencySymbol } from "@/lib/currency";

type VendorType = "restaurant" | "safari" | "accommodation" | "companion" | "car_rental";

const VENDOR_CONFIG: Record<
  VendorType,
  {
    icon: keyof typeof Feather.glyphMap;
    gradientColors: readonly [string, string];
    label: string;
    priceLabel: string;
  }
> = {
  restaurant: {
    icon: "coffee",
    gradientColors: ["#1A4D2E", "#2D6A4F"],
    label: "Restaurant",
    priceLabel: "per booking",
  },
  safari: {
    icon: "sun",
    gradientColors: ["#B8860B", "#DAA520"],
    label: "Safari",
    priceLabel: "per person",
  },
  accommodation: {
    icon: "home",
    gradientColors: ["#2C3E50", "#34495E"],
    label: "Accommodation",
    priceLabel: "per night",
  },
  companion: {
    icon: "users",
    gradientColors: ["#6B3FA0", "#8E5CC5"],
    label: "Companion",
    priceLabel: "per session",
  },
  car_rental: {
    icon: "truck",
    gradientColors: ["#1B4F72", "#2E86C1"],
    label: "Car Rental",
    priceLabel: "/day",
  },
};

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

interface Trip {
  id: string;
  name: string;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string | null;
  totalCost: number | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function getDayAfterTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().split("T")[0];
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 1);
}

function StarRating({
  rating,
  onRatingChange,
  interactive = false,
  size = 24,
}: {
  rating: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
  size?: number;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => {
            if (interactive && onRatingChange) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onRatingChange(star);
            }
          }}
          disabled={!interactive}
        >
          <Feather
            name="star"
            size={size}
            color={star <= rating ? theme.accent : theme.border}
            style={{ opacity: star <= rating ? 1 : 0.3 }}
          />
        </Pressable>
      ))}
    </View>
  );
}

function ReviewCard({ review }: { review: Rating }) {
  const { theme } = useTheme();
  const date = new Date(review.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <View style={[styles.reviewCard, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={styles.reviewHeader}>
        <View style={[styles.reviewAvatar, { backgroundColor: theme.primary + "20" }]}>
          <Feather name="user" size={16} color={theme.primary} />
        </View>
        <View style={styles.reviewHeaderContent}>
          <ThemedText type="label">Guest</ThemedText>
          <ThemedText type="caption" style={styles.reviewDate}>
            {formattedDate}
          </ThemedText>
        </View>
        <StarRating rating={review.rating} size={14} />
      </View>
      {review.comment ? (
        <ThemedText type="body" style={styles.reviewComment}>
          {review.comment}
        </ThemedText>
      ) : null}
    </View>
  );
}

function InfoRow({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Feather name={icon} size={18} color={theme.textSecondary} />
      <ThemedText type="body" style={{ flex: 1 }}>
        {text}
      </ThemedText>
    </View>
  );
}

function GuestCounter({
  label,
  count,
  onIncrement,
  onDecrement,
  min = 0,
}: {
  label: string;
  count: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.guestRow}>
      <ThemedText type="label">{label}</ThemedText>
      <View style={styles.counterControls}>
        <Pressable
          onPress={() => {
            if (count > min) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onDecrement();
            }
          }}
          style={[
            styles.counterButton,
            { borderColor: theme.border, opacity: count <= min ? 0.3 : 1 },
          ]}
          disabled={count <= min}
          testID={`button-decrement-${label.toLowerCase()}`}
        >
          <Feather name="minus" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="h4" style={styles.counterValue}>
          {count}
        </ThemedText>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onIncrement();
          }}
          style={[styles.counterButton, { borderColor: theme.border }]}
          testID={`button-increment-${label.toLowerCase()}`}
        >
          <Feather name="plus" size={16} color={theme.text} />
        </Pressable>
      </View>
    </View>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.dateFieldContainer}>
      <ThemedText type="caption" style={styles.dateFieldLabel}>
        {label}
      </ThemedText>
      <TextInput
        style={[
          styles.dateInput,
          { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={theme.textSecondary}
        testID={`input-${label.toLowerCase().replace(/\s/g, "-")}`}
      />
    </View>
  );
}

function BookingModal({
  visible,
  onClose,
  vendor,
  vendorType,
  config,
}: {
  visible: boolean;
  onClose: () => void;
  vendor: any;
  vendorType: VendorType;
  config: (typeof VENDOR_CONFIG)[VendorType];
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [checkInDate, setCheckInDate] = useState(getTomorrow());
  const [checkOutDate, setCheckOutDate] = useState(getDayAfterTomorrow());
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [newTripName, setNewTripName] = useState("");
  const [notes, setNotes] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedInsurance, setAgreedInsurance] = useState(false);
  const [agreedDeposit, setAgreedDeposit] = useState(false);

  const { data: existingTrips = [] } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
    enabled: visible,
  });

  const activeTrips = existingTrips.filter(
    (t) => t.status === "planning" || t.status === "confirmed"
  );

  const pricePerUnit = vendor.bookingPrice || 0;
  const totalGuests = adults + children;

  const { data: groupDiscountData } = useQuery<any>({
    queryKey: ["/api/group-discount/calculate", vendorType, vendor.id, totalGuests, pricePerUnit],
    queryFn: () =>
      fetch(
        `${getApiUrl()}/api/group-discount/calculate?vendorType=${vendorType}&vendorId=${vendor.id}&groupSize=${totalGuests}&basePrice=${pricePerUnit}`
      ).then((r) => r.json()),
    enabled: totalGuests >= 2,
  });

  const groupDiscountPercent = totalGuests >= 2 ? (groupDiscountData?.discountPercent || 0) : 0;

  const calculateTotalPrice = useCallback(() => {
    let base = pricePerUnit;
    if (vendorType === "accommodation" || vendorType === "car_rental") {
      const nights = daysBetween(checkInDate, checkOutDate);
      base = pricePerUnit * nights;
    } else if (vendorType === "safari" || vendorType === "companion") {
      base = pricePerUnit * totalGuests;
    }
    if (groupDiscountPercent > 0) {
      base = Math.round(base * (1 - groupDiscountPercent / 100));
    }
    return base;
  }, [vendorType, pricePerUnit, checkInDate, checkOutDate, totalGuests, groupDiscountPercent]);

  const totalPrice = calculateTotalPrice();
  const totalPriceDollars = formatPriceDetailed(totalPrice, vendor.bookingCurrency || "usd");
  const originalTotalBeforeDiscount = (() => {
    if (vendorType === "accommodation" || vendorType === "car_rental") return pricePerUnit * daysBetween(checkInDate, checkOutDate);
    if (vendorType === "safari" || vendorType === "companion") return pricePerUnit * totalGuests;
    return pricePerUnit;
  })();

  const createTripMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/trips", {
        name,
        destination: `${vendor.city}, ${vendor.country}`,
        startDate: checkInDate,
        endDate: checkOutDate,
        adults,
        children,
      });
      return response.json();
    },
    onSuccess: (trip: Trip) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      setSelectedTripId(trip.id);
      setShowNewTrip(false);
      setNewTripName("");
    },
  });

  const apiBase = `/api/${vendorType === "accommodation" ? "accommodations" : vendorType === "car_rental" ? "car-rentals" : vendorType + "s"}`;

  const bookingMutation = useMutation({
    mutationFn: async () => {
      const bookingData = {
        tripId: selectedTripId,
        vendorType,
        vendorId: vendor.id,
        vendorName: vendor.name,
        checkInDate,
        checkOutDate: vendorType === "accommodation" || vendorType === "car_rental" ? checkOutDate : checkInDate,
        adults,
        children,
        totalGuests,
        pricePerUnit,
        totalPrice,
        currency: vendor.bookingCurrency || "usd",
        status: "pending",
        notes: notes || null,
      };
      const response = await apiRequest("POST", "/api/bookings", bookingData);
      return response.json();
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });

      if (vendor.stripePriceId) {
        try {
          const checkoutResponse = await apiRequest("POST", `${apiBase}/${vendor.id}/checkout`);
          const data = await checkoutResponse.json();
          if (data.url) {
            onClose();
            if (Platform.OS === "web") {
              Linking.openURL(data.url);
            } else {
              await WebBrowser.openBrowserAsync(data.url);
            }
            return;
          }
        } catch {
          // Stripe checkout failed, but booking was saved
        }
      }

      onClose();
      Alert.alert("Booking Confirmed", "Your booking has been added to your trip.");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to create booking");
    },
  });

  const handleConfirmBooking = () => {
    if (!checkInDate) {
      Alert.alert("Date Required", "Please select a check-in date");
      return;
    }
    if ((vendorType === "accommodation" || vendorType === "car_rental") && !checkOutDate) {
      Alert.alert("Date Required", "Please select a check-out date");
      return;
    }
    if (adults < 1) {
      Alert.alert("Guests Required", "At least 1 adult is required");
      return;
    }
    if (vendorType === "car_rental" && vendor.rentalAgreementRequired) {
      if (!agreedTerms || !agreedInsurance) {
        Alert.alert("Agreement Required", "Please accept the rental agreement terms and insurance acknowledgment before booking.");
        return;
      }
      if (vendor.securityDeposit && !agreedDeposit) {
        Alert.alert("Deposit Agreement Required", "Please acknowledge the security deposit requirement.");
        return;
      }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    bookingMutation.mutate();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.backgroundDefault,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View style={styles.modalHandle}>
            <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
          </View>

          <View style={styles.modalHeader}>
            <ThemedText type="h3">Book {vendor.name}</ThemedText>
            <Pressable onPress={onClose} testID="button-close-modal">
              <Feather name="x" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            <View style={[styles.modalSection, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText type="label" style={styles.modalSectionTitle}>
                Dates
              </ThemedText>
              <View style={styles.dateRow}>
                <DateField label="Check In" value={checkInDate} onChange={setCheckInDate} />
                {vendorType === "accommodation" || vendorType === "car_rental" ? (
                  <DateField label="Check Out" value={checkOutDate} onChange={setCheckOutDate} />
                ) : null}
              </View>
              {vendorType === "accommodation" || vendorType === "car_rental" ? (
                <ThemedText type="caption" style={{ marginTop: Spacing.xs, opacity: 0.6 }}>
                  {daysBetween(checkInDate, checkOutDate)} {vendorType === "car_rental" ? "day" : "night"}
                  {daysBetween(checkInDate, checkOutDate) !== 1 ? "s" : ""}
                </ThemedText>
              ) : null}
            </View>

            <View style={[styles.modalSection, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText type="label" style={styles.modalSectionTitle}>
                Guests
              </ThemedText>
              <GuestCounter
                label="Adults"
                count={adults}
                onIncrement={() => setAdults((a) => a + 1)}
                onDecrement={() => setAdults((a) => a - 1)}
                min={1}
              />
              <GuestCounter
                label="Children"
                count={children}
                onIncrement={() => setChildren((c) => c + 1)}
                onDecrement={() => setChildren((c) => c - 1)}
                min={0}
              />
            </View>

            <View style={[styles.modalSection, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText type="label" style={styles.modalSectionTitle}>
                Add to Trip (Optional)
              </ThemedText>
              {activeTrips.length > 0 ? (
                <View style={styles.tripList}>
                  {activeTrips.map((trip) => (
                    <Pressable
                      key={trip.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedTripId(selectedTripId === trip.id ? null : trip.id);
                      }}
                      style={[
                        styles.tripOption,
                        {
                          borderColor:
                            selectedTripId === trip.id ? theme.primary : theme.border,
                          backgroundColor:
                            selectedTripId === trip.id
                              ? theme.primary + "10"
                              : theme.backgroundDefault,
                        },
                      ]}
                      testID={`button-trip-${trip.id}`}
                    >
                      <Feather
                        name={selectedTripId === trip.id ? "check-circle" : "circle"}
                        size={20}
                        color={selectedTripId === trip.id ? theme.primary : theme.textSecondary}
                      />
                      <View style={{ flex: 1 }}>
                        <ThemedText type="label">{trip.name}</ThemedText>
                        {trip.destination ? (
                          <ThemedText type="caption">{trip.destination}</ThemedText>
                        ) : null}
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {showNewTrip ? (
                <View style={styles.newTripForm}>
                  <TextInput
                    style={[
                      styles.tripInput,
                      {
                        backgroundColor: theme.backgroundDefault,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    value={newTripName}
                    onChangeText={setNewTripName}
                    placeholder="Trip name (e.g. Kenya Adventure)"
                    placeholderTextColor={theme.textSecondary}
                    testID="input-new-trip-name"
                  />
                  <View style={styles.newTripButtons}>
                    <Pressable
                      onPress={() => {
                        setShowNewTrip(false);
                        setNewTripName("");
                      }}
                      style={[styles.tripCancelBtn, { borderColor: theme.border }]}
                    >
                      <ThemedText type="caption">Cancel</ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        if (newTripName.trim()) {
                          createTripMutation.mutate(newTripName.trim());
                        }
                      }}
                      disabled={!newTripName.trim() || createTripMutation.isPending}
                      style={[
                        styles.tripCreateBtn,
                        {
                          backgroundColor: theme.primary,
                          opacity: !newTripName.trim() ? 0.5 : 1,
                        },
                      ]}
                      testID="button-create-trip"
                    >
                      {createTripMutation.isPending ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <ThemedText type="caption" style={{ color: "#FFFFFF" }}>
                          Create
                        </ThemedText>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowNewTrip(true);
                  }}
                  style={[styles.newTripButton, { borderColor: theme.primary }]}
                  testID="button-new-trip"
                >
                  <Feather name="plus" size={16} color={theme.primary} />
                  <ThemedText type="label" style={{ color: theme.primary }}>
                    Create New Trip
                  </ThemedText>
                </Pressable>
              )}
            </View>

            <View style={[styles.modalSection, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText type="label" style={styles.modalSectionTitle}>
                Notes (Optional)
              </ThemedText>
              <TextInput
                style={[
                  styles.notesInput,
                  {
                    backgroundColor: theme.backgroundDefault,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Special requests, preferences..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={2}
                testID="input-booking-notes"
              />
            </View>

            {vendorType === "car_rental" && vendor.rentalAgreementRequired ? (
              <View style={[styles.modalSection, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText type="label" style={styles.modalSectionTitle}>
                  Rental Agreement
                </ThemedText>
                <View style={styles.agreementChecklist}>
                  <Pressable
                    style={styles.agreementCheckItem}
                    onPress={() => setAgreedTerms(!agreedTerms)}
                    testID="button-agree-terms"
                  >
                    <View style={[styles.checkbox, { borderColor: theme.border }, agreedTerms ? { backgroundColor: theme.primary, borderColor: theme.primary } : undefined]}>
                      {agreedTerms ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
                    </View>
                    <ThemedText type="body" style={{ flex: 1 }}>
                      I agree to the rental terms and conditions, including vehicle return in the same condition
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={styles.agreementCheckItem}
                    onPress={() => setAgreedInsurance(!agreedInsurance)}
                    testID="button-agree-insurance"
                  >
                    <View style={[styles.checkbox, { borderColor: theme.border }, agreedInsurance ? { backgroundColor: theme.primary, borderColor: theme.primary } : undefined]}>
                      {agreedInsurance ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
                    </View>
                    <ThemedText type="body" style={{ flex: 1 }}>
                      I understand the insurance coverage ({vendor.insuranceType || "basic"}) and damage excess ({vendor.damageExcess ? formatPrice(vendor.damageExcess, vendor.bookingCurrency || "usd") : "N/A"})
                    </ThemedText>
                  </Pressable>
                  {vendor.securityDeposit ? (
                    <Pressable
                      style={styles.agreementCheckItem}
                      onPress={() => setAgreedDeposit(!agreedDeposit)}
                      testID="button-agree-deposit"
                    >
                      <View style={[styles.checkbox, { borderColor: theme.border }, agreedDeposit ? { backgroundColor: theme.primary, borderColor: theme.primary } : undefined]}>
                        {agreedDeposit ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
                      </View>
                      <ThemedText type="body" style={{ flex: 1 }}>
                        I agree to the refundable security deposit of {formatPrice(vendor.securityDeposit, vendor.bookingCurrency || "usd")}
                      </ThemedText>
                    </Pressable>
                  ) : null}
                  {vendor.idVerificationRequired ? (
                    <View style={[styles.agreementInfoRow, { backgroundColor: theme.primary + "08" }]}>
                      <Feather name="info" size={14} color={theme.primary} />
                      <ThemedText type="caption" style={{ flex: 1, color: theme.primary }}>
                        Valid {vendor.requiredDocuments ? vendor.requiredDocuments.split(",").map((d: string) => d.trim().replace(/_/g, " ")).join(" & ") : "ID"} required at pickup
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            <View style={[styles.priceSummary, { backgroundColor: theme.primary + "08" }]}>
              <ThemedText type="label">Price Summary</ThemedText>
              <View style={styles.priceLineItem}>
                <ThemedText type="body">
                  {formatPriceDetailed(pricePerUnit, vendor.bookingCurrency || "usd")} {config.priceLabel}
                </ThemedText>
                <ThemedText type="body">
                  {vendorType === "accommodation" || vendorType === "car_rental"
                    ? `x ${daysBetween(checkInDate, checkOutDate)} ${vendorType === "car_rental" ? "day" : "night"}${daysBetween(checkInDate, checkOutDate) !== 1 ? "s" : ""}`
                    : vendorType === "safari" || vendorType === "companion"
                      ? `x ${totalGuests} guest${totalGuests !== 1 ? "s" : ""}`
                      : ""}
                </ThemedText>
              </View>
              {groupDiscountPercent > 0 ? (
                <View style={styles.groupDiscountRow}>
                  <View style={styles.groupDiscountBadge}>
                    <Feather name="users" size={12} color="#27AE60" />
                    <ThemedText type="caption" style={{ color: "#27AE60", fontWeight: "700" }}>
                      Group Discount ({groupDiscountPercent}% OFF)
                    </ThemedText>
                  </View>
                  <ThemedText type="body" style={{ color: "#27AE60", fontWeight: "600" }}>
                    -{formatPriceDetailed(originalTotalBeforeDiscount - totalPrice, vendor.bookingCurrency || "usd")}
                  </ThemedText>
                </View>
              ) : null}
              {totalGuests >= 2 && groupDiscountPercent <= 0 ? (
                <View style={styles.groupDiscountHint}>
                  <Feather name="info" size={12} color={theme.textSecondary} />
                  <ThemedText type="caption" style={{ color: theme.textSecondary, flex: 1 }}>
                    Add more travelers for group discounts!
                  </ThemedText>
                </View>
              ) : null}
              <View style={[styles.priceTotalRow, { borderTopColor: theme.border }]}>
                <ThemedText type="h4">Total</ThemedText>
                <View style={{ alignItems: "flex-end" }}>
                  {groupDiscountPercent > 0 ? (
                    <ThemedText type="caption" style={{ textDecorationLine: "line-through", color: theme.textSecondary }}>
                      {formatPriceDetailed(originalTotalBeforeDiscount, vendor.bookingCurrency || "usd")}
                    </ThemedText>
                  ) : null}
                  <ThemedText type="h3" style={{ color: groupDiscountPercent > 0 ? "#27AE60" : theme.primary }}>
                    {totalPriceDollars}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.savingsComparison}>
                <Feather name="check-circle" size={13} color="#27AE60" />
                <ThemedText type="caption" style={{ color: "#27AE60", fontWeight: "600", flex: 1 }}>
                  {`You save ${formatPriceDetailed(Math.round(totalPrice * 0.05), vendor.bookingCurrency || "usd")} in fees vs Airbnb`}
                </ThemedText>
              </View>
            </View>
          </ScrollView>

          <Pressable
            onPress={handleConfirmBooking}
            disabled={bookingMutation.isPending}
            style={[
              styles.confirmButton,
              { backgroundColor: theme.primary },
              bookingMutation.isPending ? { opacity: 0.7 } : undefined,
            ]}
            testID="button-confirm-booking"
          >
            {bookingMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Feather name="check" size={20} color="#FFFFFF" />
                <ThemedText type="label" style={{ color: "#FFFFFF", fontSize: 16 }}>
                  Confirm Booking - {totalPriceDollars}
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function VendorDetailScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { vendorType, vendorId } = route.params as {
    vendorType: VendorType;
    vendorId: string;
  };

  const config = VENDOR_CONFIG[vendorType];

  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("");

  useEffect(() => {
    AsyncStorage.getItem("@tripverse_device_id").then((id) => {
      if (id) setDeviceId(id);
    });
  }, []);

  const apiBase = `/api/${vendorType === "accommodation" ? "accommodations" : vendorType === "car_rental" ? "car-rentals" : vendorType + "s"}`;

  const { data: vendor, isLoading } = useQuery<any>({
    queryKey: [apiBase, vendorId],
  });

  const { data: ratings = [], isLoading: isLoadingRatings } = useQuery<Rating[]>({
    queryKey: [apiBase, vendorId, "/ratings"],
  });

  const submitRatingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `${apiBase}/${vendorId}/ratings`, {
        rating: newRating,
        comment: newComment || null,
      });
      return response.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: [apiBase, vendorId] });
      queryClient.invalidateQueries({ queryKey: [apiBase, vendorId, "/ratings"] });
      setShowReviewForm(false);
      setNewRating(0);
      setNewComment("");
      Alert.alert("Thank you!", "Your review has been submitted.");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to submit review");
    },
  });

  const handleSubmitReview = () => {
    if (newRating === 0) {
      Alert.alert("Rating Required", "Please select a star rating");
      return;
    }
    submitRatingMutation.mutate();
  };

  const handleBookNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowBookingModal(true);
  };

  const handleMakeOffer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowNegotiationModal(true);
  };

  const handleChatWithVendor = useCallback(async () => {
    if (!vendor) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await apiRequest("POST", "/api/chat/conversations", {
        userId: "anonymous",
        vendorType,
        vendorId,
        vendorName: vendor.name,
        vendorImageUrl: vendor.imageUrl || vendor.photos?.[0] || null,
      });
      const convo = await res.json();
      rootNavigation.navigate("Chat", {
        conversationId: convo.id,
        vendorName: vendor.name,
        vendorType,
        vendorImageUrl: vendor.imageUrl || vendor.photos?.[0] || null,
      });
    } catch (error: any) {
      Alert.alert("Error", "Failed to start chat. Please try again.");
    }
  }, [vendor, vendorType, vendorId, rootNavigation]);

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </ThemedView>
    );
  }

  if (!vendor) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={theme.error} />
          <ThemedText type="h4">{config.label} not found</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const avgRating = parseFloat(vendor.averageRating) || 0;
  const priceInDollars = vendor.bookingPrice ? formatPrice(vendor.bookingPrice, vendor.bookingCurrency || "usd") : null;
  const hasStripePrice = !!vendor.stripePriceId;
  const hasBookingPrice = !!vendor.bookingPrice;

  const renderVendorSpecificInfo = () => {
    switch (vendorType) {
      case "restaurant":
        return (
          <>
            <InfoRow icon="tag" text={vendor.cuisineType} />
            <InfoRow icon="map-pin" text={`${vendor.address}, ${vendor.city}, ${vendor.country}`} />
            {vendor.priceRange ? (
              <InfoRow icon="dollar-sign" text={`Price range: ${vendor.priceRange}`} />
            ) : null}
          </>
        );
      case "safari":
        return (
          <>
            <InfoRow icon="compass" text={vendor.safariType.replace(/_/g, " ")} />
            <InfoRow icon="clock" text={`Duration: ${vendor.duration}`} />
            {vendor.groupSize ? (
              <InfoRow icon="users" text={`Max group size: ${vendor.groupSize}`} />
            ) : null}
            <InfoRow icon="map-pin" text={`${vendor.address}, ${vendor.city}, ${vendor.country}`} />
          </>
        );
      case "accommodation":
        return (
          <>
            <InfoRow icon="home" text={vendor.propertyType.replace(/_/g, " ")} />
            <InfoRow icon="map-pin" text={`${vendor.address}, ${vendor.city}, ${vendor.country}`} />
            {vendor.amenities ? (
              <InfoRow icon="check-circle" text={vendor.amenities.split(",").join(" \u2022 ")} />
            ) : null}
            {vendor.roomTypes ? (
              <InfoRow icon="grid" text={`Rooms: ${vendor.roomTypes.split(",").join(", ")}`} />
            ) : null}
          </>
        );
      case "companion":
        return (
          <>
            <InfoRow icon="briefcase" text={vendor.serviceType.replace(/_/g, " ")} />
            <InfoRow icon="globe" text={`Languages: ${vendor.languages}`} />
            <InfoRow icon="map-pin" text={`${vendor.city}, ${vendor.country}`} />
            {vendor.specialties ? (
              <InfoRow icon="award" text={`Specialties: ${vendor.specialties}`} />
            ) : null}
          </>
        );
      case "car_rental":
        return (
          <>
            <InfoRow icon="truck" text={`${vendor.vehicleType?.replace(/_/g, " ")} - ${vendor.transmission}`} />
            <InfoRow icon="map-pin" text={`${vendor.address}, ${vendor.city}, ${vendor.country}`} />
            {vendor.features ? (
              <InfoRow icon="check-circle" text={vendor.features.split(",").map((f: string) => f.trim().replace(/_/g, " ")).join(" • ")} />
            ) : null}
            {vendor.mileageLimit ? (
              <InfoRow icon="activity" text={`Mileage: ${vendor.mileageLimit}`} />
            ) : null}
            {vendor.fuelPolicy ? (
              <InfoRow icon="droplet" text={`Fuel: ${vendor.fuelPolicy.replace(/_/g, " ")}`} />
            ) : null}
            {vendor.minimumAge ? (
              <InfoRow icon="user" text={`Minimum age: ${vendor.minimumAge}`} />
            ) : null}
          </>
        );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Spacing.md, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={config.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroImage}
        >
          <View style={styles.heroContent}>
            <Feather name={config.icon} size={64} color="rgba(255,255,255,0.3)" />
          </View>
          {vendor.verified ? (
            <View style={[styles.verifiedBadge, { backgroundColor: theme.accent }]}>
              <Feather name="check" size={12} color="#FFFFFF" />
              <ThemedText type="caption" style={styles.verifiedText}>
                Verified
              </ThemedText>
            </View>
          ) : null}
          {priceInDollars ? (
            <View style={styles.heroPriceBadge}>
              <ThemedText type="h4" style={styles.heroPriceText}>
                {priceInDollars}
              </ThemedText>
              <ThemedText type="small" style={styles.heroPriceLabel}>
                {config.priceLabel}
              </ThemedText>
            </View>
          ) : null}
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="h1">{vendor.name}</ThemedText>
            <View style={styles.metaRow}>
              <View style={styles.ratingContainer}>
                <Feather name="star" size={18} color={theme.accent} />
                <ThemedText type="h4" style={{ color: theme.accent }}>
                  {avgRating > 0 ? avgRating.toFixed(1) : "New"}
                </ThemedText>
                {vendor.totalRatings > 0 ? (
                  <ThemedText type="caption">
                    ({vendor.totalRatings} review{vendor.totalRatings !== 1 ? "s" : ""})
                  </ThemedText>
                ) : null}
              </View>
              <View style={[styles.typeBadge, { backgroundColor: config.gradientColors[0] + "15" }]}>
                <ThemedText type="caption" style={{ color: config.gradientColors[0] }}>
                  {config.label}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.section}>{renderVendorSpecificInfo()}</View>

          {vendorType === "car_rental" ? (
            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                Protection & Security
              </ThemedText>
              <View style={[styles.protectionGrid]}>
                {vendor.insuranceType ? (
                  <View style={[styles.protectionCard, { backgroundColor: theme.backgroundSecondary }]}>
                    <View style={[styles.protectionIcon, { backgroundColor: theme.primary + "15" }]}>
                      <Feather name="shield" size={20} color={theme.primary} />
                    </View>
                    <ThemedText type="label">{vendor.insuranceType.charAt(0).toUpperCase() + vendor.insuranceType.slice(1)} Insurance</ThemedText>
                    {vendor.insuranceCoverage ? (
                      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                        {vendor.insuranceCoverage.split(",").map((c: string) => c.trim().replace(/_/g, " ")).join(", ")}
                      </ThemedText>
                    ) : null}
                  </View>
                ) : null}
                {vendor.securityDeposit ? (
                  <View style={[styles.protectionCard, { backgroundColor: theme.backgroundSecondary }]}>
                    <View style={[styles.protectionIcon, { backgroundColor: theme.accent + "15" }]}>
                      <Feather name="lock" size={20} color={theme.accent} />
                    </View>
                    <ThemedText type="label">Security Deposit</ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                      {formatPrice(vendor.securityDeposit, vendor.bookingCurrency || "usd")} refundable
                    </ThemedText>
                  </View>
                ) : null}
                {vendor.gpsTracking ? (
                  <View style={[styles.protectionCard, { backgroundColor: theme.backgroundSecondary }]}>
                    <View style={[styles.protectionIcon, { backgroundColor: "#27AE60" + "15" }]}>
                      <Feather name="navigation" size={20} color="#27AE60" />
                    </View>
                    <ThemedText type="label">GPS Tracked</ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                      Vehicle location monitored
                    </ThemedText>
                  </View>
                ) : null}
                {vendor.idVerificationRequired ? (
                  <View style={[styles.protectionCard, { backgroundColor: theme.backgroundSecondary }]}>
                    <View style={[styles.protectionIcon, { backgroundColor: "#E67E22" + "15" }]}>
                      <Feather name="credit-card" size={20} color="#E67E22" />
                    </View>
                    <ThemedText type="label">ID Required</ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                      {vendor.requiredDocuments ? vendor.requiredDocuments.split(",").map((d: string) => d.trim().replace(/_/g, " ")).join(", ") : "Valid ID needed"}
                    </ThemedText>
                  </View>
                ) : null}
                {vendor.damageExcess ? (
                  <View style={[styles.protectionCard, { backgroundColor: theme.backgroundSecondary }]}>
                    <View style={[styles.protectionIcon, { backgroundColor: "#E74C3C" + "15" }]}>
                      <Feather name="alert-triangle" size={20} color="#E74C3C" />
                    </View>
                    <ThemedText type="label">Damage Excess</ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                      Max liability: {formatPrice(vendor.damageExcess, vendor.bookingCurrency || "usd")}
                    </ThemedText>
                  </View>
                ) : null}
                {vendor.cancellationPolicy ? (
                  <View style={[styles.protectionCard, { backgroundColor: theme.backgroundSecondary }]}>
                    <View style={[styles.protectionIcon, { backgroundColor: "#9B59B6" + "15" }]}>
                      <Feather name="calendar" size={20} color="#9B59B6" />
                    </View>
                    <ThemedText type="label">Cancellation</ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                      {vendor.cancellationPolicy.charAt(0).toUpperCase() + vendor.cancellationPolicy.slice(1)} policy
                    </ThemedText>
                  </View>
                ) : null}
                {vendor.lateReturnFee ? (
                  <View style={[styles.protectionCard, { backgroundColor: theme.backgroundSecondary }]}>
                    <View style={[styles.protectionIcon, { backgroundColor: "#F39C12" + "15" }]}>
                      <Feather name="clock" size={20} color="#F39C12" />
                    </View>
                    <ThemedText type="label">Late Return Fee</ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                      {formatPrice(vendor.lateReturnFee, vendor.bookingCurrency || "usd")}/hour
                    </ThemedText>
                  </View>
                ) : null}
              </View>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  rootNavigation.navigate("DamageReport", {
                    carRentalId: vendor.id,
                    carRentalName: vendor.name,
                  });
                }}
                style={[styles.conditionReportButton, { borderColor: theme.primary }]}
                testID="button-damage-report"
              >
                <Feather name="file-text" size={18} color={theme.primary} />
                <ThemedText type="label" style={{ color: theme.primary }}>
                  Report Vehicle Condition
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          {vendor.phone ? <InfoRow icon="phone" text={vendor.phone} /> : null}
          {vendor.email ? <InfoRow icon="mail" text={vendor.email} /> : null}
          {vendor.website ? <InfoRow icon="external-link" text={vendor.website} /> : null}

          {vendorType === "accommodation" && vendor.monthlyAvailable && vendor.monthlyPrice && vendor.monthlyPrice > 0 ? (() => {
            const hasSavings = vendor.bookingPrice && vendor.bookingPrice > 0 && vendor.monthlyPrice < vendor.bookingPrice * 30;
            const savingsPercent = hasSavings ? Math.round((1 - (vendor.monthlyPrice / (vendor.bookingPrice * 30))) * 100) : 0;
            return (
            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>Monthly Rate</ThemedText>
              <View style={{ backgroundColor: "rgba(46,204,113,0.08)", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "rgba(46,204,113,0.25)" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Feather name="calendar" size={18} color="#2ECC71" />
                  <ThemedText type="label" style={{ color: "#27AE60", fontSize: 16 }}>Monthly Rate Available</ThemedText>
                  {hasSavings && savingsPercent > 0 ? (
                    <View style={{ backgroundColor: "#E74C3C", paddingHorizontal: 10, paddingVertical: 2, borderRadius: 20, marginLeft: "auto" }}>
                      <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 11 }}>
                        Save {savingsPercent}%
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                  <ThemedText type="h2" style={{ color: theme.text }}>{formatPrice(vendor.monthlyPrice, vendor.bookingCurrency || "usd")}</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>/ month</ThemedText>
                </View>
                {hasSavings ? (
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    vs {formatPrice(vendor.bookingPrice * 30, vendor.bookingCurrency || "usd")} at nightly rate (30 nights)
                  </ThemedText>
                ) : null}
                {vendor.minimumStay && vendor.minimumStay > 1 ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                    <Feather name="info" size={12} color={theme.textSecondary} />
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>Minimum stay: {vendor.minimumStay} nights</ThemedText>
                  </View>
                ) : null}
              </View>
            </View>
            );
          })() : null}

          {vendor.description ? (
            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                About
              </ThemedText>
              <ThemedText type="body" style={styles.description}>
                {vendor.description}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <ThemedText type="h4">Reviews</ThemedText>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowReviewForm(!showReviewForm);
                }}
                style={[styles.addReviewButton, { backgroundColor: theme.primary }]}
              >
                <Feather name="plus" size={16} color="#FFFFFF" />
                <ThemedText type="caption" style={styles.addReviewText}>
                  Add Review
                </ThemedText>
              </Pressable>
            </View>

            {showReviewForm ? (
              <View
                style={[styles.reviewForm, { backgroundColor: theme.backgroundSecondary }, Shadows.card]}
              >
                <ThemedText type="label" style={styles.formLabel}>
                  Your Rating
                </ThemedText>
                <StarRating rating={newRating} onRatingChange={setNewRating} interactive size={32} />
                <ThemedText type="label" style={[styles.formLabel, { marginTop: Spacing.lg }]}>
                  Your Review (Optional)
                </ThemedText>
                <TextInput
                  style={[
                    styles.commentInput,
                    { backgroundColor: theme.backgroundDefault, color: theme.text },
                  ]}
                  placeholder="Share your experience..."
                  placeholderTextColor={theme.textSecondary}
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  numberOfLines={3}
                  testID="input-review-comment"
                />
                <View style={styles.formButtons}>
                  <Pressable
                    onPress={() => setShowReviewForm(false)}
                    style={[styles.cancelButton, { borderColor: theme.border }]}
                    testID="button-cancel-review"
                  >
                    <ThemedText type="label">Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={handleSubmitReview}
                    disabled={submitRatingMutation.isPending}
                    style={[
                      styles.submitButton,
                      { backgroundColor: theme.primary },
                      submitRatingMutation.isPending ? { opacity: 0.7 } : undefined,
                    ]}
                    testID="button-submit-review"
                  >
                    {submitRatingMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <ThemedText type="label" style={styles.submitButtonText}>
                        Submit
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : null}

            {isLoadingRatings ? (
              <ActivityIndicator color={theme.primary} style={styles.reviewsLoading} />
            ) : ratings.length > 0 ? (
              <View style={styles.reviewsList}>
                {ratings.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </View>
            ) : (
              <View style={styles.noReviews}>
                <Feather name="message-circle" size={32} color={theme.textSecondary} />
                <ThemedText type="body" style={styles.noReviewsText}>
                  No reviews yet. Be the first!
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {hasBookingPrice ? (
        <View
          style={[
            styles.bookingBar,
            {
              backgroundColor: theme.backgroundDefault,
              paddingBottom: insets.bottom + Spacing.md,
              borderTopColor: theme.border,
            },
          ]}
        >
          <View style={styles.bookingPriceSection}>
            <ThemedText type="h3" style={{ color: theme.primary }}>
              {priceInDollars}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {config.priceLabel}
            </ThemedText>
            {vendorType === "accommodation" && vendor?.monthlyAvailable && vendor?.monthlyPrice ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                <Feather name="calendar" size={10} color="#2ECC71" />
                <ThemedText type="small" style={{ color: "#2ECC71", fontWeight: "700", fontSize: 11 }}>
                  {formatPrice(vendor.monthlyPrice, vendor.bookingCurrency || "usd")}/mo
                </ThemedText>
              </View>
            ) : null}
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const targetPrice = Math.round((vendor.bookingPrice || 0) * 0.8);
              if (!deviceId) {
                Alert.alert("Price Alert", "Unable to set alert. Please try again.");
                return;
              }
              fetch(`${getApiUrl()}/api/price-alerts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  deviceId,
                  vendorType,
                  vendorId: vendor.id,
                  vendorName: vendor.name,
                  targetPrice,
                  currentPrice: vendor.bookingPrice || 0,
                  isActive: true,
                }),
              })
                .then((r) => r.json())
                .then(() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert(
                    "Price Alert Set",
                    `We'll notify you when the price drops below ${formatPrice(targetPrice, vendor.bookingCurrency || "usd")}!`
                  );
                })
                .catch(() => Alert.alert("Error", "Failed to set price alert"));
            }}
            style={[styles.chatButton, { borderColor: "#DAA520" }]}
            testID="button-price-alert"
          >
            <Feather name="bell" size={18} color="#DAA520" />
          </Pressable>
          <Pressable
            onPress={handleChatWithVendor}
            style={[styles.chatButton, { borderColor: theme.primary }]}
            testID="button-chat-vendor"
          >
            <Feather name="message-circle" size={18} color={theme.primary} />
          </Pressable>
          {vendor.bookingPrice >= 10000 ? (
            <Pressable
              onPress={handleMakeOffer}
              style={[styles.offerButton, { borderColor: theme.accent }]}
              testID="button-make-offer"
            >
              <Feather name="tag" size={16} color={theme.accent} />
              <ThemedText type="caption" style={{ color: theme.accent, fontWeight: "700", fontSize: 11 }}>
                Offer
              </ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleBookNow}
            style={[styles.bookButton, { backgroundColor: theme.primary }]}
            testID="button-book-now"
          >
            <Feather name="calendar" size={18} color="#FFFFFF" />
            <ThemedText type="label" style={styles.bookButtonText}>
              Book Now
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {vendor ? (
        <>
          <BookingModal
            visible={showBookingModal}
            onClose={() => setShowBookingModal(false)}
            vendor={vendor}
            vendorType={vendorType}
            config={config}
          />
          <NegotiationModal
            visible={showNegotiationModal}
            onClose={() => setShowNegotiationModal(false)}
            vendor={vendor}
            vendorType={vendorType}
            deviceId={deviceId}
          />
        </>
      ) : null}
    </ThemedView>
  );
}

function NegotiationModal({
  visible,
  onClose,
  vendor,
  vendorType,
  deviceId,
}: {
  visible: boolean;
  onClose: () => void;
  vendor: any;
  vendorType: VendorType;
  deviceId: string;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const originalPrice = vendor.bookingPrice || 0;
  const minOffer = Math.floor(originalPrice * 0.7);
  const maxOffer = originalPrice - 100;

  const [offerAmount, setOfferAmount] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (visible) {
      setOfferAmount(Math.floor(originalPrice * 0.85 / 100).toString());
      setMessage("");
      setSubmitted(false);
    }
  }, [visible, originalPrice]);

  const offerCents = Math.round(parseFloat(offerAmount || "0") * 100);
  const savings = originalPrice - offerCents;
  const savingsPercent = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;
  const isValidOffer = offerCents >= minOffer && offerCents < originalPrice;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/negotiations", {
        deviceId,
        vendorType,
        vendorId: vendor.id,
        vendorName: vendor.name,
        originalPrice,
        offerPrice: offerCents,
        currency: vendor.bookingCurrency || "usd",
        message: message || null,
      });
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/negotiations"] });
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to submit offer");
    },
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.backgroundDefault,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View style={styles.modalHandle}>
            <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
          </View>

          <View style={styles.modalHeader}>
            <ThemedText type="h3">
              {submitted ? "🎉 Offer Sent!" : "💰 Make an Offer"}
            </ThemedText>
            <Pressable onPress={onClose} testID="button-close-negotiation">
              <Feather name="x" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          {submitted ? (
            <View style={{ padding: Spacing.xl, alignItems: "center", gap: Spacing.lg }}>
              <View style={[styles.negotiationSuccessIcon, { backgroundColor: theme.primary + "15" }]}>
                <Feather name="check-circle" size={48} color={theme.primary} />
              </View>
              <ThemedText type="h4" style={{ textAlign: "center" }}>
                Your offer of {formatPrice(offerCents, vendor.bookingCurrency || "usd")} has been sent
              </ThemedText>
              <ThemedText type="body" style={{ textAlign: "center", opacity: 0.7 }}>
                The vendor will review your offer and respond within 48 hours. You'll be notified when they accept, counter, or decline.
              </ThemedText>
              <View style={[styles.negotiationInfoCard, { backgroundColor: theme.backgroundSecondary }]}>
                <View style={styles.negotiationInfoRow}>
                  <ThemedText type="caption">Listed Price</ThemedText>
                  <ThemedText type="label">{formatPrice(originalPrice, vendor.bookingCurrency || "usd")}</ThemedText>
                </View>
                <View style={styles.negotiationInfoRow}>
                  <ThemedText type="caption">Your Offer</ThemedText>
                  <ThemedText type="label" style={{ color: theme.primary }}>{formatPrice(offerCents, vendor.bookingCurrency || "usd")}</ThemedText>
                </View>
                <View style={styles.negotiationInfoRow}>
                  <ThemedText type="caption">Potential Savings</ThemedText>
                  <ThemedText type="label" style={{ color: theme.success }}>{formatPrice(savings, vendor.bookingCurrency || "usd")} ({savingsPercent}%)</ThemedText>
                </View>
              </View>
              <Pressable
                onPress={onClose}
                style={[styles.confirmButton, { backgroundColor: theme.primary, marginHorizontal: 0, width: "100%" }]}
                testID="button-done-negotiation"
              >
                <ThemedText type="label" style={{ color: "#FFF" }}>Done</ThemedText>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={[styles.negotiationVendorCard, { backgroundColor: theme.backgroundSecondary }]}>
                <LinearGradient
                  colors={VENDOR_CONFIG[vendorType].gradientColors}
                  style={styles.negotiationVendorIcon}
                >
                  <Feather name={VENDOR_CONFIG[vendorType].icon} size={20} color="#FFF" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <ThemedText type="label">{vendor.name}</ThemedText>
                  <ThemedText type="caption">Listed at {formatPrice(originalPrice, vendor.bookingCurrency || "usd")}</ThemedText>
                </View>
              </View>

              <View style={[styles.modalSection, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText type="label" style={styles.modalSectionTitle}>
                  Your Offer Price ({getCurrencySymbol(vendor.bookingCurrency || "usd")})
                </ThemedText>
                <View style={styles.negotiationPriceInput}>
                  <ThemedText type="h3" style={{ color: theme.textSecondary }}>{getCurrencySymbol(vendor.bookingCurrency || "usd")}</ThemedText>
                  <TextInput
                    style={[styles.negotiationAmountInput, { color: theme.text }]}
                    value={offerAmount}
                    onChangeText={setOfferAmount}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                    testID="input-offer-amount"
                  />
                </View>
                <View style={styles.negotiationRange}>
                  <ThemedText type="caption" style={{ opacity: 0.6 }}>
                    Min: {formatPrice(minOffer, vendor.bookingCurrency || "usd")}
                  </ThemedText>
                  <ThemedText type="caption" style={{ opacity: 0.6 }}>
                    Max: {formatPrice(originalPrice - 100, vendor.bookingCurrency || "usd")}
                  </ThemedText>
                </View>
                {isValidOffer ? (
                  <View style={[styles.negotiationSavingsBadge, { backgroundColor: "#27AE6015" }]}>
                    <Feather name="trending-down" size={14} color="#27AE60" />
                    <ThemedText type="caption" style={{ color: "#27AE60", fontWeight: "600" }}>
                      Save {formatPrice(savings, vendor.bookingCurrency || "usd")} ({savingsPercent}% off)
                    </ThemedText>
                  </View>
                ) : offerAmount ? (
                  <View style={[styles.negotiationSavingsBadge, { backgroundColor: "#E74C3C15" }]}>
                    <Feather name="alert-circle" size={14} color="#E74C3C" />
                    <ThemedText type="caption" style={{ color: "#E74C3C" }}>
                      {offerCents < minOffer ? `Minimum offer is ${formatPrice(minOffer, vendor.bookingCurrency || "usd")}` : "Offer must be less than listed price"}
                    </ThemedText>
                  </View>
                ) : null}
              </View>

              <View style={[styles.modalSection, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText type="label" style={styles.modalSectionTitle}>
                  Message (Optional)
                </ThemedText>
                <TextInput
                  style={[
                    styles.notesInput,
                    {
                      color: theme.text,
                      backgroundColor: theme.backgroundDefault,
                      borderColor: theme.border,
                    },
                  ]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Tell the vendor why this price works for you..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  testID="input-offer-message"
                />
              </View>

              <View style={[styles.negotiationInfoCard, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText type="label" style={{ marginBottom: Spacing.sm }}>
                  📋 How It Works
                </ThemedText>
                <View style={{ gap: Spacing.xs }}>
                  <ThemedText type="caption" style={{ opacity: 0.7 }}>
                    1. Submit your offer (min 70% of listed price)
                  </ThemedText>
                  <ThemedText type="caption" style={{ opacity: 0.7 }}>
                    2. Vendor can accept, counter, or decline
                  </ThemedText>
                  <ThemedText type="caption" style={{ opacity: 0.7 }}>
                    3. Up to 3 rounds of negotiation
                  </ThemedText>
                  <ThemedText type="caption" style={{ opacity: 0.7 }}>
                    4. Offers expire after 48 hours
                  </ThemedText>
                </View>
              </View>
            </ScrollView>
          )}

          {!submitted ? (
            <Pressable
              onPress={() => submitMutation.mutate()}
              disabled={!isValidOffer || submitMutation.isPending}
              style={[
                styles.confirmButton,
                {
                  backgroundColor: isValidOffer ? theme.accent : theme.border,
                  opacity: submitMutation.isPending ? 0.7 : 1,
                },
              ]}
              testID="button-submit-offer"
            >
              {submitMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="send" size={18} color="#FFFFFF" />
                  <ThemedText type="label" style={{ color: "#FFFFFF" }}>
                    Submit Offer
                  </ThemedText>
                </>
              )}
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: Spacing.lg },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: Spacing["4xl"] },
  heroImage: { height: 220, justifyContent: "center", alignItems: "center" },
  heroContent: { opacity: 0.5 },
  verifiedBadge: {
    position: "absolute",
    top: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  verifiedText: { color: "#FFFFFF", fontWeight: "600" },
  heroPriceBadge: {
    position: "absolute",
    bottom: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  heroPriceText: { color: "#FFFFFF" },
  heroPriceLabel: { color: "rgba(255,255,255,0.8)" },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  header: { marginBottom: Spacing.xl },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
  },
  ratingContainer: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  typeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { marginBottom: Spacing.md },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  description: { lineHeight: 24 },
  reviewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  addReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  addReviewText: { color: "#FFFFFF" },
  reviewForm: { padding: Spacing.lg, borderRadius: BorderRadius.lg, marginBottom: Spacing.lg },
  formLabel: { marginBottom: Spacing.sm },
  starContainer: { flexDirection: "row", gap: Spacing.sm },
  commentInput: {
    height: 80,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    textAlignVertical: "top",
  },
  formButtons: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.lg },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  submitButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  submitButtonText: { color: "#FFFFFF" },
  reviewsLoading: { paddingVertical: Spacing.xl },
  reviewsList: { gap: Spacing.md },
  reviewCard: { padding: Spacing.lg, borderRadius: BorderRadius.lg },
  reviewHeader: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  reviewHeaderContent: { flex: 1 },
  reviewDate: { opacity: 0.6 },
  reviewComment: { marginTop: Spacing.sm, lineHeight: 22 },
  noReviews: { alignItems: "center", paddingVertical: Spacing.xl, gap: Spacing.md },
  noReviewsText: { opacity: 0.7 },
  bookingBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  bookingPriceSection: {},
  chatButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  bookButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  bookButtonText: { color: "#FFFFFF" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "90%",
  },
  modalHandle: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  modalScrollView: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  modalSection: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  modalSectionTitle: {
    marginBottom: Spacing.md,
  },
  dateRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  dateFieldContainer: {
    flex: 1,
  },
  dateFieldLabel: {
    marginBottom: Spacing.xs,
  },
  dateInput: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 15,
    borderWidth: 1,
  },
  guestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  counterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  counterValue: {
    minWidth: 24,
    textAlign: "center",
  },
  tripList: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tripOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  newTripButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    gap: Spacing.sm,
  },
  newTripForm: {
    gap: Spacing.sm,
  },
  tripInput: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 15,
    borderWidth: 1,
  },
  newTripButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  tripCancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  tripCreateBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  notesInput: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 15,
    borderWidth: 1,
    minHeight: 60,
    textAlignVertical: "top",
  },
  priceSummary: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  priceLineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
  },
  priceTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  savingsComparison: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: "rgba(39,174,96,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  offerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    gap: 4,
  },
  negotiationSuccessIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  negotiationVendorCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  negotiationVendorIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  negotiationPriceInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  negotiationAmountInput: {
    fontSize: 32,
    fontWeight: "700",
    flex: 1,
    paddingVertical: Spacing.sm,
  },
  negotiationRange: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  negotiationSavingsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
    alignSelf: "flex-start",
  },
  negotiationInfoCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  negotiationInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  groupDiscountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  groupDiscountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  groupDiscountHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  protectionGrid: {
    gap: Spacing.sm,
  },
  protectionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  protectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  agreementChecklist: {
    gap: Spacing.md,
  },
  agreementCheckItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  agreementInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  conditionReportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    marginTop: Spacing.md,
  },
});
