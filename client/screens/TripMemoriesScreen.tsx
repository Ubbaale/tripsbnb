import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { File } from "expo-file-system";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface TripMemory {
  id: string;
  tripId: string;
  imageUrl: string;
  caption: string | null;
  location: string | null;
  takenAt: string | null;
  createdAt: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PHOTO_SIZE = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm) / 2;

export function TripMemoriesScreen({ route, navigation }: any) {
  const { tripId, tripName, tripDestination } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState<TripMemory | null>(null);
  const [caption, setCaption] = useState("");
  const [photoLocation, setPhotoLocation] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const fabScale = useSharedValue(1);
  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const { data: memories = [], isLoading } = useQuery<TripMemory[]>({
    queryKey: [`/api/trips/${tripId}/memories`],
  });

  const uploadMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      setUploading(true);
      try {
        const baseUrl = getApiUrl();
        const url = new URL(`/api/trips/${tripId}/memories`, baseUrl);

        const formData = new FormData();
        const file = new File(imageUri);
        formData.append("photo", file);
        if (caption) formData.append("caption", caption);
        if (photoLocation) formData.append("location", photoLocation);
        formData.append("takenAt", new Date().toISOString());

        const response = await fetch(url.toString(), {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text);
        }

        return response.json();
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/memories`] });
      setShowUploadModal(false);
      setCaption("");
      setPhotoLocation("");
      setSelectedImage(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (memoryId: string) => {
      const baseUrl = getApiUrl();
      const url = new URL(`/api/memories/${memoryId}`, baseUrl);
      const res = await fetch(url.toString(), { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/memories`] });
      setShowPhotoModal(null);
    },
  });

  const pickImage = useCallback(async (source: "camera" | "gallery") => {
    let result;
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
      });
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
      });
    }

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setShowUploadModal(true);
    }
  }, []);

  const handleUpload = useCallback(() => {
    if (selectedImage) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      uploadMutation.mutate(selectedImage);
    }
  }, [selectedImage, uploadMutation]);

  const handleSendEmail = useCallback(async () => {
    if (!emailAddress.trim()) return;
    setSendingEmail(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const baseUrl = getApiUrl();
      const url = new URL(`/api/trips/${tripId}/memories/email`, baseUrl);
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAddress.trim() }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send");
      }
      setShowEmailModal(false);
      setEmailAddress("");
    } catch (error) {
      console.error("Email send error:", error);
    } finally {
      setSendingEmail(false);
    }
  }, [emailAddress, tripId]);

  const renderPhotoItem = useCallback(({ item }: { item: TripMemory }) => (
    <Pressable
      testID={`memory-photo-${item.id}`}
      style={[styles.photoCard, { backgroundColor: theme.backgroundDefault }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowPhotoModal(item);
      }}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.photoImage} />
      {item.caption ? (
        <View style={styles.photoCaptionContainer}>
          <ThemedText style={styles.photoCaption} numberOfLines={2}>
            {item.caption}
          </ThemedText>
        </View>
      ) : null}
      {item.location ? (
        <View style={styles.photoLocationContainer}>
          <Feather name="map-pin" size={10} color={theme.textSecondary} />
          <ThemedText style={[styles.photoLocationText, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.location}
          </ThemedText>
        </View>
      ) : null}
    </Pressable>
  ), [theme]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.backgroundTertiary }]}>
        <Feather name="camera" size={48} color={theme.primary} />
      </View>
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
        No Memories Yet
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Capture your favorite moments from this trip. Take a photo or choose from your gallery.
      </ThemedText>
      <View style={styles.emptyActions}>
        <Pressable
          testID="button-take-photo-empty"
          style={[styles.emptyButton, { backgroundColor: theme.primary }]}
          onPress={() => pickImage("camera")}
        >
          <Feather name="camera" size={18} color="#FFFFFF" />
          <ThemedText style={styles.emptyButtonText}>Take Photo</ThemedText>
        </Pressable>
        <Pressable
          testID="button-gallery-empty"
          style={[styles.emptyButton, { backgroundColor: theme.accent }]}
          onPress={() => pickImage("gallery")}
        >
          <Feather name="image" size={18} color="#FFFFFF" />
          <ThemedText style={styles.emptyButtonText}>Gallery</ThemedText>
        </Pressable>
      </View>
    </View>
  ), [theme, pickImage]);

  const renderHeader = useCallback(() => (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={[theme.primary, "#2D6B45"]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Feather name="camera" size={24} color="#DAA520" />
          <ThemedText style={styles.headerTitle}>Trip Memories</ThemedText>
          <ThemedText style={styles.headerTripName}>{tripName}</ThemedText>
          {tripDestination ? (
            <View style={styles.headerLocationRow}>
              <Feather name="map-pin" size={12} color="rgba(255,255,255,0.7)" />
              <ThemedText style={styles.headerDestination}>{tripDestination}</ThemedText>
            </View>
          ) : null}
          <ThemedText style={styles.headerCount}>
            {memories.length} {memories.length === 1 ? "memory" : "memories"} captured
          </ThemedText>
        </View>
      </LinearGradient>

      {memories.length > 0 ? (
        <View style={styles.actionBar}>
          <Pressable
            testID="button-take-photo"
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={() => pickImage("camera")}
          >
            <Feather name="camera" size={16} color="#FFFFFF" />
            <ThemedText style={styles.actionButtonText}>Take Photo</ThemedText>
          </Pressable>
          <Pressable
            testID="button-gallery"
            style={[styles.actionButton, { backgroundColor: theme.accent }]}
            onPress={() => pickImage("gallery")}
          >
            <Feather name="image" size={16} color="#FFFFFF" />
            <ThemedText style={styles.actionButtonText}>Gallery</ThemedText>
          </Pressable>
          {memories.length > 0 ? (
            <Pressable
              testID="button-email-memories"
              style={[styles.actionButton, { backgroundColor: "#4A90D9" }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowEmailModal(true);
              }}
            >
              <Feather name="mail" size={16} color="#FFFFFF" />
              <ThemedText style={styles.actionButtonText}>Email</ThemedText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  ), [theme, memories.length, tripName, tripDestination, pickImage]);

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
        data={memories}
        renderItem={renderPhotoItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.photoRow}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={{
          paddingTop: Spacing.md,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      />

      {memories.length > 0 ? (
        <Animated.View style={[styles.fab, fabStyle, { bottom: insets.bottom + Spacing["2xl"] }]}>
          <Pressable
            testID="button-add-memory-fab"
            style={[styles.fabButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              fabScale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
              setTimeout(() => {
                fabScale.value = withSpring(1, { damping: 15, stiffness: 300 });
              }, 100);
              pickImage("camera");
            }}
          >
            <Feather name="plus" size={24} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      ) : null}

      <Modal visible={showUploadModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                Add Memory
              </ThemedText>
              <Pressable onPress={() => { setShowUploadModal(false); setSelectedImage(null); }}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>

            {selectedImage ? (
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            ) : null}

            <TextInput
              testID="input-caption"
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="Add a caption..."
              placeholderTextColor={theme.textSecondary}
              value={caption}
              onChangeText={setCaption}
              multiline
            />

            <TextInput
              testID="input-location"
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="Where was this taken?"
              placeholderTextColor={theme.textSecondary}
              value={photoLocation}
              onChangeText={setPhotoLocation}
            />

            <Pressable
              testID="button-upload-memory"
              style={[styles.uploadButton, { backgroundColor: theme.primary, opacity: uploading ? 0.7 : 1 }]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="upload" size={18} color="#FFFFFF" />
                  <ThemedText style={styles.uploadButtonText}>Save Memory</ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showPhotoModal !== null} transparent animationType="fade">
        <View style={[styles.fullPhotoOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.fullPhotoHeader}>
            <Pressable
              testID="button-close-photo"
              onPress={() => setShowPhotoModal(null)}
              style={styles.fullPhotoClose}
            >
              <Feather name="x" size={24} color="#FFFFFF" />
            </Pressable>
            <Pressable
              testID="button-delete-photo"
              onPress={() => {
                if (showPhotoModal) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  deleteMutation.mutate(showPhotoModal.id);
                }
              }}
              style={styles.fullPhotoDelete}
            >
              <Feather name="trash-2" size={20} color="#FF3B30" />
            </Pressable>
          </View>
          {showPhotoModal ? (
            <View style={styles.fullPhotoContent}>
              <Image
                source={{ uri: showPhotoModal.imageUrl }}
                style={styles.fullPhotoImage}
                resizeMode="contain"
              />
              {showPhotoModal.caption ? (
                <ThemedText style={styles.fullPhotoCaption}>
                  {showPhotoModal.caption}
                </ThemedText>
              ) : null}
              {showPhotoModal.location ? (
                <View style={styles.fullPhotoLocationRow}>
                  <Feather name="map-pin" size={14} color="rgba(255,255,255,0.7)" />
                  <ThemedText style={styles.fullPhotoLocation}>
                    {showPhotoModal.location}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal visible={showEmailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                Email Memories
              </ThemedText>
              <Pressable onPress={() => setShowEmailModal(false)}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>

            <View style={[styles.emailInfoBox, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="info" size={16} color={theme.primary} />
              <ThemedText style={[styles.emailInfoText, { color: theme.textSecondary }]}>
                We will send all {memories.length} photos from "{tripName}" to your email as a beautiful memory collection.
              </ThemedText>
            </View>

            <TextInput
              testID="input-email"
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="Enter your email address"
              placeholderTextColor={theme.textSecondary}
              value={emailAddress}
              onChangeText={setEmailAddress}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Pressable
              testID="button-send-email"
              style={[styles.uploadButton, { backgroundColor: "#4A90D9", opacity: sendingEmail ? 0.7 : 1 }]}
              onPress={handleSendEmail}
              disabled={sendingEmail}
            >
              {sendingEmail ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="send" size={18} color="#FFFFFF" />
                  <ThemedText style={styles.uploadButtonText}>Send to Email</ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },

  headerContainer: { marginBottom: Spacing.lg },
  headerGradient: {
    borderRadius: BorderRadius.xl,
    padding: Spacing["2xl"],
    ...Shadows.card,
  },
  headerContent: { alignItems: "center" },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: Spacing.sm,
  },
  headerTripName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  headerLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.xs,
  },
  headerDestination: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  headerCount: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginTop: Spacing.sm,
  },

  actionBar: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.tile,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  photoRow: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  photoCard: {
    width: PHOTO_SIZE,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    ...Shadows.tile,
  },
  photoImage: {
    width: "100%",
    height: PHOTO_SIZE,
  },
  photoCaptionContainer: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  photoCaption: {
    fontSize: 12,
    fontWeight: "500",
  },
  photoLocationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingTop: 2,
    paddingBottom: Spacing.sm,
  },
  photoLocationText: {
    fontSize: 10,
    flex: 1,
  },

  emptyContainer: {
    alignItems: "center",
    paddingVertical: Spacing["5xl"],
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: Spacing["2xl"],
    marginBottom: Spacing["2xl"],
  },
  emptyActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  fab: {
    position: "absolute",
    right: Spacing.lg,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.fab,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing["2xl"],
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 15,
    marginBottom: Spacing.md,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  emailInfoBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    alignItems: "flex-start",
  },
  emailInfoText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },

  fullPhotoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
  },
  fullPhotoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  fullPhotoClose: {
    padding: Spacing.sm,
  },
  fullPhotoDelete: {
    padding: Spacing.sm,
  },
  fullPhotoContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  fullPhotoImage: {
    width: "100%",
    height: "70%",
    borderRadius: BorderRadius.md,
  },
  fullPhotoCaption: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: Spacing.lg,
    fontStyle: "italic",
  },
  fullPhotoLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.sm,
  },
  fullPhotoLocation: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },
});
