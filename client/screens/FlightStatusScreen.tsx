import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FlightEndpoint {
  airport: string;
  iata: string;
  scheduled: string;
  estimated: string | null;
  actual: string | null;
  terminal: string | null;
  gate: string | null;
}

interface FlightData {
  flight_date: string;
  flight_status: string;
  departure: FlightEndpoint;
  arrival: FlightEndpoint;
  airline: { name: string; iata: string };
  flight: { number: string; iata: string };
}

const STATUS_CONFIG: Record<string, { color: string; label: string; emoji: string }> = {
  scheduled: { color: "#007AFF", label: "Scheduled", emoji: "🕐" },
  active: { color: "#34C759", label: "In Flight", emoji: "✈️" },
  landed: { color: "#AF52DE", label: "Landed", emoji: "🛬" },
  cancelled: { color: "#FF3B30", label: "Cancelled", emoji: "❌" },
  incident: { color: "#FF3B30", label: "Incident", emoji: "⚠️" },
  delayed: { color: "#FF9500", label: "Delayed", emoji: "⏳" },
  diverted: { color: "#FFD60A", label: "Diverted", emoji: "🔀" },
};

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "--:--";
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function getFlightProgress(status: string): number {
  switch (status) {
    case "scheduled":
      return 0;
    case "active":
      return 0.5;
    case "landed":
      return 1;
    case "delayed":
      return 0.1;
    case "diverted":
      return 0.6;
    case "cancelled":
      return 0;
    default:
      return 0;
  }
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
  return (
    <View style={[styles.statusBadge, { backgroundColor: `${config.color}18` }]}>
      <ThemedText style={styles.statusEmoji}>{config.emoji}</ThemedText>
      <ThemedText style={[styles.statusLabel, { color: config.color }]}>
        {config.label}
      </ThemedText>
    </View>
  );
}

function FlightProgressBar({ status }: { status: string }) {
  const { theme } = useTheme();
  const progress = getFlightProgress(status);
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressRow}>
        <View style={[styles.progressDot, { backgroundColor: progress >= 0 ? config.color : theme.border }]}>
          <ThemedText style={styles.progressDotEmoji}>🛫</ThemedText>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: `${theme.border}` }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%`, backgroundColor: config.color },
            ]}
          />
          {progress > 0 && progress < 1 ? (
            <View style={[styles.planeIndicator, { left: `${progress * 100}%` }]}>
              <ThemedText style={styles.planeEmoji}>✈️</ThemedText>
            </View>
          ) : null}
        </View>
        <View style={[styles.progressDot, { backgroundColor: progress >= 1 ? config.color : theme.border }]}>
          <ThemedText style={styles.progressDotEmoji}>🛬</ThemedText>
        </View>
      </View>
      <View style={styles.progressLabels}>
        <ThemedText style={[styles.progressLabel, { color: theme.textSecondary }]}>Departure</ThemedText>
        <ThemedText style={[styles.progressLabel, { color: theme.textSecondary }]}>Arrival</ThemedText>
      </View>
    </View>
  );
}

function EndpointCard({
  endpoint,
  type,
  isDark,
}: {
  endpoint: FlightEndpoint;
  type: "departure" | "arrival";
  isDark: boolean;
}) {
  const { theme } = useTheme();
  const gradientColors: [string, string] = type === "departure"
    ? isDark ? ["#1A4D2E", "#0D2617"] : ["#1A4D2E", "#2D6B45"]
    : isDark ? ["#4A2D1A", "#2D1A0D"] : ["#DAA520", "#C4941A"];

  const emoji = type === "departure" ? "🛫" : "🛬";
  const label = type === "departure" ? "Departure" : "Arrival";

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.endpointCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.endpointHeader}>
        <ThemedText style={styles.endpointEmoji}>{emoji}</ThemedText>
        <ThemedText style={styles.endpointLabel}>{label}</ThemedText>
      </View>

      <View style={styles.endpointAirport}>
        <ThemedText style={styles.endpointIata}>{endpoint.iata}</ThemedText>
        <ThemedText style={styles.endpointAirportName} numberOfLines={2}>
          {endpoint.airport}
        </ThemedText>
      </View>

      <View style={styles.endpointTimesRow}>
        <View style={styles.endpointTimeBlock}>
          <ThemedText style={styles.endpointTimeLabel}>Scheduled</ThemedText>
          <ThemedText style={styles.endpointTime}>{formatTime(endpoint.scheduled)}</ThemedText>
        </View>
        {endpoint.estimated ? (
          <View style={styles.endpointTimeBlock}>
            <ThemedText style={styles.endpointTimeLabel}>Estimated</ThemedText>
            <ThemedText style={styles.endpointTime}>{formatTime(endpoint.estimated)}</ThemedText>
          </View>
        ) : null}
        {endpoint.actual ? (
          <View style={styles.endpointTimeBlock}>
            <ThemedText style={styles.endpointTimeLabel}>Actual</ThemedText>
            <ThemedText style={styles.endpointTime}>{formatTime(endpoint.actual)}</ThemedText>
          </View>
        ) : null}
      </View>

      <View style={styles.endpointDetailsRow}>
        {endpoint.terminal ? (
          <View style={styles.endpointDetail}>
            <Feather name="layers" size={12} color="rgba(255,255,255,0.7)" />
            <ThemedText style={styles.endpointDetailText}>
              Terminal {endpoint.terminal}
            </ThemedText>
          </View>
        ) : null}
        {endpoint.gate ? (
          <View style={styles.endpointDetail}>
            <Feather name="log-in" size={12} color="rgba(255,255,255,0.7)" />
            <ThemedText style={styles.endpointDetailText}>
              Gate {endpoint.gate}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </LinearGradient>
  );
}

function FlightCard({ flight, isDark }: { flight: FlightData; isDark: boolean }) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[styles.flightCard, animatedStyle, { backgroundColor: theme.backgroundDefault }]}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      testID={`flight-card-${flight.flight.iata}`}
    >
      <View style={styles.flightCardHeader}>
        <View style={styles.flightIdentity}>
          <ThemedText style={styles.flightEmoji}>✈️</ThemedText>
          <View>
            <ThemedText type="h4" style={{ color: theme.text }}>
              {flight.airline.name}
            </ThemedText>
            <ThemedText style={[styles.flightNumber, { color: theme.accent }]}>
              {flight.flight.iata}
            </ThemedText>
          </View>
        </View>
        <View style={styles.flightHeaderRight}>
          <StatusBadge status={flight.flight_status} />
          {flight.flight_date ? (
            <ThemedText style={[styles.flightDate, { color: theme.textSecondary }]}>
              📅 {formatDate(flight.flight_date)}
            </ThemedText>
          ) : null}
        </View>
      </View>

      <View style={styles.routeSummary}>
        <View style={styles.routePoint}>
          <ThemedText style={[styles.routeIata, { color: theme.primary }]}>
            {flight.departure.iata}
          </ThemedText>
          <ThemedText style={[styles.routeTime, { color: theme.text }]}>
            {formatTime(flight.departure.scheduled)}
          </ThemedText>
        </View>
        <View style={styles.routeLine}>
          <View style={[styles.routeDash, { backgroundColor: theme.border }]} />
          <ThemedText style={styles.routePlaneEmoji}>✈️</ThemedText>
          <View style={[styles.routeDash, { backgroundColor: theme.border }]} />
        </View>
        <View style={styles.routePoint}>
          <ThemedText style={[styles.routeIata, { color: theme.primary }]}>
            {flight.arrival.iata}
          </ThemedText>
          <ThemedText style={[styles.routeTime, { color: theme.text }]}>
            {formatTime(flight.arrival.scheduled)}
          </ThemedText>
        </View>
      </View>

      <FlightProgressBar status={flight.flight_status} />

      <View style={styles.endpointCards}>
        <EndpointCard endpoint={flight.departure} type="departure" isDark={isDark} />
        <EndpointCard endpoint={flight.arrival} type="arrival" isDark={isDark} />
      </View>
    </AnimatedPressable>
  );
}

export default function FlightStatusScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [flightNumber, setFlightNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const searchScale = useSharedValue(1);
  const searchAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: searchScale.value }],
  }));

  const { data, isLoading, isError, error } = useQuery<{ data: FlightData[] }>({
    queryKey: ["flights", "status", searchQuery],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const url = new URL(`/api/flights/status?flight_iata=${encodeURIComponent(searchQuery)}`, baseUrl);
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    },
    enabled: searchQuery.length > 0,
  });

  const flights = data?.data || [];

  const handleSearch = () => {
    const trimmed = flightNumber.trim().toUpperCase();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchQuery(trimmed);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: Spacing.md,
        paddingBottom: insets.bottom + Spacing["4xl"],
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
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
              <View style={styles.heroIcon}>
                <Feather name="navigation" size={22} color="#DAA520" />
              </View>
            </View>
            <ThemedText style={styles.heroTitle}>Flight Status ✈️</ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              Track any flight in real-time. Enter a flight number to get live status, departure and arrival details. 🌍
            </ThemedText>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.searchSection}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <Feather name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Enter flight number (e.g. AA100)"
            placeholderTextColor={theme.textSecondary}
            value={flightNumber}
            onChangeText={setFlightNumber}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            testID="input-flight-number"
          />
          {flightNumber.length > 0 ? (
            <Pressable
              onPress={() => {
                setFlightNumber("");
                setSearchQuery("");
              }}
              testID="button-clear"
            >
              <Feather name="x-circle" size={18} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>
        <AnimatedPressable
          style={[
            styles.searchButton,
            searchAnimatedStyle,
            { backgroundColor: theme.primary, opacity: flightNumber.trim() ? 1 : 0.5 },
          ]}
          onPressIn={() => {
            searchScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
          }}
          onPressOut={() => {
            searchScale.value = withSpring(1, { damping: 15, stiffness: 300 });
          }}
          onPress={handleSearch}
          disabled={!flightNumber.trim()}
          testID="button-search-flight"
        >
          <Feather name="search" size={18} color="#FFF" />
          <ThemedText style={styles.searchButtonText}>Track Flight 🔍</ThemedText>
        </AnimatedPressable>
      </View>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <ThemedText style={[styles.stateText, { color: theme.textSecondary }]}>
            Searching for flight {searchQuery}... ✈️
          </ThemedText>
        </View>
      ) : null}

      {isError ? (
        <View style={[styles.errorContainer, { backgroundColor: `${theme.error}15` }]}>
          <Feather name="alert-circle" size={20} color={theme.error} />
          <ThemedText style={[styles.errorText, { color: theme.error }]}>
            {error?.message?.includes("404")
              ? `Flight ${searchQuery} not found. Please check the flight number and try again. 🔍`
              : `Something went wrong while fetching flight data. Please try again later. 😔`}
          </ThemedText>
        </View>
      ) : null}

      {!isLoading && !isError && searchQuery.length > 0 && flights.length === 0 ? (
        <View style={styles.stateContainer}>
          <ThemedText style={styles.emptyEmoji}>🔭</ThemedText>
          <ThemedText type="h3" style={{ color: theme.text, textAlign: "center" }}>
            No flights found
          </ThemedText>
          <ThemedText style={[styles.stateText, { color: theme.textSecondary }]}>
            We couldn't find any results for "{searchQuery}". Double-check the flight number and try again. ✈️
          </ThemedText>
        </View>
      ) : null}

      {!searchQuery ? (
        <View style={styles.stateContainer}>
          <ThemedText style={styles.emptyEmoji}>🌐</ThemedText>
          <ThemedText type="h3" style={{ color: theme.text, textAlign: "center" }}>
            Search for a flight
          </ThemedText>
          <ThemedText style={[styles.stateText, { color: theme.textSecondary }]}>
            Enter a flight number above to see real-time status, departure and arrival info. 🛫🛬
          </ThemedText>
        </View>
      ) : null}

      {flights.length > 0 ? (
        <View style={styles.resultsSection}>
          <View style={styles.resultsSectionHeader}>
            <Feather name="check-circle" size={18} color={theme.accent} />
            <ThemedText type="h4" style={{ color: theme.text }}>
              {flights.length} {flights.length === 1 ? "Flight" : "Flights"} Found ✈️
            </ThemedText>
          </View>
          {flights.map((flight, index) => (
            <FlightCard key={`${flight.flight.iata}-${index}`} flight={flight} isDark={isDark} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  heroBanner: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    ...Shadows.card,
  },
  heroContent: {
    padding: Spacing["2xl"],
    paddingVertical: Spacing["3xl"],
  },
  heroIconRow: {
    marginBottom: Spacing.md,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(218,165,32,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: "CormorantGaramond_700Bold",
    color: "#FFFFFF",
    marginBottom: Spacing.sm,
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    lineHeight: 20,
  },
  searchSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
    gap: Spacing.md,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    height: Spacing.inputHeight,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    height: "100%",
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.lg,
    ...Shadows.card,
  },
  searchButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
  stateContainer: {
    alignItems: "center",
    paddingHorizontal: Spacing["3xl"],
    paddingVertical: Spacing["4xl"],
    gap: Spacing.md,
  },
  stateText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
  },
  resultsSection: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  resultsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  flightCard: {
    borderRadius: BorderRadius.lg,
    ...Shadows.card,
    overflow: "hidden",
  },
  flightCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  flightIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  flightEmoji: {
    fontSize: 28,
  },
  flightNumber: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  flightHeaderRight: {
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  flightDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  statusEmoji: {
    fontSize: 12,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  routeSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  routePoint: {
    alignItems: "center",
    gap: 2,
  },
  routeIata: {
    fontSize: 22,
    fontFamily: "CormorantGaramond_700Bold",
    letterSpacing: 1,
  },
  routeTime: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  routeLine: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  routeDash: {
    flex: 1,
    height: 1.5,
  },
  routePlaneEmoji: {
    fontSize: 16,
  },
  progressContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotEmoji: {
    fontSize: 14,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "visible",
    position: "relative",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  planeIndicator: {
    position: "absolute",
    top: -12,
    marginLeft: -10,
  },
  planeEmoji: {
    fontSize: 18,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  endpointCards: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  endpointCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  endpointHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  endpointEmoji: {
    fontSize: 18,
  },
  endpointLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.85)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  endpointAirport: {
    marginBottom: Spacing.md,
  },
  endpointIata: {
    fontSize: 32,
    fontFamily: "CormorantGaramond_700Bold",
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  endpointAirportName: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  endpointTimesRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  endpointTimeBlock: {
    gap: 2,
  },
  endpointTimeLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  endpointTime: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  endpointDetailsRow: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  endpointDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  endpointDetailText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.75)",
  },
});
