import React, { useState } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  Pressable,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useNavigation } from "@react-navigation/native";
import { EmptyState } from "@/components/EmptyState";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { formatPrice } from "@/lib/currency";

interface Booking {
  id: string;
  tripId: string | null;
  vendorType: string;
  vendorId: string;
  vendorName: string;
  checkInDate: string | null;
  checkOutDate: string | null;
  adults: number | null;
  children: number | null;
  totalGuests: number | null;
  totalPrice: number | null;
  status: string | null;
  notes: string | null;
  createdAt: string;
}

interface Trip {
  id: string;
  name: string;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  adults: number | null;
  children: number | null;
  status: string | null;
  totalCost: number | null;
  createdAt: string;
  bookings?: Booking[];
}

const VENDOR_TYPE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  restaurant: "coffee",
  safari: "sun",
  accommodation: "home",
  companion: "users",
};

const VENDOR_TYPE_EMOJIS: Record<string, string> = {
  restaurant: "🍽️",
  safari: "🦁",
  accommodation: "🏨",
  companion: "👫",
};

const VENDOR_TYPE_COLORS: Record<string, string> = {
  restaurant: "#2D6A4F",
  safari: "#DAA520",
  accommodation: "#34495E",
  companion: "#8E5CC5",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#FF9500",
  confirmed: "#34C759",
  cancelled: "#FF3B30",
  planning: "#007AFF",
  completed: "#8E8E93",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function BookingCard({ booking }: { booking: Booking }) {
  const { theme } = useTheme();
  const vendorColor = VENDOR_TYPE_COLORS[booking.vendorType] || theme.primary;
  const icon = VENDOR_TYPE_ICONS[booking.vendorType] || "map-pin";
  const statusColor = STATUS_COLORS[booking.status || "pending"] || theme.textSecondary;

  return (
    <View style={[styles.bookingCard, { backgroundColor: theme.backgroundDefault }]}>
      <View style={[styles.bookingIconContainer, { backgroundColor: vendorColor + "15" }]}>
        <Feather name={icon} size={18} color={vendorColor} />
      </View>
      <View style={styles.bookingContent}>
        <ThemedText type="label" numberOfLines={1}>
          {booking.vendorName}
        </ThemedText>
        <View style={styles.bookingMeta}>
          <ThemedText type="caption">{formatDate(booking.checkInDate)}</ThemedText>
          {booking.totalGuests ? (
            <ThemedText type="caption">
              {booking.totalGuests} guest{booking.totalGuests !== 1 ? "s" : ""}
            </ThemedText>
          ) : null}
        </View>
      </View>
      <View style={styles.bookingRight}>
        {booking.totalPrice ? (
          <ThemedText type="label" style={{ color: theme.primary }}>
            {formatPrice(booking.totalPrice)}
          </ThemedText>
        ) : null}
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </View>
    </View>
  );
}

function TripCard({ trip, onDelete, onViewMemories }: { trip: Trip; onDelete: () => void; onViewMemories: () => void }) {
  const { theme, isDark } = useTheme();
  const [expanded, setExpanded] = useState(true);
  const statusColor = STATUS_COLORS[trip.status || "planning"] || theme.textSecondary;
  const bookingCount = trip.bookings?.length || 0;

  const stayCount = trip.bookings?.filter((b) => b.vendorType === "accommodation").length || 0;
  const experienceCount =
    trip.bookings?.filter(
      (b) => b.vendorType === "safari" || b.vendorType === "companion" || b.vendorType === "restaurant"
    ).length || 0;

  return (
    <View
      style={[
        styles.tripCard,
        { backgroundColor: theme.backgroundSecondary },
        Shadows.card,
      ]}
    >
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpanded(!expanded);
        }}
        style={styles.tripHeader}
      >
        <View style={styles.tripHeaderLeft}>
          <LinearGradient
            colors={isDark ? ["#1A4D2E", "#0F2D1A"] : ["#1A4D2E", "#2D6A4F"]}
            style={styles.tripIcon}
          >
            <Feather name="map" size={18} color="#FFFFFF" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <ThemedText type="h4" numberOfLines={1}>
              {trip.name}
            </ThemedText>
            {trip.destination ? (
              <ThemedText type="caption" numberOfLines={1}>
                {trip.destination}
              </ThemedText>
            ) : null}
          </View>
        </View>
        <View style={styles.tripHeaderRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <ThemedText type="small" style={{ color: statusColor, fontWeight: "600" }}>
              {(trip.status || "planning").charAt(0).toUpperCase() +
                (trip.status || "planning").slice(1)}
            </ThemedText>
          </View>
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={theme.textSecondary}
          />
        </View>
      </Pressable>

      <View style={styles.tripMeta}>
        <View style={styles.tripMetaItem}>
          <Feather name="calendar" size={14} color={theme.textSecondary} />
          <ThemedText type="caption">
            {formatDate(trip.startDate)}
            {trip.endDate ? ` - ${formatDate(trip.endDate)}` : ""}
          </ThemedText>
        </View>
        <View style={styles.tripMetaItem}>
          <Feather name="dollar-sign" size={14} color={theme.accent} />
          <ThemedText type="caption" style={{ color: theme.accent, fontWeight: "600" }}>
            {formatPrice(trip.totalCost)} total
          </ThemedText>
        </View>
      </View>

      {bookingCount > 0 ? (
        <View style={styles.tripStats}>
          <View style={styles.tripStatItem}>
            <ThemedText type="h4" style={{ color: theme.primary }}>
              {bookingCount}
            </ThemedText>
            <ThemedText type="small">Booking{bookingCount !== 1 ? "s" : ""}</ThemedText>
          </View>
          {stayCount > 0 ? (
            <View style={styles.tripStatItem}>
              <ThemedText type="h4" style={{ color: VENDOR_TYPE_COLORS.accommodation }}>
                {stayCount}
              </ThemedText>
              <ThemedText type="small">🏨 Stay{stayCount !== 1 ? "s" : ""}</ThemedText>
            </View>
          ) : null}
          {experienceCount > 0 ? (
            <View style={styles.tripStatItem}>
              <ThemedText type="h4" style={{ color: VENDOR_TYPE_COLORS.safari }}>
                {experienceCount}
              </ThemedText>
              <ThemedText type="small">🌟 Experience{experienceCount !== 1 ? "s" : ""}</ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}

      {expanded && trip.bookings && trip.bookings.length > 0 ? (
        <View style={styles.bookingsList}>
          {trip.bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </View>
      ) : null}

      {expanded && (!trip.bookings || trip.bookings.length === 0) ? (
        <View style={styles.emptyBookings}>
          <Feather name="plus-circle" size={24} color={theme.textSecondary} />
          <ThemedText type="caption" style={{ opacity: 0.6 }}>
            No bookings yet. Browse experiences to add.
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.tripActions}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onViewMemories();
          }}
          style={[styles.memoriesButton, { backgroundColor: theme.primary + "15" }]}
          testID={`button-memories-trip-${trip.id}`}
        >
          <Feather name="camera" size={14} color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
            Memories
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => {
            Alert.alert("Delete Trip", `Delete "${trip.name}" and all its bookings?`, [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: onDelete },
            ]);
          }}
          style={styles.deleteButton}
          testID={`button-delete-trip-${trip.id}`}
        >
          <Feather name="trash-2" size={14} color={theme.error} />
          <ThemedText type="small" style={{ color: theme.error }}>
            Delete
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function NewTripModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, destination: string) => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter a trip name");
      return;
    }
    onCreate(name.trim(), destination.trim());
    setName("");
    setDestination("");
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
            <ThemedText type="h3">Plan a New Trip</ThemedText>
            <Pressable onPress={onClose} testID="button-close-new-trip">
              <Feather name="x" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.fieldGroup}>
              <ThemedText type="label">Trip Name</ThemedText>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Kenya Adventure 2026"
                placeholderTextColor={theme.textSecondary}
                testID="input-trip-name"
              />
            </View>
            <View style={styles.fieldGroup}>
              <ThemedText type="label">Destination (Optional)</ThemedText>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={destination}
                onChangeText={setDestination}
                placeholder="e.g. Nairobi, Kenya"
                placeholderTextColor={theme.textSecondary}
                testID="input-trip-destination"
              />
            </View>
            <Pressable
              onPress={handleCreate}
              style={[
                styles.createTripBtn,
                { backgroundColor: theme.primary, opacity: name.trim() ? 1 : 0.5 },
              ]}
              disabled={!name.trim()}
              testID="button-create-trip-submit"
            >
              <Feather name="plus" size={18} color="#FFFFFF" />
              <ThemedText type="label" style={{ color: "#FFFFFF", fontSize: 16 }}>
                Create Trip
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function TimelineScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const [showNewTrip, setShowNewTrip] = useState(false);

  const { data: trips = [], isLoading } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
  });

  const tripsWithBookings = useQuery<Trip[]>({
    queryKey: ["/api/trips", "detailed"],
    queryFn: async () => {
      const tripsRes = await fetch(new URL("/api/trips", getApiUrl()).toString());
      const tripsData: Trip[] = await tripsRes.json();
      const detailed = await Promise.all(
        tripsData.map(async (trip) => {
          try {
            const res = await fetch(new URL(`/api/trips/${trip.id}`, getApiUrl()).toString());
            return await res.json();
          } catch {
            return { ...trip, bookings: [] };
          }
        })
      );
      return detailed;
    },
  });

  const detailedTrips = tripsWithBookings.data || [];

  const createTripMutation = useMutation({
    mutationFn: async ({ name, destination }: { name: string; destination: string }) => {
      const res = await apiRequest("POST", "/api/trips", {
        name,
        destination: destination || null,
        status: "planning",
      });
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      setShowNewTrip(false);
    },
  });

  const deleteTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      await apiRequest("DELETE", `/api/trips/${tripId}`);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
    },
  });

  const totalBookings = detailedTrips.reduce(
    (sum, t) => sum + (t.bookings?.length || 0),
    0
  );
  const totalCost = detailedTrips.reduce((sum, t) => sum + (t.totalCost || 0), 0);

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-timeline.png")}
      title="No trips planned yet"
      subtitle="Create a trip and start adding bookings to build your travel itinerary"
    />
  );

  const renderHeader = () => (
    <>
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={isDark ? ["#1A4D2E", "#0F2D1A"] : ["#1A4D2E", "#2D6A4F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerCard}
      >
        <View style={styles.headerPattern}>
          <View style={[styles.patternCircle, styles.patternCircle1]} />
          <View style={[styles.patternCircle, styles.patternCircle2]} />
        </View>
        <View style={styles.headerContent}>
          <View style={styles.headerIconWrap}>
            <Feather name="globe" size={28} color="#DAA520" />
          </View>
          <ThemedText type="h1" style={styles.headerTitle}>
            ✈️ Your Trips
          </ThemedText>
          <ThemedText type="body" style={styles.headerSubtitle}>
            {detailedTrips.length} trip{detailedTrips.length !== 1 ? "s" : ""} planned
          </ThemedText>
        </View>
        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
              <Feather name="map" size={16} color="#FFFFFF" />
            </View>
            <ThemedText type="caption" style={styles.statLabel}>
              {detailedTrips.length} Trip{detailedTrips.length !== 1 ? "s" : ""}
            </ThemedText>
          </View>
          <View style={styles.headerStat}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
              <Feather name="bookmark" size={16} color="#FFFFFF" />
            </View>
            <ThemedText type="caption" style={styles.statLabel}>
              {totalBookings} Booking{totalBookings !== 1 ? "s" : ""}
            </ThemedText>
          </View>
          <View style={styles.headerStat}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
              <Feather name="dollar-sign" size={16} color="#DAA520" />
            </View>
            <ThemedText type="caption" style={styles.statLabel}>
              {formatPrice(totalCost)}
            </ThemedText>
          </View>
        </View>
      </LinearGradient>
    </View>
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate("FlightStatus" as any);
      }}
      style={[styles.flightBanner, { backgroundColor: theme.backgroundDefault }, Shadows.card]}
      testID="button-flight-status"
    >
      <View style={[styles.flightBannerIcon, { backgroundColor: "#0077B615" }]}>
        <ThemedText style={{ fontSize: 22 }}>✈️</ThemedText>
      </View>
      <View style={styles.flightBannerContent}>
        <ThemedText type="label">Track Your Flight</ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          Check real-time flight status 🛫
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
    </>
  );

  const renderItem = ({ item }: { item: Trip }) => (
    <TripCard
      trip={item}
      onDelete={() => deleteTripMutation.mutate(item.id)}
      onViewMemories={() =>
        navigation.navigate("TripMemories", {
          tripId: item.id,
          tripName: item.name,
          tripDestination: item.destination || undefined,
        })
      }
    />
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={detailedTrips}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl + 80,
          paddingHorizontal: Spacing.lg,
          flexGrow: 1,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={detailedTrips.length > 0 ? renderHeader : null}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.lg }} />}
      />

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowNewTrip(true);
        }}
        style={[
          styles.fab,
          {
            backgroundColor: theme.primary,
            bottom: tabBarHeight + Spacing.lg,
          },
        ]}
        testID="button-new-trip-fab"
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
      </Pressable>

      <NewTripModal
        visible={showNewTrip}
        onClose={() => setShowNewTrip(false)}
        onCreate={(name, destination) => createTripMutation.mutate({ name, destination })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerContainer: { marginBottom: Spacing.md },
  flightBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing["2xl"],
    marginTop: Spacing.md,
  },
  flightBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  flightBannerContent: {
    flex: 1,
  },
  headerCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    overflow: "hidden",
    position: "relative",
  },
  headerPattern: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 160,
    height: 160,
  },
  patternCircle: {
    position: "absolute",
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  patternCircle1: { width: 100, height: 100, right: 20, top: 40 },
  patternCircle2: { width: 140, height: 140, right: -20, top: 20 },
  headerContent: {
    alignItems: "center",
    marginBottom: Spacing.xl,
    zIndex: 1,
  },
  headerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  headerTitle: { color: "#FFFFFF", marginBottom: Spacing.xs },
  headerSubtitle: { color: "rgba(255,255,255,0.8)" },
  headerStats: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing["2xl"],
    zIndex: 1,
  },
  headerStat: { alignItems: "center", gap: Spacing.sm },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: { color: "rgba(255,255,255,0.8)" },
  tripCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    overflow: "hidden",
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  tripHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  tripIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tripHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  tripMeta: {
    flexDirection: "row",
    gap: Spacing.xl,
    marginBottom: Spacing.md,
    paddingLeft: 52,
  },
  tripMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tripStats: {
    flexDirection: "row",
    gap: Spacing.xl,
    paddingLeft: 52,
    marginBottom: Spacing.md,
  },
  tripStatItem: {
    alignItems: "center",
  },
  bookingsList: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  bookingCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  bookingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bookingContent: { flex: 1 },
  bookingMeta: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: 2,
  },
  bookingRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyBookings: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  tripActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  memoriesButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.sm,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
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
  modalBody: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  modalInput: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
  },
  createTripBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
});
