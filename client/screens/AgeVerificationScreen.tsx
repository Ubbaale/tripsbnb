import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  TextInput,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";

const MINIMUM_AGE = 20;
const AGE_VERIFIED_KEY = "@tripverse_age_verified";
const AGE_BLOCKED_KEY = "@tripverse_age_blocked";

export async function checkAgeVerification(): Promise<"verified" | "blocked" | "pending"> {
  try {
    const blocked = await AsyncStorage.getItem(AGE_BLOCKED_KEY);
    if (blocked === "true") return "blocked";
    const verified = await AsyncStorage.getItem(AGE_VERIFIED_KEY);
    if (verified === "true") return "verified";
    return "pending";
  } catch {
    return "pending";
  }
}

function calculateAge(day: number, month: number, year: number): number {
  const today = new Date();
  const birthDate = new Date(year, month - 1, day);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function isValidDate(day: number, month: number, year: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > new Date().getFullYear()) return false;
  const date = new Date(year, month - 1, day);
  return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
}

interface AgeVerificationScreenProps {
  onVerified: () => void;
  onBlocked: () => void;
}

export function AgeVerificationScreen({ onVerified, onBlocked }: AgeVerificationScreenProps) {
  const insets = useSafeAreaInsets();
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState("");

  const handleVerify = async () => {
    const d = parseInt(day);
    const m = parseInt(month);
    const y = parseInt(year);

    if (!d || !m || !y || !isValidDate(d, m, y)) {
      setError("Please enter a valid date of birth");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const age = calculateAge(d, m, y);

    if (age >= MINIMUM_AGE) {
      await AsyncStorage.setItem(AGE_VERIFIED_KEY, "true");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onVerified();
    } else {
      await AsyncStorage.setItem(AGE_BLOCKED_KEY, "true");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      onBlocked();
    }
  };

  const canSubmit = day.length > 0 && month.length > 0 && year.length === 4;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={["#1A4D2E", "#0F2D1A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <ThemedText type="h1" style={styles.title}>
          Age Verification
        </ThemedText>

        <ThemedText type="body" style={styles.subtitle}>
          Tripsbnb is only available to users who are {MINIMUM_AGE} years of age or older. Please enter your date of birth to continue.
        </ThemedText>

        <View style={styles.dateInputRow}>
          <View style={styles.dateField}>
            <ThemedText type="caption" style={styles.fieldLabel}>Day</ThemedText>
            <TextInput
              style={styles.dateInput}
              value={day}
              onChangeText={(text) => {
                setError("");
                setDay(text.replace(/[^0-9]/g, "").slice(0, 2));
              }}
              placeholder="DD"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="number-pad"
              maxLength={2}
              testID="input-day"
            />
          </View>
          <View style={styles.dateSeparator}>
            <ThemedText type="h2" style={{ color: "rgba(255,255,255,0.4)" }}>/</ThemedText>
          </View>
          <View style={styles.dateField}>
            <ThemedText type="caption" style={styles.fieldLabel}>Month</ThemedText>
            <TextInput
              style={styles.dateInput}
              value={month}
              onChangeText={(text) => {
                setError("");
                setMonth(text.replace(/[^0-9]/g, "").slice(0, 2));
              }}
              placeholder="MM"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="number-pad"
              maxLength={2}
              testID="input-month"
            />
          </View>
          <View style={styles.dateSeparator}>
            <ThemedText type="h2" style={{ color: "rgba(255,255,255,0.4)" }}>/</ThemedText>
          </View>
          <View style={styles.dateFieldLarge}>
            <ThemedText type="caption" style={styles.fieldLabel}>Year</ThemedText>
            <TextInput
              style={styles.dateInput}
              value={year}
              onChangeText={(text) => {
                setError("");
                setYear(text.replace(/[^0-9]/g, "").slice(0, 4));
              }}
              placeholder="YYYY"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="number-pad"
              maxLength={4}
              testID="input-year"
            />
          </View>
        </View>

        {error.length > 0 ? (
          <View style={styles.errorContainer}>
            <Feather name="alert-circle" size={14} color="#FF6B6B" />
            <ThemedText type="small" style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : null}

        <Pressable
          onPress={handleVerify}
          disabled={!canSubmit}
          style={[
            styles.verifyButton,
            !canSubmit ? styles.verifyButtonDisabled : null,
          ]}
          accessibilityState={{ disabled: !canSubmit }}
          testID="button-verify-age"
        >
          <ThemedText type="label" style={styles.verifyButtonText}>
            Verify My Age
          </ThemedText>
          <Feather name="arrow-right" size={18} color="#1A4D2E" />
        </Pressable>

        <ThemedText type="caption" style={styles.legalNote}>
          By proceeding, you confirm that the date of birth you provided is accurate. Providing false information is a violation of our Terms of Service.
        </ThemedText>
      </View>
    </View>
  );
}

export function AgeBlockedScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={["#2C1810", "#1A0E08"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: "rgba(255,59,48,0.2)" }]}>
          <Feather name="x-circle" size={48} color="#FF3B30" />
        </View>

        <ThemedText type="h1" style={styles.title}>
          Access Restricted
        </ThemedText>

        <ThemedText type="body" style={styles.subtitle}>
          Tripsbnb is only available to users who are {MINIMUM_AGE} years of age or older. Based on the date of birth you provided, you do not meet the minimum age requirement.
        </ThemedText>

        <View style={styles.blockedCard}>
          <Feather name="info" size={18} color="rgba(255,255,255,0.7)" />
          <ThemedText type="small" style={styles.blockedText}>
            This restriction is in place to comply with applicable laws and to ensure the safety of all users. This decision cannot be reversed.
          </ThemedText>
        </View>

        <View style={styles.blockedCard}>
          <Feather name="mail" size={18} color="rgba(255,255,255,0.7)" />
          <ThemedText type="small" style={styles.blockedText}>
            If you believe this is an error, please contact support at support@tripverse.com
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: Spacing["2xl"],
    alignItems: "center",
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: Spacing.xl,
  },
  logoImage: {
    width: 96,
    height: 96,
    borderRadius: 20,
  },
  title: {
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  subtitle: {
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: Spacing["2xl"],
  },
  dateInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    width: "100%",
    justifyContent: "center",
  },
  dateField: {
    flex: 1,
    maxWidth: 80,
  },
  dateFieldLarge: {
    flex: 1.5,
    maxWidth: 110,
  },
  fieldLabel: {
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginBottom: 6,
  },
  dateInput: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  dateSeparator: {
    paddingBottom: Spacing.sm,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: Spacing.lg,
  },
  errorText: {
    color: "#FF6B6B",
  },
  verifyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: "#DAA520",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["3xl"],
    borderRadius: BorderRadius.full,
    width: "100%",
    marginBottom: Spacing.xl,
  },
  verifyButtonDisabled: {
    opacity: 0.4,
    backgroundColor: "rgba(218,165,32,0.5)",
  },
  verifyButtonText: {
    color: "#1A4D2E",
    fontSize: 16,
  },
  legalNote: {
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    lineHeight: 18,
  },
  blockedCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    width: "100%",
    marginBottom: Spacing.md,
  },
  blockedText: {
    color: "rgba(255,255,255,0.65)",
    flex: 1,
    lineHeight: 20,
  },
});
