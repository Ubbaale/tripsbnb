import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Linking,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { getApiUrl } from "@/lib/query-client";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SAFETY_TIPS = [
  {
    icon: "map-pin" as const,
    title: "Meet in Public Places",
    description: "Always meet companions in well-lit, public locations. Avoid isolated areas, especially for first meetings.",
  },
  {
    icon: "users" as const,
    title: "Tell Someone Your Plans",
    description: "Share your meeting details, location, and expected return time with a trusted friend or family member.",
  },
  {
    icon: "smartphone" as const,
    title: "Keep Your Phone Charged",
    description: "Ensure your phone is fully charged before meetings. Have emergency contacts easily accessible.",
  },
  {
    icon: "shield" as const,
    title: "Trust Your Instincts",
    description: "If something feels wrong, leave immediately. Your safety is more important than being polite.",
  },
  {
    icon: "dollar-sign" as const,
    title: "Use In-App Payments Only",
    description: "Never send money outside the platform. All transactions should go through Tripsbnb for your protection.",
  },
  {
    icon: "camera" as const,
    title: "Verify Identity",
    description: "Look for verified badges on profiles. Consider a video call before meeting in person.",
  },
  {
    icon: "alert-circle" as const,
    title: "Report Suspicious Behavior",
    description: "Report any inappropriate behavior, scams, or safety concerns immediately through the app.",
  },
  {
    icon: "lock" as const,
    title: "Protect Personal Information",
    description: "Never share your hotel room number, home address, passport details, or financial information with companions.",
  },
];

const EMERGENCY_CONTACTS = [
  { label: "Local Emergency", number: "112", icon: "phone" as const, color: "#FF3B30" },
  { label: "Police", number: "911", icon: "shield" as const, color: "#007AFF" },
  { label: "Medical Emergency", number: "911", icon: "heart" as const, color: "#34C759" },
];

function TipCard({ tip, index }: { tip: typeof SAFETY_TIPS[0]; index: number }) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.tipCard, { backgroundColor: theme.backgroundDefault }, Shadows.card, animatedStyle]}>
      <View style={[styles.tipIconContainer, { backgroundColor: theme.primary + "15" }]}>
        <Feather name={tip.icon} size={20} color={theme.primary} />
      </View>
      <View style={styles.tipContent}>
        <ThemedText type="label">{tip.title}</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
          {tip.description}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

export function SafetyCenterScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const handleEmergencyCall = async (number: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const telUrl = `tel:${number}`;
    try {
      const canOpen = await Linking.canOpenURL(telUrl);
      if (canOpen) {
        await Linking.openURL(telUrl);
      } else {
        setCallNumber(number);
        setShowCallModal(true);
      }
    } catch {
      setCallNumber(number);
      setShowCallModal(true);
    }
  };

  const [showCallModal, setShowCallModal] = useState(false);
  const [callNumber, setCallNumber] = useState("");

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportLocation, setReportLocation] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const REPORT_CATEGORIES = [
    { key: "inappropriate_behavior", label: "Inappropriate Behavior", icon: "alert-circle" as const },
    { key: "scam_fraud", label: "Scam or Fraud", icon: "alert-octagon" as const },
    { key: "safety_threat", label: "Safety Threat", icon: "shield-off" as const },
    { key: "harassment", label: "Harassment", icon: "user-x" as const },
    { key: "property_damage", label: "Property Damage", icon: "home" as const },
    { key: "other", label: "Other Concern", icon: "more-horizontal" as const },
  ];

  const handleSubmitReport = async () => {
    if (!reportCategory || !reportDescription.trim()) return;
    setReportSubmitting(true);
    try {
      const deviceId = await AsyncStorage.getItem("@tripverse_device_id");
      const baseUrl = getApiUrl();
      const res = await fetch(new URL("/api/safety-reports", baseUrl).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: deviceId || "anonymous",
          category: reportCategory,
          description: reportDescription.trim(),
          location: reportLocation.trim() || null,
        }),
      });
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setReportSubmitted(true);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setReportSubmitting(false);
    }
  };

  const resetReportModal = () => {
    setShowReportModal(false);
    setReportCategory("");
    setReportDescription("");
    setReportLocation("");
    setReportSubmitted(false);
  };

  return (
    <>
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: Spacing.lg,
        paddingBottom: insets.bottom + Spacing["3xl"],
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroSection}>
        <LinearGradient
          colors={["#1A4D2E", "#2D6A4F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <Feather name="shield" size={40} color="#DAA520" />
          <ThemedText type="h1" style={styles.heroTitle}>
            Your Safety Matters
          </ThemedText>
          <ThemedText type="body" style={styles.heroSubtitle}>
            Tripsbnb is committed to providing a safe platform. Review our safety guidelines and know your rights.
          </ThemedText>
        </LinearGradient>
      </View>

      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>Emergency Contacts</ThemedText>
        <View style={styles.emergencyRow}>
          {EMERGENCY_CONTACTS.map((contact) => (
            <Pressable
              key={contact.label}
              onPress={() => handleEmergencyCall(contact.number)}
              style={[styles.emergencyCard, { backgroundColor: theme.backgroundDefault }, Shadows.card]}
              testID={`button-emergency-${contact.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <View style={[styles.emergencyIcon, { backgroundColor: contact.color + "20" }]}>
                <Feather name={contact.icon} size={22} color={contact.color} />
              </View>
              <ThemedText type="caption" style={{ textAlign: "center" }}>
                {contact.label}
              </ThemedText>
              <ThemedText type="label" style={{ color: contact.color }}>
                {contact.number}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>Safety Guidelines</ThemedText>
        <View style={styles.tipsContainer}>
          {SAFETY_TIPS.map((tip, index) => (
            <TipCard key={index} tip={tip} index={index} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>Legal & Liability</ThemedText>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowDisclaimer(!showDisclaimer);
          }}
          style={[styles.disclaimerToggle, { backgroundColor: theme.backgroundDefault }, Shadows.card]}
          testID="button-toggle-disclaimer"
        >
          <Feather name="file-text" size={20} color={theme.primary} />
          <ThemedText type="label" style={{ flex: 1 }}>
            Platform Liability Disclaimer
          </ThemedText>
          <Feather
            name={showDisclaimer ? "chevron-up" : "chevron-down"}
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>
        {showDisclaimer ? (
          <View style={[styles.disclaimerContent, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 22 }}>
              {`IMPORTANT LEGAL NOTICE\n\nTripsbnb operates solely as a technology platform that facilitates connections between travelers and local service providers ("Companions"). By using this service, you acknowledge and agree to the following:\n\n1. PLATFORM ROLE: Tripsbnb is an intermediary platform only. We do not employ, endorse, or guarantee any Companion listed on the platform. We do not control, supervise, or direct the actions of any user.\n\n2. USER RESPONSIBILITY: You are solely responsible for your decisions regarding whom you meet, where you meet, and all interactions that occur as a result of using this platform. You assume all risks associated with in-person meetings.\n\n3. NO LIABILITY: Tripsbnb, its officers, directors, employees, and affiliates shall not be held liable for any damages, injuries, losses, claims, or expenses arising from or related to any interactions between users, including but not limited to personal injury, property damage, emotional distress, or financial loss.\n\n4. NO WARRANTIES: We make no representations or warranties regarding the identity, background, character, or intentions of any user. Verification badges indicate only that certain identity documents were submitted, not that a user is safe or trustworthy.\n\n5. INDEMNIFICATION: You agree to indemnify and hold harmless Tripsbnb from any claims, damages, or expenses arising from your use of the platform or any interactions with other users.\n\n6. ASSUMPTION OF RISK: You voluntarily assume all risks of meeting other users in person. You acknowledge that Tripsbnb cannot guarantee your safety and that in-person meetings carry inherent risks.\n\n7. DISPUTE RESOLUTION: Any disputes between users must be resolved between those users directly. Tripsbnb is not a party to any agreement or arrangement between users.\n\n8. GOVERNING LAW: These terms are governed by applicable law in the jurisdiction where Tripsbnb is incorporated.\n\nBy continuing to use Tripsbnb, you confirm that you have read, understood, and agree to these terms.`}
            </ThemedText>
          </View>
        ) : null}

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={[styles.linkCard, { backgroundColor: theme.backgroundDefault }, Shadows.card]}
          testID="button-terms-of-service"
        >
          <Feather name="book" size={20} color={theme.primary} />
          <ThemedText type="label" style={{ flex: 1 }}>Terms of Service</ThemedText>
          <Feather name="external-link" size={16} color={theme.textSecondary} />
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={[styles.linkCard, { backgroundColor: theme.backgroundDefault }, Shadows.card]}
          testID="button-privacy-policy"
        >
          <Feather name="eye" size={20} color={theme.primary} />
          <ThemedText type="label" style={{ flex: 1 }}>Privacy Policy</ThemedText>
          <Feather name="external-link" size={16} color={theme.textSecondary} />
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={[styles.linkCard, { backgroundColor: theme.backgroundDefault }, Shadows.card]}
          testID="button-community-guidelines"
        >
          <Feather name="heart" size={20} color={theme.primary} />
          <ThemedText type="label" style={{ flex: 1 }}>Community Guidelines</ThemedText>
          <Feather name="external-link" size={16} color={theme.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>Report an Issue</ThemedText>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowReportModal(true);
          }}
          style={[styles.reportButton, { backgroundColor: theme.error }]}
          testID="button-report-issue"
        >
          <Feather name="alert-triangle" size={20} color="#FFFFFF" />
          <ThemedText type="label" style={{ color: "#FFFFFF" }}>
            Report Safety Concern
          </ThemedText>
        </Pressable>
        <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
          Reports are reviewed within 24 hours. For emergencies, contact local authorities immediately.
        </ThemedText>
      </View>
    </ScrollView>

      <Modal
        visible={showCallModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCallModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCallModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
            <View style={[styles.modalIconCircle, { backgroundColor: "#FF3B3020" }]}>
              <Feather name="phone" size={28} color="#FF3B30" />
            </View>
            <ThemedText type="h3" style={{ textAlign: "center" }}>
              Emergency Call
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
              Please dial this number on your phone:
            </ThemedText>
            <ThemedText type="h2" style={{ color: "#FF3B30", textAlign: "center", letterSpacing: 2 }}>
              {callNumber}
            </ThemedText>
            <Pressable
              onPress={() => setShowCallModal(false)}
              style={[styles.modalCloseButton, { backgroundColor: theme.primary }]}
            >
              <ThemedText type="label" style={{ color: "#FFFFFF" }}>Close</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={resetReportModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.reportModalContent, { backgroundColor: theme.backgroundRoot }]}>
              {reportSubmitted ? (
                <View style={styles.reportSuccess}>
                  <View style={[styles.modalIconCircle, { backgroundColor: "#34C75920" }]}>
                    <Feather name="check-circle" size={32} color="#34C759" />
                  </View>
                  <ThemedText type="h3" style={{ textAlign: "center" }}>
                    Report Submitted
                  </ThemedText>
                  <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
                    Thank you for helping keep our community safe. Our team will review your report within 24 hours.
                  </ThemedText>
                  <Pressable
                    onPress={resetReportModal}
                    style={[styles.modalCloseButton, { backgroundColor: theme.primary }]}
                    testID="button-report-done"
                  >
                    <ThemedText type="label" style={{ color: "#FFFFFF" }}>Done</ThemedText>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.reportHeader}>
                    <ThemedText type="h3">Report a Safety Concern</ThemedText>
                    <Pressable onPress={resetReportModal} hitSlop={12} testID="button-close-report">
                      <Feather name="x" size={24} color={theme.textSecondary} />
                    </Pressable>
                  </View>

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={{ maxHeight: 420 }}
                    contentContainerStyle={{ gap: Spacing.lg }}
                  >
                    <View>
                      <ThemedText type="label" style={{ marginBottom: Spacing.sm }}>
                        What happened?
                      </ThemedText>
                      <View style={styles.categoryGrid}>
                        {REPORT_CATEGORIES.map((cat) => (
                          <Pressable
                            key={cat.key}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setReportCategory(cat.key);
                            }}
                            style={[
                              styles.categoryChip,
                              {
                                backgroundColor: reportCategory === cat.key
                                  ? theme.primary + "15"
                                  : theme.backgroundSecondary,
                                borderColor: reportCategory === cat.key
                                  ? theme.primary
                                  : "transparent",
                              },
                            ]}
                            testID={`button-category-${cat.key}`}
                          >
                            <Feather
                              name={cat.icon}
                              size={16}
                              color={reportCategory === cat.key ? theme.primary : theme.textSecondary}
                            />
                            <ThemedText
                              type="caption"
                              style={{
                                color: reportCategory === cat.key ? theme.primary : theme.text,
                              }}
                            >
                              {cat.label}
                            </ThemedText>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    <View>
                      <ThemedText type="label" style={{ marginBottom: Spacing.sm }}>
                        Describe the issue
                      </ThemedText>
                      <TextInput
                        style={[
                          styles.textArea,
                          {
                            backgroundColor: theme.backgroundSecondary,
                            color: theme.text,
                            borderColor: theme.border,
                          },
                        ]}
                        placeholder="Please provide as much detail as possible..."
                        placeholderTextColor={theme.textSecondary}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        value={reportDescription}
                        onChangeText={setReportDescription}
                        testID="input-report-description"
                      />
                    </View>

                    <View>
                      <ThemedText type="label" style={{ marginBottom: Spacing.sm }}>
                        Location (optional)
                      </ThemedText>
                      <TextInput
                        style={[
                          styles.textInput,
                          {
                            backgroundColor: theme.backgroundSecondary,
                            color: theme.text,
                            borderColor: theme.border,
                          },
                        ]}
                        placeholder="City, venue, or address"
                        placeholderTextColor={theme.textSecondary}
                        value={reportLocation}
                        onChangeText={setReportLocation}
                        testID="input-report-location"
                      />
                    </View>
                  </ScrollView>

                  <Pressable
                    onPress={handleSubmitReport}
                    disabled={!reportCategory || !reportDescription.trim() || reportSubmitting}
                    style={[
                      styles.submitButton,
                      {
                        backgroundColor: (!reportCategory || !reportDescription.trim())
                          ? theme.textSecondary
                          : theme.error,
                        opacity: reportSubmitting ? 0.7 : 1,
                      },
                    ]}
                    testID="button-submit-report"
                  >
                    {reportSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Feather name="send" size={18} color="#FFFFFF" />
                        <ThemedText type="label" style={{ color: "#FFFFFF" }}>
                          Submit Report
                        </ThemedText>
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroSection: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  heroBanner: {
    borderRadius: BorderRadius.xl,
    padding: Spacing["2xl"],
    alignItems: "center",
    gap: Spacing.md,
  },
  heroTitle: { color: "#FFFFFF", textAlign: "center" },
  heroSubtitle: { color: "rgba(255,255,255,0.85)", textAlign: "center" },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing["2xl"] },
  sectionTitle: { marginBottom: Spacing.md },
  emergencyRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  emergencyCard: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: 6,
  },
  emergencyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  tipsContainer: { gap: Spacing.md },
  tipCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  tipIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  tipContent: { flex: 1 },
  disclaimerToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  disclaimerContent: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing["2xl"],
  },
  modalContent: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    padding: Spacing["2xl"],
    alignItems: "center",
    gap: Spacing.lg,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseButton: {
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  reportModalContent: {
    width: "100%",
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing["2xl"],
    paddingBottom: Spacing["3xl"],
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "85%",
  },
  reportHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.lg,
  },
  reportSuccess: {
    alignItems: "center" as const,
    gap: Spacing.lg,
    paddingVertical: Spacing["2xl"],
  },
  categoryGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 6,
    borderWidth: 1.5,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    minHeight: 100,
    fontSize: 14,
    lineHeight: 20,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: 14,
    height: 44,
  },
  submitButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
  },
});
