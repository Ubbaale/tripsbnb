import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface SafetyAcknowledgmentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  companionName?: string;
}

const SAFETY_POINTS = [
  "I understand that Tripsbnb is a platform for connecting travelers with service providers and does not employ, endorse, or guarantee any companion.",
  "I take full responsibility for my decision to meet this person and all interactions that occur.",
  "I will meet in a public place and share my plans with someone I trust.",
  "I understand Tripsbnb is not liable for any damages, injuries, or losses resulting from this interaction.",
  "I voluntarily assume all risks associated with in-person meetings arranged through this platform.",
];

export function SafetyAcknowledgmentModal({
  visible,
  onAccept,
  onDecline,
  companionName,
}: SafetyAcknowledgmentModalProps) {
  const { theme } = useTheme();
  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    new Array(SAFETY_POINTS.length).fill(false)
  );

  const allChecked = checkedItems.every((item) => item);

  const toggleItem = (index: number) => {
    Haptics.selectionAsync();
    setCheckedItems((prev) => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };

  const handleAccept = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCheckedItems(new Array(SAFETY_POINTS.length).fill(false));
    onAccept();
  };

  const handleDecline = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCheckedItems(new Array(SAFETY_POINTS.length).fill(false));
    onDecline();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <LinearGradient
            colors={["#1A4D2E", "#2D6A4F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalHeader}
          >
            <Feather name="shield" size={32} color="#DAA520" />
            <ThemedText type="h2" style={styles.headerTitle}>
              Safety Acknowledgment
            </ThemedText>
            <ThemedText type="body" style={styles.headerSubtitle}>
              {companionName
                ? `Before connecting with ${companionName}, please review and accept the following:`
                : "Before connecting, please review and accept the following:"}
            </ThemedText>
          </LinearGradient>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.checklistContent}
            showsVerticalScrollIndicator={false}
          >
            {SAFETY_POINTS.map((point, index) => (
              <Pressable
                key={index}
                onPress={() => toggleItem(index)}
                style={[
                  styles.checkItem,
                  {
                    backgroundColor: checkedItems[index]
                      ? theme.primary + "10"
                      : theme.backgroundDefault,
                    borderColor: checkedItems[index]
                      ? theme.primary + "40"
                      : theme.border,
                  },
                ]}
                testID={`checkbox-safety-${index}`}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: checkedItems[index]
                        ? theme.primary
                        : "transparent",
                      borderColor: checkedItems[index]
                        ? theme.primary
                        : theme.textSecondary,
                    },
                  ]}
                >
                  {checkedItems[index] ? (
                    <Feather name="check" size={14} color="#FFFFFF" />
                  ) : null}
                </View>
                <ThemedText
                  type="small"
                  style={{ flex: 1, lineHeight: 20, color: theme.text }}
                >
                  {point}
                </ThemedText>
              </Pressable>
            ))}

            <View style={[styles.legalNote, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="info" size={16} color={theme.textSecondary} />
              <ThemedText type="caption" style={{ flex: 1, color: theme.textSecondary, lineHeight: 18 }}>
                By accepting, you agree to our Terms of Service, Privacy Policy, and acknowledge that you have read and understood the Platform Liability Disclaimer.
              </ThemedText>
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
            <Pressable
              onPress={handleDecline}
              style={[styles.declineButton, { borderColor: theme.border }]}
              testID="button-decline-safety"
            >
              <ThemedText type="label" style={{ color: theme.textSecondary }}>
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleAccept}
              disabled={!allChecked}
              style={[
                styles.acceptButton,
                {
                  backgroundColor: allChecked ? theme.primary : theme.backgroundSecondary,
                  opacity: allChecked ? 1 : 0.5,
                },
              ]}
              testID="button-accept-safety"
            >
              <Feather
                name="check-circle"
                size={18}
                color={allChecked ? "#FFFFFF" : theme.textSecondary}
              />
              <ThemedText
                type="label"
                style={{ color: allChecked ? "#FFFFFF" : theme.textSecondary }}
              >
                I Understand & Accept
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "90%",
    overflow: "hidden",
  },
  modalHeader: {
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerTitle: { color: "#FFFFFF", textAlign: "center" },
  headerSubtitle: {
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginTop: 4,
  },
  scrollContent: { maxHeight: 400 },
  checklistContent: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  legalNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  modalFooter: {
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.xl,
    borderTopWidth: 1,
  },
  declineButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  acceptButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
});
