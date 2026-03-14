import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ImageBackground,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useAudioRecorder, AudioModule, RecordingPresets } from "expo-audio";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { formatPrice } from "@/lib/currency";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TripSuggestion {
  type: string;
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  price: number | null;
  currency: string;
  location: string;
  matchReason: string;
}

interface AnalysisResult {
  transcript: string;
  keywords: {
    destinations: string[];
    activities: string[];
    interests: string[];
    budget: string | null;
    travelType: string | null;
  };
  suggestions: TripSuggestion[];
  matchCount: number;
}

function SuggestionCard({ suggestion }: { suggestion: TripSuggestion }) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const typeIcons: Record<string, string> = {
    deal: "zap",
    bundle: "package",
    accommodation: "home",
    safari: "compass",
    restaurant: "coffee",
    companion: "users",
  };

  const typeColors: Record<string, string> = {
    deal: "#FF3B30",
    bundle: "#34C759",
    accommodation: "#1A4D2E",
    safari: "#E67E22",
    restaurant: "#9B59B6",
    companion: "#3498DB",
  };

  return (
    <AnimatedPressable
      style={[styles.suggestionCard, animatedStyle, { backgroundColor: theme.backgroundDefault }]}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
      testID={`suggestion-${suggestion.type}-${suggestion.id}`}
    >
      {suggestion.imageUrl ? (
        <ImageBackground
          source={{ uri: suggestion.imageUrl }}
          style={styles.suggestionImage}
          imageStyle={{ borderTopLeftRadius: BorderRadius.md, borderTopRightRadius: BorderRadius.md }}
        >
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.5)"]}
            style={styles.suggestionImageGradient}
          >
            <View style={[styles.typeBadge, { backgroundColor: typeColors[suggestion.type] || theme.primary }]}>
              <Feather name={typeIcons[suggestion.type] as any || "tag"} size={10} color="#FFF" />
              <ThemedText style={styles.typeBadgeText}>
                {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}
              </ThemedText>
            </View>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <View style={[styles.suggestionImagePlaceholder, { backgroundColor: typeColors[suggestion.type] || theme.primary }]}>
          <Feather name={typeIcons[suggestion.type] as any || "tag"} size={24} color="#FFF" />
          <View style={[styles.typeBadge, { backgroundColor: "rgba(0,0,0,0.3)" }]}>
            <ThemedText style={styles.typeBadgeText}>
              {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}
            </ThemedText>
          </View>
        </View>
      )}

      <View style={styles.suggestionContent}>
        <ThemedText style={styles.suggestionName} numberOfLines={1}>{suggestion.name}</ThemedText>
        <ThemedText style={[styles.suggestionDesc, { color: theme.textSecondary }]} numberOfLines={1}>
          {suggestion.description}
        </ThemedText>
        <View style={styles.suggestionFooter}>
          <View style={styles.locationChip}>
            <Feather name="map-pin" size={10} color={theme.textSecondary} />
            <ThemedText style={[styles.locationChipText, { color: theme.textSecondary }]} numberOfLines={1}>
              {suggestion.location}
            </ThemedText>
          </View>
          {suggestion.price ? (
            <ThemedText style={[styles.suggestionPrice, { color: theme.accent }]}>
              {formatPrice(suggestion.price, suggestion.currency)}
            </ThemedText>
          ) : null}
        </View>
        <View style={[styles.matchReasonContainer, { backgroundColor: `${theme.accent}10` }]}>
          <Feather name="check-circle" size={10} color={theme.accent} />
          <ThemedText style={[styles.matchReasonText, { color: theme.accent }]} numberOfLines={1}>
            {suggestion.matchReason}
          </ThemedText>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function TripListenerScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"mic" | "text">("mic");

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const pulseScale = useSharedValue(1);
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0);

  useEffect(() => {
    if (isListening) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      ring1Scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(2.5, { duration: 1500, easing: Easing.out(Easing.ease) })
        ),
        -1,
        false
      );
      ring1Opacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 0 }),
          withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) })
        ),
        -1,
        false
      );
      ring2Scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(2.5, { duration: 1500, easing: Easing.out(Easing.ease) })
        ),
        -1,
        false
      );
      ring2Opacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 500 }),
          withTiming(0.3, { duration: 0 }),
          withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(ring1Scale);
      cancelAnimation(ring1Opacity);
      cancelAnimation(ring2Scale);
      cancelAnimation(ring2Opacity);
      pulseScale.value = withSpring(1);
      ring1Opacity.value = withTiming(0);
      ring2Opacity.value = withTiming(0);
    }
  }, [isListening]);

  const micButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setResult(null);

      if (Platform.OS === "web") {
        setMode("text");
        setError("Microphone is best experienced in Expo Go on your phone. Use text input on web.");
        return;
      }

      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        setError("Microphone permission is required. Please enable it in settings.");
        return;
      }

      audioRecorder.record();
      setIsListening(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Could not start recording. Try text input instead.");
      setMode("text");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      setIsListening(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (!uri) {
        setError("No audio was recorded");
        return;
      }

      setIsAnalyzing(true);

      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = async () => {
        try {
          const base64 = (reader.result as string).split(",")[1];

          const apiResponse = await apiRequest("POST", "/api/trip-listener/analyze-audio", {
            audio: base64,
          });

          const data: AnalysisResult = await apiResponse.json();
          setResult(data);
          if (data.suggestions.length > 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } catch (err) {
          console.error("Error analyzing audio:", err);
          setError("Could not analyze the recording. Please try again.");
        } finally {
          setIsAnalyzing(false);
        }
      };

      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Error stopping recording:", err);
      setIsAnalyzing(false);
      setError("Error processing recording");
    }
  }, []);

  const analyzeText = useCallback(async () => {
    if (!textInput.trim()) return;

    try {
      setError(null);
      setResult(null);
      setIsAnalyzing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const response = await apiRequest("POST", "/api/trip-listener/analyze-text", {
        text: textInput.trim(),
      });

      const data: AnalysisResult = await response.json();
      setResult(data);
      if (data.suggestions.length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error("Error analyzing text:", err);
      setError("Could not analyze the text. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [textInput]);

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
              <View style={styles.heroMicIcon}>
                <Feather name="mic" size={22} color="#DAA520" />
              </View>
            </View>
            <ThemedText style={styles.heroTitle}>Trip Listener</ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              {mode === "mic"
                ? "Tap the microphone and start talking about your dream trip. We will find matching deals and experiences for you."
                : "Describe your ideal trip and we will suggest the best deals and experiences."}
            </ThemedText>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.modeToggle}>
        <Pressable
          style={[styles.modeButton, mode === "mic" ? { backgroundColor: theme.primary } : { backgroundColor: theme.backgroundSecondary }]}
          onPress={() => { setMode("mic"); setError(null); }}
        >
          <Feather name="mic" size={16} color={mode === "mic" ? "#FFF" : theme.text} />
          <ThemedText style={[styles.modeButtonText, mode === "mic" ? { color: "#FFF" } : {}]}>Voice</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.modeButton, mode === "text" ? { backgroundColor: theme.primary } : { backgroundColor: theme.backgroundSecondary }]}
          onPress={() => { setMode("text"); setError(null); }}
        >
          <Feather name="type" size={16} color={mode === "text" ? "#FFF" : theme.text} />
          <ThemedText style={[styles.modeButtonText, mode === "text" ? { color: "#FFF" } : {}]}>Text</ThemedText>
        </Pressable>
      </View>

      {mode === "mic" ? (
        <View style={styles.micSection}>
          <View style={styles.micContainer}>
            <Animated.View style={[styles.pulseRing, ring1Style, { borderColor: theme.accent }]} />
            <Animated.View style={[styles.pulseRing, ring2Style, { borderColor: theme.primary }]} />
            <AnimatedPressable
              style={[
                styles.micButton,
                micButtonStyle,
                { backgroundColor: isListening ? "#FF3B30" : theme.primary },
              ]}
              onPress={isListening ? stopRecording : startRecording}
              testID="mic-button"
            >
              <Feather name={isListening ? "square" : "mic"} size={32} color="#FFF" />
            </AnimatedPressable>
          </View>
          <ThemedText style={[styles.micHint, { color: theme.textSecondary }]}>
            {isListening ? "Listening... Tap to stop" : "Tap to start listening"}
          </ThemedText>
        </View>
      ) : (
        <View style={styles.textSection}>
          <View style={[styles.textInputContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              placeholder="e.g. I want to go on a safari in Kenya with luxury accommodation and great food..."
              placeholderTextColor={theme.textSecondary}
              value={textInput}
              onChangeText={setTextInput}
              multiline
              numberOfLines={4}
              testID="text-input"
            />
          </View>
          <Pressable
            style={[styles.analyzeButton, { backgroundColor: theme.primary, opacity: textInput.trim() ? 1 : 0.5 }]}
            onPress={analyzeText}
            disabled={!textInput.trim() || isAnalyzing}
            testID="analyze-button"
          >
            <Feather name="search" size={18} color="#FFF" />
            <ThemedText style={styles.analyzeButtonText}>Find Matching Trips</ThemedText>
          </Pressable>
        </View>
      )}

      {isAnalyzing ? (
        <View style={styles.analyzingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <ThemedText style={[styles.analyzingText, { color: theme.textSecondary }]}>
            Analyzing your conversation with AI...
          </ThemedText>
        </View>
      ) : null}

      {error ? (
        <View style={[styles.errorContainer, { backgroundColor: `${theme.error}15` }]}>
          <Feather name="alert-circle" size={16} color={theme.error} />
          <ThemedText style={[styles.errorText, { color: theme.error }]}>{error}</ThemedText>
        </View>
      ) : null}

      {result ? (
        <View style={styles.resultsSection}>
          {result.transcript ? (
            <View style={[styles.transcriptCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.transcriptHeader}>
                <Feather name="message-circle" size={14} color={theme.accent} />
                <ThemedText style={[styles.transcriptLabel, { color: theme.accent }]}>What we heard</ThemedText>
              </View>
              <ThemedText style={[styles.transcriptText, { color: theme.textSecondary }]}>
                "{result.transcript}"
              </ThemedText>
            </View>
          ) : null}

          {result.keywords.destinations.length > 0 || result.keywords.activities.length > 0 || result.keywords.interests.length > 0 ? (
            <View style={[styles.keywordsCard, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText style={styles.keywordsTitle}>Detected Interests</ThemedText>
              <View style={styles.keywordsGrid}>
                {result.keywords.destinations.map((d, i) => (
                  <View key={`dest-${i}`} style={[styles.keywordChip, { backgroundColor: `${theme.primary}15` }]}>
                    <Feather name="map-pin" size={10} color={theme.primary} />
                    <ThemedText style={[styles.keywordText, { color: theme.primary }]}>{d}</ThemedText>
                  </View>
                ))}
                {result.keywords.activities.map((a, i) => (
                  <View key={`act-${i}`} style={[styles.keywordChip, { backgroundColor: `${theme.accent}15` }]}>
                    <Feather name="compass" size={10} color={theme.accent} />
                    <ThemedText style={[styles.keywordText, { color: theme.accent }]}>{a}</ThemedText>
                  </View>
                ))}
                {result.keywords.interests.map((int, i) => (
                  <View key={`int-${i}`} style={[styles.keywordChip, { backgroundColor: `#E67E2215` }]}>
                    <Feather name="heart" size={10} color="#E67E22" />
                    <ThemedText style={[styles.keywordText, { color: "#E67E22" }]}>{int}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {result.suggestions.length > 0 ? (
            <View style={styles.suggestionsSection}>
              <View style={styles.suggestionsSectionHeader}>
                <Feather name="star" size={18} color={theme.accent} />
                <ThemedText style={styles.suggestionsTitle}>
                  {result.matchCount} {result.matchCount === 1 ? "Match" : "Matches"} Found
                </ThemedText>
              </View>
              {result.suggestions.map((suggestion) => (
                <SuggestionCard key={`${suggestion.type}-${suggestion.id}`} suggestion={suggestion} />
              ))}
            </View>
          ) : (
            <View style={[styles.noMatchCard, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="search" size={32} color={theme.textSecondary} />
              <ThemedText style={[styles.noMatchText, { color: theme.textSecondary }]}>
                No matching trips found for this conversation. Try mentioning specific destinations like Kenya, Tanzania, Bali, or Cape Town.
              </ThemedText>
            </View>
          )}
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
  heroMicIcon: {
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
  modeToggle: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
    gap: Spacing.sm,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  modeButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  micSection: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  micContainer: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.card,
  },
  micHint: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: Spacing.lg,
  },
  textSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
    gap: Spacing.md,
  },
  textInputContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    minHeight: 120,
  },
  textInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    textAlignVertical: "top",
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.card,
  },
  analyzeButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
  analyzingContainer: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    gap: Spacing.md,
  },
  analyzingText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  resultsSection: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  transcriptCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  transcriptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  transcriptLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  transcriptText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    lineHeight: 20,
  },
  keywordsCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  keywordsTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: Spacing.md,
  },
  keywordsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  keywordChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  keywordText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  suggestionsSection: {
    gap: Spacing.md,
  },
  suggestionsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  suggestionsTitle: {
    fontSize: 18,
    fontFamily: "CormorantGaramond_700Bold",
  },
  suggestionCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    ...Shadows.card,
  },
  suggestionImage: {
    height: 120,
  },
  suggestionImageGradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: Spacing.sm,
  },
  suggestionImagePlaceholder: {
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
  suggestionContent: {
    padding: Spacing.md,
    gap: 4,
  },
  suggestionName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  suggestionDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  suggestionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flex: 1,
  },
  locationChipText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  suggestionPrice: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  matchReasonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginTop: 4,
  },
  matchReasonText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  noMatchCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing["3xl"],
    alignItems: "center",
    gap: Spacing.md,
  },
  noMatchText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 20,
  },
});
