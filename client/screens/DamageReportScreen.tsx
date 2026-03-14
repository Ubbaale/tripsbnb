import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";

const CONDITION_OPTIONS = [
  { value: "excellent", label: "Excellent", icon: "check-circle", color: "#27AE60" },
  { value: "good", label: "Good", icon: "thumbs-up", color: "#2ECC71" },
  { value: "fair", label: "Fair", icon: "minus-circle", color: "#F39C12" },
  { value: "poor", label: "Poor", icon: "alert-triangle", color: "#E74C3C" },
] as const;

const FUEL_LEVELS = [
  { value: "full", label: "Full" },
  { value: "three_quarter", label: "3/4" },
  { value: "half", label: "1/2" },
  { value: "quarter", label: "1/4" },
  { value: "empty", label: "Empty" },
] as const;

const DAMAGE_AREAS = [
  { value: "front_left", label: "Front Left" },
  { value: "front_right", label: "Front Right" },
  { value: "rear_left", label: "Rear Left" },
  { value: "rear_right", label: "Rear Right" },
  { value: "roof", label: "Roof" },
  { value: "hood", label: "Hood" },
  { value: "trunk", label: "Trunk" },
  { value: "windscreen", label: "Windscreen" },
] as const;

interface DamageReport {
  id: string;
  reportType: string;
  overallCondition: string;
  exteriorNotes: string | null;
  interiorNotes: string | null;
  fuelLevel: string | null;
  mileageReading: number | null;
  damageLocations: string | null;
  createdAt: string;
}

export function DamageReportScreen({ route }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { carRentalId, carRentalName, bookingId } = route.params;

  const [reportType, setReportType] = useState<"pickup" | "return">("pickup");
  const [overallCondition, setOverallCondition] = useState("good");
  const [exteriorNotes, setExteriorNotes] = useState("");
  const [interiorNotes, setInteriorNotes] = useState("");
  const [fuelLevel, setFuelLevel] = useState("full");
  const [mileageReading, setMileageReading] = useState("");
  const [selectedDamageAreas, setSelectedDamageAreas] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const { data: existingReports = [] } = useQuery<DamageReport[]>({
    queryKey: [`/api/car-rentals/${carRentalId}/damage-reports`],
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const data = {
        carRentalId,
        bookingId: bookingId || null,
        reportType,
        overallCondition,
        exteriorNotes: exteriorNotes || null,
        interiorNotes: interiorNotes || null,
        fuelLevel,
        mileageReading: mileageReading ? parseInt(mileageReading) : null,
        damageLocations: selectedDamageAreas.length > 0 ? selectedDamageAreas.join(",") : null,
        photoUrls: photos.length > 0 ? photos.join(",") : null,
        acknowledgedAt: new Date().toISOString(),
      };
      const response = await apiRequest("POST", `/api/car-rentals/${carRentalId}/damage-reports`, data);
      return response.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to submit damage report");
    },
  });

  const pickImage = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Camera", "Use Expo Go on your phone to take photos");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const toggleDamageArea = (area: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDamageAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleSubmit = () => {
    if (!overallCondition) {
      Alert.alert("Required", "Please select the overall condition of the vehicle");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    submitMutation.mutate();
  };

  if (submitted) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.successContainer, { paddingTop: Spacing.xl }]}>
          <View style={[styles.successIcon, { backgroundColor: "#27AE60" + "15" }]}>
            <Feather name="check-circle" size={64} color="#27AE60" />
          </View>
          <ThemedText type="h2" style={{ textAlign: "center", marginTop: Spacing.lg }}>
            Report Submitted
          </ThemedText>
          <ThemedText type="body" style={{ textAlign: "center", color: theme.textSecondary, marginTop: Spacing.sm }}>
            Your {reportType} condition report for {carRentalName} has been recorded. This protects both you and the vehicle owner.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <ThemedText type="h3">{carRentalName}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
            Document the vehicle condition to protect yourself
          </ThemedText>
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText type="label" style={styles.sectionTitle}>Report Type</ThemedText>
          <View style={styles.typeSelector}>
            {(["pickup", "return"] as const).map((type) => (
              <Pressable
                key={type}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setReportType(type);
                }}
                style={[
                  styles.typeButton,
                  { borderColor: theme.border },
                  reportType === type ? { backgroundColor: theme.primary, borderColor: theme.primary } : undefined,
                ]}
                testID={`button-type-${type}`}
              >
                <Feather
                  name={type === "pickup" ? "log-in" : "log-out"}
                  size={18}
                  color={reportType === type ? "#FFFFFF" : theme.text}
                />
                <ThemedText
                  type="label"
                  style={{ color: reportType === type ? "#FFFFFF" : theme.text }}
                >
                  {type === "pickup" ? "Pickup" : "Return"}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText type="label" style={styles.sectionTitle}>Overall Condition</ThemedText>
          <View style={styles.conditionGrid}>
            {CONDITION_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setOverallCondition(opt.value);
                }}
                style={[
                  styles.conditionCard,
                  { borderColor: theme.border },
                  overallCondition === opt.value
                    ? { borderColor: opt.color, backgroundColor: opt.color + "10" }
                    : undefined,
                ]}
                testID={`button-condition-${opt.value}`}
              >
                <Feather
                  name={opt.icon as any}
                  size={24}
                  color={overallCondition === opt.value ? opt.color : theme.textSecondary}
                />
                <ThemedText
                  type="caption"
                  style={{
                    color: overallCondition === opt.value ? opt.color : theme.textSecondary,
                    fontWeight: overallCondition === opt.value ? "700" : "400",
                  }}
                >
                  {opt.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText type="label" style={styles.sectionTitle}>Fuel Level</ThemedText>
          <View style={styles.fuelRow}>
            {FUEL_LEVELS.map((level) => (
              <Pressable
                key={level.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFuelLevel(level.value);
                }}
                style={[
                  styles.fuelButton,
                  { borderColor: theme.border },
                  fuelLevel === level.value
                    ? { backgroundColor: theme.primary, borderColor: theme.primary }
                    : undefined,
                ]}
                testID={`button-fuel-${level.value}`}
              >
                <ThemedText
                  type="caption"
                  style={{
                    color: fuelLevel === level.value ? "#FFFFFF" : theme.text,
                    fontWeight: fuelLevel === level.value ? "700" : "400",
                  }}
                >
                  {level.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText type="label" style={styles.sectionTitle}>Mileage Reading</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
            value={mileageReading}
            onChangeText={setMileageReading}
            placeholder="Enter current mileage (km)"
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
            testID="input-mileage"
          />
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText type="label" style={styles.sectionTitle}>Damage Areas (if any)</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
            Tap areas where you notice existing damage
          </ThemedText>
          <View style={styles.damageGrid}>
            {DAMAGE_AREAS.map((area) => {
              const isSelected = selectedDamageAreas.includes(area.value);
              return (
                <Pressable
                  key={area.value}
                  onPress={() => toggleDamageArea(area.value)}
                  style={[
                    styles.damageChip,
                    { borderColor: theme.border },
                    isSelected ? { backgroundColor: "#E74C3C" + "15", borderColor: "#E74C3C" } : undefined,
                  ]}
                  testID={`button-damage-${area.value}`}
                >
                  <Feather
                    name={isSelected ? "alert-circle" : "circle"}
                    size={14}
                    color={isSelected ? "#E74C3C" : theme.textSecondary}
                  />
                  <ThemedText
                    type="caption"
                    style={{ color: isSelected ? "#E74C3C" : theme.text }}
                  >
                    {area.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText type="label" style={styles.sectionTitle}>Exterior Notes</ThemedText>
          <TextInput
            style={[styles.textArea, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
            value={exteriorNotes}
            onChangeText={setExteriorNotes}
            placeholder="Describe any exterior damage, scratches, dents..."
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
            testID="input-exterior-notes"
          />
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText type="label" style={styles.sectionTitle}>Interior Notes</ThemedText>
          <TextInput
            style={[styles.textArea, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
            value={interiorNotes}
            onChangeText={setInteriorNotes}
            placeholder="Describe interior condition, cleanliness, damages..."
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
            testID="input-interior-notes"
          />
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText type="label" style={styles.sectionTitle}>Photos</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
            Take photos of the vehicle from all angles
          </ThemedText>
          <View style={styles.photoActions}>
            <Pressable
              onPress={pickImage}
              style={[styles.photoButton, { backgroundColor: theme.primary }]}
              testID="button-take-photo"
            >
              <Feather name="camera" size={18} color="#FFFFFF" />
              <ThemedText type="label" style={{ color: "#FFFFFF" }}>Take Photo</ThemedText>
            </Pressable>
            <Pressable
              onPress={pickFromGallery}
              style={[styles.photoButton, { backgroundColor: theme.backgroundDefault, borderWidth: 1, borderColor: theme.border }]}
              testID="button-pick-gallery"
            >
              <Feather name="image" size={18} color={theme.text} />
              <ThemedText type="label">Gallery</ThemedText>
            </Pressable>
          </View>
          {photos.length > 0 ? (
            <View style={styles.photoGrid}>
              {photos.map((uri, index) => (
                <View key={`photo-${index}`} style={styles.photoWrapper}>
                  <Image source={{ uri }} style={styles.photoThumb} />
                  <Pressable
                    onPress={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                    style={styles.photoRemove}
                    testID={`button-remove-photo-${index}`}
                  >
                    <Feather name="x" size={14} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {existingReports.length > 0 ? (
          <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="label" style={styles.sectionTitle}>Previous Reports</ThemedText>
            {existingReports.map((report) => (
              <View key={report.id} style={[styles.previousReport, { borderColor: theme.border }]}>
                <View style={styles.reportHeader}>
                  <View style={[styles.reportTypeBadge, { backgroundColor: report.reportType === "pickup" ? "#27AE60" + "15" : "#3498DB" + "15" }]}>
                    <ThemedText type="caption" style={{ color: report.reportType === "pickup" ? "#27AE60" : "#3498DB", fontWeight: "700" }}>
                      {report.reportType === "pickup" ? "Pickup" : "Return"}
                    </ThemedText>
                  </View>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    {new Date(report.createdAt).toLocaleDateString()}
                  </ThemedText>
                </View>
                <ThemedText type="body">Condition: {report.overallCondition}</ThemedText>
                {report.fuelLevel ? (
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    Fuel: {report.fuelLevel.replace(/_/g, " ")}
                  </ThemedText>
                ) : null}
                {report.damageLocations ? (
                  <ThemedText type="caption" style={{ color: "#E74C3C" }}>
                    Damage noted: {report.damageLocations.split(",").map((d) => d.replace(/_/g, " ")).join(", ")}
                  </ThemedText>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: theme.backgroundDefault, paddingBottom: insets.bottom + Spacing.sm }]}>
        <Pressable
          onPress={handleSubmit}
          disabled={submitMutation.isPending}
          style={[
            styles.submitButton,
            { backgroundColor: theme.primary },
            submitMutation.isPending ? { opacity: 0.7 } : undefined,
          ]}
          testID="button-submit-report"
        >
          {submitMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Feather name="check" size={20} color="#FFFFFF" />
              <ThemedText type="label" style={{ color: "#FFFFFF", fontSize: 16 }}>
                Submit {reportType === "pickup" ? "Pickup" : "Return"} Report
              </ThemedText>
            </>
          )}
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  typeSelector: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  conditionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  conditionCard: {
    flex: 1,
    minWidth: "22%",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  fuelRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  fuelButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  input: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
  },
  damageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  damageChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
  },
  photoActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  photoWrapper: {
    position: "relative",
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
  },
  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E74C3C",
    alignItems: "center",
    justifyContent: "center",
  },
  previousReport: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  reportTypeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    ...Shadows.card,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
});
