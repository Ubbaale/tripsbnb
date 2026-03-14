import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Text,
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
import { useQuery, useMutation } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

const { width } = Dimensions.get("window");
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TOP_CURRENCIES = ["USD", "EUR", "GBP", "KES", "ZAR", "JPY", "AUD", "INR", "THB", "MXN"];

interface PackingItem {
  name: string;
  essential: boolean;
  category: string;
}

interface PackingCategory {
  category: string;
  items: PackingItem[];
}

interface PackingListData {
  categories: PackingCategory[];
  proTips: string[];
}

interface EmergencyData {
  emergencyNumbers: {
    police: string;
    ambulance: string;
    fire: string;
  };
  phrases: Array<{
    english: string;
    local: string;
    pronunciation: string;
  }>;
  visaInfo: string;
  plugType: string;
  voltage: string;
  waterSafety: string;
  timezone: string;
}

function CurrencyChip({
  code,
  isSelected,
  onPress,
  theme,
}: {
  code: string;
  isSelected: boolean;
  onPress: () => void;
  theme: any;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[
        styles.currencyChip,
        animatedStyle,
        {
          backgroundColor: isSelected ? "#1A4D2E" : theme.backgroundSecondary,
          borderColor: isSelected ? "#1A4D2E" : theme.border,
        },
      ]}
      onPressIn={() => {
        scale.value = withSpring(0.93, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      testID={`chip-currency-${code}`}
    >
      <Text
        style={[
          styles.currencyChipText,
          { color: isSelected ? "#FFFFFF" : theme.text },
        ]}
      >
        {code}
      </Text>
    </AnimatedPressable>
  );
}

function PackingItemRow({
  item,
  checked,
  onToggle,
  theme,
}: {
  item: PackingItem;
  checked: boolean;
  onToggle: () => void;
  theme: any;
}) {
  return (
    <Pressable
      style={styles.packingItemRow}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
      testID={`packing-item-${item.name}`}
    >
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: checked ? "#1A4D2E" : "transparent",
            borderColor: checked ? "#1A4D2E" : theme.border,
          },
        ]}
      >
        {checked ? <Feather name="check" size={12} color="#FFFFFF" /> : null}
      </View>
      <ThemedText
        style={[
          styles.packingItemText,
          checked ? { textDecorationLine: "line-through", opacity: 0.5 } : null,
        ]}
      >
        {item.name}
      </ThemedText>
      {item.essential ? (
        <View style={styles.essentialBadge}>
          <Text style={styles.essentialBadgeText}>Essential</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function TravelToolkitScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [destination, setDestination] = useState("");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("KES");
  const [fromAmount, setFromAmount] = useState("100");
  const [convertedResult, setConvertedResult] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [selectingCurrency, setSelectingCurrency] = useState<"from" | "to" | null>(null);

  const { data: ratesData } = useQuery<{ rates: Record<string, number> }>({
    queryKey: ["/api/travel-toolkit/exchange-rates"],
  });

  const packingMutation = useMutation({
    mutationFn: async (data: { destination: string; duration?: string; activities?: string; season?: string }) => {
      const response = await apiRequest("POST", "/api/travel-toolkit/packing-list", data);
      return response.json();
    },
  });

  const emergencyMutation = useMutation({
    mutationFn: async (data: { destination: string; country?: string }) => {
      const response = await apiRequest("POST", "/api/travel-toolkit/emergency-info", data);
      return response.json();
    },
  });

  const handleExplore = useCallback(() => {
    if (!destination.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCheckedItems({});
    packingMutation.mutate({ destination: destination.trim() });
    emergencyMutation.mutate({ destination: destination.trim() });
  }, [destination]);

  const handleConvert = useCallback(() => {
    if (!ratesData?.rates) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const amount = parseFloat(fromAmount);
    if (isNaN(amount) || amount <= 0) return;

    const fromRate = ratesData.rates[fromCurrency];
    const toRate = ratesData.rates[toCurrency];
    if (!fromRate || !toRate) {
      setConvertedResult("Currency not found");
      return;
    }

    const result = (amount / fromRate) * toRate;
    setConvertedResult(result.toFixed(2));
  }, [ratesData, fromAmount, fromCurrency, toCurrency]);

  const toggleItem = useCallback((itemName: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemName]: !prev[itemName],
    }));
  }, []);

  const handleCurrencySelect = useCallback(
    (code: string) => {
      if (selectingCurrency === "from") {
        setFromCurrency(code);
      } else if (selectingCurrency === "to") {
        setToCurrency(code);
      }
      setSelectingCurrency(null);
      setConvertedResult(null);
    },
    [selectingCurrency]
  );

  const rawPackingData = packingMutation.data as any;
  const packingData: PackingListData | undefined = rawPackingData?.categories
    ? {
        categories: rawPackingData.categories.map((cat: any) => ({
          name: cat.name || "",
          icon: cat.icon || "box",
          items: (cat.items || []).map((item: any) => ({
            name: item.item || item.name || "",
            essential: item.essential || false,
            tip: item.tip || "",
          })),
        })),
        proTips: rawPackingData.proTips || [],
      }
    : undefined;
  const rawEmergencyData = emergencyMutation.data as any;
  const emergencyData: EmergencyData | undefined = rawEmergencyData
    ? {
        emergencyNumbers: rawEmergencyData.emergencyNumbers || { police: "N/A", ambulance: "N/A", fire: "N/A" },
        phrases: rawEmergencyData.usefulPhrases || rawEmergencyData.phrases || [],
        visaInfo: rawEmergencyData.visaInfo || "",
        plugType: rawEmergencyData.plugType || "",
        voltage: rawEmergencyData.voltage || "",
        waterSafety: rawEmergencyData.waterSafety || "",
        timezone: rawEmergencyData.timezone || "",
      }
    : undefined;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: Spacing.md,
        paddingBottom: insets.bottom + Spacing.xl,
      }}
      showsVerticalScrollIndicator={false}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={styles.heroSection}>
        <LinearGradient
          colors={isDark ? ["#1A4D2E", "#0D2617"] : ["#1A4D2E", "#2D6A4F"]}
          style={styles.heroBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroIconWrap}>
              <Feather name="briefcase" size={28} color="#DAA520" />
            </View>
            <ThemedText type="h1" style={styles.heroTitle}>
              Travel Toolkit
            </ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              Everything you need for an unforgettable trip
            </ThemedText>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="map-pin" size={18} color={theme.accent} />
          <ThemedText type="h3" style={styles.sectionTitle}>
            Destination
          </ThemedText>
        </View>
        <View
          style={[
            styles.destinationRow,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <Feather name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.destinationInput, { color: theme.text }]}
            placeholder="Where are you going?"
            placeholderTextColor={theme.textSecondary}
            value={destination}
            onChangeText={setDestination}
            returnKeyType="search"
            onSubmitEditing={handleExplore}
            testID="input-destination"
          />
          <Pressable
            style={[
              styles.exploreButton,
              { opacity: destination.trim().length > 0 ? 1 : 0.5 },
            ]}
            onPress={handleExplore}
            disabled={!destination.trim()}
            testID="button-explore"
          >
            <LinearGradient
              colors={["#1A4D2E", "#2D6A4F"]}
              style={styles.exploreButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Feather name="compass" size={16} color="#FFFFFF" />
              <Text style={styles.exploreButtonText}>Explore</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="dollar-sign" size={18} color={theme.accent} />
          <ThemedText type="h3" style={styles.sectionTitle}>
            Currency Converter
          </ThemedText>
        </View>

        <View style={[styles.converterCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.currencyRow}>
            <ThemedText type="caption" style={styles.currencyLabel}>
              From
            </ThemedText>
            <View style={styles.currencyInputRow}>
              <Pressable
                style={[styles.currencyCodeButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectingCurrency(selectingCurrency === "from" ? null : "from");
                }}
                testID="button-from-currency"
              >
                <Text style={[styles.currencyCodeText, { color: theme.text }]}>
                  {fromCurrency}
                </Text>
                <Feather name="chevron-down" size={14} color={theme.textSecondary} />
              </Pressable>
              <TextInput
                style={[
                  styles.amountInput,
                  { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border },
                ]}
                value={fromAmount}
                onChangeText={(text) => {
                  setFromAmount(text);
                  setConvertedResult(null);
                }}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.textSecondary}
                testID="input-from-amount"
              />
            </View>
          </View>

          <View style={styles.swapRow}>
            <Pressable
              style={[styles.swapButton, { backgroundColor: theme.backgroundSecondary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFromCurrency(toCurrency);
                setToCurrency(fromCurrency);
                setConvertedResult(null);
              }}
              testID="button-swap-currency"
            >
              <Feather name="repeat" size={16} color={theme.accent} />
            </Pressable>
          </View>

          <View style={styles.currencyRow}>
            <ThemedText type="caption" style={styles.currencyLabel}>
              To
            </ThemedText>
            <View style={styles.currencyInputRow}>
              <Pressable
                style={[styles.currencyCodeButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectingCurrency(selectingCurrency === "to" ? null : "to");
                }}
                testID="button-to-currency"
              >
                <Text style={[styles.currencyCodeText, { color: theme.text }]}>
                  {toCurrency}
                </Text>
                <Feather name="chevron-down" size={14} color={theme.textSecondary} />
              </Pressable>
              <View
                style={[
                  styles.resultDisplay,
                  { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                ]}
              >
                <Text
                  style={[
                    styles.resultText,
                    { color: convertedResult ? theme.accent : theme.textSecondary },
                  ]}
                >
                  {convertedResult ? convertedResult : "---"}
                </Text>
              </View>
            </View>
          </View>

          {selectingCurrency ? (
            <View style={styles.chipContainer}>
              <ThemedText type="caption" style={{ marginBottom: Spacing.sm }}>
                Select {selectingCurrency === "from" ? "source" : "target"} currency
              </ThemedText>
              <View style={styles.chipWrap}>
                {TOP_CURRENCIES.map((code) => (
                  <CurrencyChip
                    key={code}
                    code={code}
                    isSelected={
                      selectingCurrency === "from"
                        ? fromCurrency === code
                        : toCurrency === code
                    }
                    onPress={() => handleCurrencySelect(code)}
                    theme={theme}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <Pressable
            style={styles.convertButton}
            onPress={handleConvert}
            testID="button-convert"
          >
            <LinearGradient
              colors={["#DAA520", "#B8860B"]}
              style={styles.convertButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Feather name="refresh-cw" size={16} color="#FFFFFF" />
              <Text style={styles.convertButtonText}>Convert</Text>
            </LinearGradient>
          </Pressable>

          {convertedResult ? (
            <View style={styles.conversionResultCard}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Conversion Result
              </ThemedText>
              <ThemedText type="h2" style={{ color: theme.accent }}>
                {fromAmount} {fromCurrency} = {convertedResult} {toCurrency}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      {packingMutation.isPending ? (
        <View style={[styles.loadingCard, { backgroundColor: theme.backgroundDefault }]}>
          <ActivityIndicator size="large" color={theme.accent} />
          <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
            Generating your packing list...
          </ThemedText>
        </View>
      ) : packingMutation.isError ? (
        <View style={[styles.errorCard, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="alert-circle" size={24} color={theme.error} />
          <ThemedText style={[styles.errorText, { color: theme.error }]}>
            Failed to generate packing list. Please try again.
          </ThemedText>
        </View>
      ) : packingData ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="check-square" size={18} color={theme.accent} />
            <ThemedText type="h3" style={styles.sectionTitle}>
              Smart Packing List
            </ThemedText>
          </View>
          <View style={[styles.packingCard, { backgroundColor: theme.backgroundDefault }]}>
            {packingData.categories.map((cat) => (
              <View key={cat.category} style={styles.packingCategory}>
                <View style={styles.packingCategoryHeader}>
                  <Feather name="folder" size={14} color={theme.primary} />
                  <ThemedText type="label" style={styles.packingCategoryTitle}>
                    {cat.category}
                  </ThemedText>
                </View>
                {cat.items.map((item) => (
                  <PackingItemRow
                    key={item.name}
                    item={item}
                    checked={!!checkedItems[item.name]}
                    onToggle={() => toggleItem(item.name)}
                    theme={theme}
                  />
                ))}
              </View>
            ))}
            {packingData.proTips && packingData.proTips.length > 0 ? (
              <View style={styles.proTipsSection}>
                <View style={styles.proTipsHeader}>
                  <Feather name="zap" size={16} color="#DAA520" />
                  <ThemedText type="label" style={{ color: "#DAA520" }}>
                    Pro Tips
                  </ThemedText>
                </View>
                {packingData.proTips.map((tip, i) => (
                  <View key={i} style={styles.proTipRow}>
                    <Feather name="arrow-right" size={12} color={theme.textSecondary} />
                    <ThemedText type="small" style={{ flex: 1, marginLeft: Spacing.sm, color: theme.textSecondary }}>
                      {tip}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {emergencyMutation.isPending ? (
        <View style={[styles.loadingCard, { backgroundColor: theme.backgroundDefault }]}>
          <ActivityIndicator size="large" color={theme.accent} />
          <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
            Fetching emergency info...
          </ThemedText>
        </View>
      ) : emergencyMutation.isError ? (
        <View style={[styles.errorCard, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="alert-circle" size={24} color={theme.error} />
          <ThemedText style={[styles.errorText, { color: theme.error }]}>
            Failed to load emergency info. Please try again.
          </ThemedText>
        </View>
      ) : emergencyData ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="alert-triangle" size={18} color={theme.accent} />
            <ThemedText type="h3" style={styles.sectionTitle}>
              Emergency Info and Phrases
            </ThemedText>
          </View>

          <View style={[styles.emergencyCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.emergencyHeader}>
              <Feather name="phone" size={16} color={theme.error} />
              <ThemedText type="label" style={{ color: theme.error }}>
                Emergency Numbers
              </ThemedText>
            </View>
            <View style={styles.emergencyNumbersGrid}>
              <View style={[styles.emergencyNumberItem, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="shield" size={18} color="#3498DB" />
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Police
                </ThemedText>
                <ThemedText type="h4" style={{ color: theme.text }}>
                  {emergencyData.emergencyNumbers.police}
                </ThemedText>
              </View>
              <View style={[styles.emergencyNumberItem, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="heart" size={18} color="#E74C3C" />
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Ambulance
                </ThemedText>
                <ThemedText type="h4" style={{ color: theme.text }}>
                  {emergencyData.emergencyNumbers.ambulance}
                </ThemedText>
              </View>
              <View style={[styles.emergencyNumberItem, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="alert-triangle" size={18} color="#F39C12" />
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Fire
                </ThemedText>
                <ThemedText type="h4" style={{ color: theme.text }}>
                  {emergencyData.emergencyNumbers.fire}
                </ThemedText>
              </View>
            </View>
          </View>

          {emergencyData.phrases && emergencyData.phrases.length > 0 ? (
            <View style={[styles.phrasesCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.phrasesHeader}>
                <Feather name="message-circle" size={16} color={theme.primary} />
                <ThemedText type="label" style={{ color: theme.primary }}>
                  Useful Phrases
                </ThemedText>
              </View>
              {emergencyData.phrases.map((phrase, i) => (
                <View
                  key={i}
                  style={[
                    styles.phraseRow,
                    i < emergencyData.phrases.length - 1
                      ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }
                      : null,
                  ]}
                >
                  <ThemedText type="small" style={{ fontWeight: "600" }}>
                    {phrase.english}
                  </ThemedText>
                  <ThemedText type="body" style={{ color: theme.accent, marginTop: 2 }}>
                    {phrase.local}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, fontStyle: "italic", marginTop: 2 }}>
                    {phrase.pronunciation}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}

          <View style={[styles.travelInfoCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.travelInfoHeader}>
              <Feather name="info" size={16} color={theme.primary} />
              <ThemedText type="label" style={{ color: theme.primary }}>
                Travel Info
              </ThemedText>
            </View>
            <View style={styles.travelInfoGrid}>
              <View style={[styles.travelInfoItem, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="file-text" size={16} color={theme.accent} />
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Visa
                </ThemedText>
                <ThemedText type="small" numberOfLines={2} style={{ textAlign: "center" }}>
                  {emergencyData.visaInfo}
                </ThemedText>
              </View>
              <View style={[styles.travelInfoItem, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="zap" size={16} color={theme.accent} />
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Plug / Voltage
                </ThemedText>
                <ThemedText type="small" numberOfLines={2} style={{ textAlign: "center" }}>
                  {emergencyData.plugType} / {emergencyData.voltage}
                </ThemedText>
              </View>
              <View style={[styles.travelInfoItem, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="droplet" size={16} color={theme.accent} />
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Water Safety
                </ThemedText>
                <ThemedText type="small" numberOfLines={2} style={{ textAlign: "center" }}>
                  {emergencyData.waterSafety}
                </ThemedText>
              </View>
              <View style={[styles.travelInfoItem, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="clock" size={16} color={theme.accent} />
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Timezone
                </ThemedText>
                <ThemedText type="small" numberOfLines={2} style={{ textAlign: "center" }}>
                  {emergencyData.timezone}
                </ThemedText>
              </View>
            </View>
          </View>
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
    marginBottom: Spacing.xl,
  },
  heroBanner: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  heroContent: {
    padding: Spacing["2xl"],
    alignItems: "center",
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(218,165,32,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  heroTitle: {
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    flex: 1,
  },
  destinationRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingLeft: Spacing.md,
    gap: Spacing.sm,
    overflow: "hidden",
  },
  destinationInput: {
    flex: 1,
    height: Spacing.inputHeight,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  exploreButton: {
    overflow: "hidden",
    borderRadius: BorderRadius.sm,
    margin: Spacing.xs,
  },
  exploreButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  exploreButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  converterCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  currencyRow: {
    marginBottom: Spacing.sm,
  },
  currencyLabel: {
    marginBottom: Spacing.xs,
  },
  currencyInputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  currencyCodeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.xs,
    minWidth: 80,
    justifyContent: "center",
  },
  currencyCodeText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  amountInput: {
    flex: 1,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    height: 44,
  },
  swapRow: {
    alignItems: "center",
    marginVertical: Spacing.xs,
  },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  resultDisplay: {
    flex: 1,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    justifyContent: "center",
    height: 44,
  },
  resultText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  chipContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  currencyChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  currencyChipText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  convertButton: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  convertButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  convertButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  conversionResultCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(218,165,32,0.08)",
    alignItems: "center",
    gap: Spacing.xs,
  },
  loadingCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    gap: Spacing.md,
    ...Shadows.card,
  },
  loadingText: {
    textAlign: "center",
  },
  errorCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    ...Shadows.card,
  },
  errorText: {
    flex: 1,
  },
  packingCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  packingCategory: {
    marginBottom: Spacing.lg,
  },
  packingCategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  packingCategoryTitle: {
    flex: 1,
  },
  packingItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  packingItemText: {
    flex: 1,
    fontSize: 14,
  },
  essentialBadge: {
    backgroundColor: "rgba(218,165,32,0.15)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  essentialBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#DAA520",
    fontFamily: "Inter_600SemiBold",
  },
  proTipsSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.08)",
  },
  proTipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  proTipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: Spacing.xs,
  },
  emergencyCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  emergencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  emergencyNumbersGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  emergencyNumberItem: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  phrasesCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  phrasesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  phraseRow: {
    paddingVertical: Spacing.md,
  },
  travelInfoCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  travelInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  travelInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  travelInfoItem: {
    width: (width - Spacing.lg * 2 - Spacing.lg * 2 - Spacing.sm) / 2,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
});
