import React, { useState, useEffect } from "react";
import { StyleSheet, View, Image, ScrollView, Pressable, Dimensions, Modal, Text, Alert, Platform, ActivityIndicator, TextInput, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { reloadAppAsync } from "expo";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { AVAILABLE_LANGUAGES, getCurrentLanguage } from "@/i18n";
import { resetOnboarding } from "@/screens/OnboardingScreen";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import type { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

function getTimeGreeting(): { text: string; icon: keyof typeof Feather.glyphMap } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Good Morning", icon: "sunrise" };
  if (hour >= 12 && hour < 17) return { text: "Good Afternoon", icon: "sun" };
  if (hour >= 17 && hour < 21) return { text: "Good Evening", icon: "sunset" };
  return { text: "Good Night", icon: "moon" };
}

const { width } = Dimensions.get("window");

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;
type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface RowItem {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  color?: string;
  danger?: boolean;
  onPress: () => void;
}

function SectionRow({ item, theme, isLast }: { item: RowItem; theme: any; isLast: boolean }) {
  const iconColor = item.danger ? theme.error : item.color || theme.primary;
  const iconBgColor = item.danger ? theme.error + "12" : (item.color || theme.primary) + "12";

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        item.onPress();
      }}
      style={({ pressed }) => [
        rowStyles.row,
        !isLast ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border } : null,
        pressed ? { opacity: 0.7 } : null,
      ]}
    >
      <View style={[rowStyles.iconCircle, { backgroundColor: iconBgColor }]}>
        <Feather name={item.icon} size={18} color={iconColor} />
      </View>
      <View style={rowStyles.rowContent}>
        <ThemedText style={[rowStyles.rowLabel, item.danger ? { color: theme.error } : null]}>
          {item.label}
        </ThemedText>
        {item.value ? (
          <ThemedText style={rowStyles.rowValue}>{item.value}</ThemedText>
        ) : null}
      </View>
      <Feather name="chevron-right" size={16} color={item.danger ? theme.error : "rgba(150,150,150,0.5)"} />
    </Pressable>
  );
}

function SectionCard({ title, items, theme }: { title: string; items: RowItem[]; theme: any }) {
  return (
    <View style={[sectionStyles.card, { backgroundColor: theme.backgroundDefault }]}>
      <ThemedText style={sectionStyles.sectionTitle}>{title}</ThemedText>
      {items.map((item, i) => (
        <SectionRow key={item.label} item={item} theme={theme} isLast={i === items.length - 1} />
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const rootNavigation = useNavigation<RootNavigationProp>();
  const { t } = useTranslation();
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showVendorOptions, setShowVendorOptions] = useState(false);
  const [userName, setUserName] = useState("Traveler");
  const [greeting, setGreeting] = useState(getTimeGreeting());
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("@tripverse_user_name").then((name) => {
      if (name) setUserName(name);
    });
    AsyncStorage.getItem("@tripverse_profile_photo").then((storedUri) => {
      if (storedUri) setProfilePhoto(storedUri);
    });
    setGreeting(getTimeGreeting());

    AsyncStorage.getItem("@tripverse_device_id").then(async (deviceId) => {
      if (deviceId) {
        try {
          const baseUrl = getApiUrl();
          const res = await fetch(new URL(`/api/traveller-profile/${deviceId}`, baseUrl).toString());
          const data = await res.json();
          const localPhoto = await AsyncStorage.getItem("@tripverse_profile_photo");
          if (data.avatar && !localPhoto) {
            setProfilePhoto(data.avatar);
            AsyncStorage.setItem("@tripverse_profile_photo", data.avatar).catch(() => {});
          }
          if (data.notificationEmail) {
            setNotificationEmail(data.notificationEmail);
            setEmailSaved(true);
          }
          if (data.emailNotificationsEnabled) {
            setEmailEnabled(true);
          }
        } catch {}
      }
    });
  }, []);

  const saveEmailSettings = async () => {
    if (!notificationEmail.includes("@")) return;
    setIsSavingEmail(true);
    try {
      const deviceId = await AsyncStorage.getItem("@tripverse_device_id");
      if (!deviceId) return;
      await apiRequest("PUT", `/api/traveller-profile/${deviceId}/email-notifications`, {
        email: notificationEmail,
        enabled: emailEnabled,
      });
      setEmailSaved(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("Failed to save email:", e);
    } finally {
      setIsSavingEmail(false);
    }
  };

  const toggleEmailNotifications = async (value: boolean) => {
    setEmailEnabled(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const deviceId = await AsyncStorage.getItem("@tripverse_device_id");
      if (!deviceId) return;
      await apiRequest("PUT", `/api/traveller-profile/${deviceId}/email-notifications`, {
        enabled: value,
      });
    } catch (e) {
      console.error("Failed to toggle email:", e);
      setEmailEnabled(!value);
    }
  };

  const [uploadError, setUploadError] = useState<string | null>(null);

  const pickPhoto = async (useCamera: boolean) => {
    setUploadError(null);
    try {
      let result: ImagePicker.ImagePickerResult;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          setUploadError("Camera permission is required to take a photo.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          setUploadError("Photo library permission is required.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      }
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadPhoto(asset.uri, asset.mimeType);
      }
    } catch (e: any) {
      console.error("Error picking photo:", e);
      setUploadError("Could not open photo picker. Please try again.");
    }
  };

  const uploadPhoto = async (uri: string, mimeType?: string | null) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      if (Platform.OS === "web") {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append("photo", blob, "profile.jpg");
      } else {
        const inferredType = mimeType || "image/jpeg";
        const ext = inferredType.includes("png") ? "png" : inferredType.includes("heic") || inferredType.includes("heif") ? "heic" : "jpg";
        formData.append("photo", {
          uri,
          name: `profile.${ext}`,
          type: inferredType,
        } as any);
      }

      const baseUrl = getApiUrl();
      const uploadUrl = new URL("/api/profile/upload-photo", baseUrl);
      const res = await fetch(uploadUrl.toString(), {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const serverUrl = data.url;
        const displayUri = Platform.OS === "web" ? serverUrl : uri;
        setProfilePhoto(displayUri);
        await AsyncStorage.setItem("@tripverse_profile_photo", displayUri);

        const deviceId = await AsyncStorage.getItem("@tripverse_device_id");
        if (deviceId) {
          apiRequest("PUT", `/api/traveller-profile/${deviceId}`, {
            avatar: serverUrl,
          }).catch(() => {});
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const errorText = await res.text();
        console.error("Upload failed:", res.status, errorText);
        setUploadError("Upload failed. Please try again.");
      }
    } catch (e: any) {
      console.error("Error uploading photo:", e);
      setUploadError("Could not upload photo. Check your connection.");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhotoPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPhotoModal(true);
  };

  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const handleSignOut = async () => {
    setShowSignOutModal(false);
    await resetOnboarding();
    await reloadAppAsync();
  };

  const currentLangCode = getCurrentLanguage();
  const currentLang = AVAILABLE_LANGUAGES.find(l => l.code === currentLangCode);

  const tripEssentials: RowItem[] = [
    {
      icon: "message-circle",
      label: "Messages",
      color: "#1A4D2E",
      onPress: () => navigation.navigate("ChatList"),
    },
    {
      icon: "tag",
      label: "My Offers",
      value: "Negotiations",
      color: "#F39C12",
      onPress: () => rootNavigation.navigate("Negotiations"),
    },
    {
      icon: "file-text",
      label: t("profile.transactionHistory"),
      color: "#795548",
      onPress: () => {},
    },
    {
      icon: "dollar-sign",
      label: t("profile.wallet"),
      value: "$0.00",
      color: "#27AE60",
      onPress: () => {},
    },
  ];

  const accountSafety: RowItem[] = [
    {
      icon: "credit-card",
      label: t("profile.paymentMethods"),
      value: "Manage Cards",
      color: "#3498DB",
      onPress: () => navigation.navigate("PaymentMethods"),
    },
    {
      icon: "shield",
      label: t("profile.emergencyContacts"),
      color: "#E74C3C",
      onPress: () => navigation.navigate("SafetyCenter"),
    },
    {
      icon: "check-circle",
      label: t("profile.idVerification"),
      value: t("common.verified"),
      color: "#1A4D2E",
      onPress: () => {},
    },
    {
      icon: "map-pin",
      label: t("profile.locationSharing"),
      value: t("profile.off"),
      color: "#9B59B6",
      onPress: () => {},
    },
  ];

  const preferences: RowItem[] = [
    {
      icon: "bell",
      label: t("profile.notifications"),
      value: emailEnabled ? "Email On" : "Set Up Email",
      color: "#DAA520",
      onPress: () => setShowEmailSettings(!showEmailSettings),
    },
    {
      icon: "globe",
      label: t("profile.languageCurrency"),
      value: currentLang?.nativeName || "English",
      color: "#00BCD4",
      onPress: () => navigation.navigate("Language"),
    },
    {
      icon: "help-circle",
      label: t("profile.helpSupport"),
      color: "#607D8B",
      onPress: () => {},
    },
  ];

  const rewardsItems: RowItem[] = [
    {
      icon: "award",
      label: "Loyalty Rewards",
      value: "Earn Points",
      color: "#DAA520",
      onPress: () => rootNavigation.navigate("LoyaltyRewards"),
    },
    {
      icon: "gift",
      label: "Refer Friends",
      value: "Earn 500pts",
      color: "#E74C3C",
      onPress: () => rootNavigation.navigate("Referral"),
    },
    {
      icon: "briefcase",
      label: "Travel Toolkit",
      value: "Currency, Packing & More",
      color: "#1A4D2E",
      onPress: () => rootNavigation.navigate("TravelToolkit"),
    },
  ];

  const vendorOptions = [
    { icon: "tag" as const, title: "Manage Deals", subtitle: "Create & manage your deals", colors: ["#E74C3C", "#C0392B"] as const, route: "VendorDeals" as const },
    { icon: "home" as const, title: "List Your Property", subtitle: "Earn money hosting travellers", colors: ["#DAA520", "#B8860B"] as const, route: "HostOnboarding" as const },
    { icon: "sunrise" as const, title: "List Your Safari", subtitle: "Showcase safari adventures", colors: ["#1A4D2E", "#2D6A4F"] as const, route: "SafariOnboarding" as const },
    { icon: "coffee" as const, title: "Register Restaurant", subtitle: "Grow your dining business", colors: ["#8B4513", "#A0522D"] as const, route: "RestaurantOnboarding" as const },
    { icon: "users" as const, title: "Become a Companion", subtitle: "Guide & connect with travellers", colors: ["#4A148C", "#7B1FA2"] as const, route: "CompanionOnboarding" as const },
  ];

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={{
          paddingTop: Spacing.md,
          paddingBottom: tabBarHeight + Spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <LinearGradient
            colors={isDark ? ["#1A4D2E", "#0F2D1A"] : ["#1A4D2E", "#2D6A4F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileGradient}
          >
            <View style={styles.avatarSection}>
              <View>
                <Pressable style={styles.avatarContainer} onPress={handlePhotoPress} testID="button-profile-photo">
                  {isUploading ? (
                    <View style={[styles.avatar, styles.avatarLoading]}>
                      <ActivityIndicator size="small" color="#DAA520" />
                    </View>
                  ) : profilePhoto ? (
                    <Image
                      source={{ uri: profilePhoto }}
                      style={styles.avatar}
                      resizeMode="cover"
                      onError={() => {
                        setProfilePhoto(null);
                        AsyncStorage.removeItem("@tripverse_profile_photo").catch(() => {});
                      }}
                    />
                  ) : (
                    <Image
                      source={require("../../assets/images/user-avatar-preset.png")}
                      style={styles.avatar}
                      resizeMode="cover"
                    />
                  )}
                  <View
                    style={[styles.editButton, { backgroundColor: theme.accent }]}
                  >
                    <Feather name="camera" size={12} color="#FFFFFF" />
                  </View>
                </Pressable>
                {uploadError ? (
                  <ThemedText style={styles.uploadErrorText}>{uploadError}</ThemedText>
                ) : null}
              </View>
              <View style={styles.profileInfo}>
                <View style={styles.greetingRow}>
                  <Feather name={greeting.icon} size={14} color="#DAA520" />
                  <ThemedText type="small" style={styles.greetingText}>
                    {greeting.text}
                  </ThemedText>
                </View>
                <ThemedText type="h2" style={styles.name}>
                  {userName}
                </ThemedText>
                <View style={styles.verifiedRow}>
                  <Feather name="check-circle" size={12} color="#DAA520" />
                  <ThemedText type="caption" style={styles.verifiedText}>
                    {t("profile.verifiedTraveler")}
                  </ThemedText>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statTile, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
            <ThemedText type="h2" style={{ color: theme.primary }}>0</ThemedText>
            <ThemedText type="caption">{t("profile.trips")}</ThemedText>
          </View>
          <View style={[styles.statTile, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
            <ThemedText type="h2" style={{ color: theme.primary }}>0</ThemedText>
            <ThemedText type="caption">{t("profile.reviews")}</ThemedText>
          </View>
          <View style={[styles.statTile, { backgroundColor: theme.backgroundDefault }, Shadows.card]}>
            <ThemedText type="h2" style={{ color: theme.accent }}>5.0</ThemedText>
            <ThemedText type="caption">{t("profile.rating")}</ThemedText>
          </View>
        </View>

        <SectionCard title="Trip Essentials" items={tripEssentials} theme={theme} />
        <SectionCard title="Rewards" items={rewardsItems} theme={theme} />
        <SectionCard title="Account & Safety" items={accountSafety} theme={theme} />
        <SectionCard title="Preferences" items={preferences} theme={theme} />

        {showEmailSettings ? (
          <View style={[sectionStyles.card, { backgroundColor: theme.backgroundDefault, marginTop: -Spacing.sm }]}>
            <View style={emailStyles.container}>
              <View style={emailStyles.row}>
                <View style={[rowStyles.iconCircle, { backgroundColor: "#DAA52012" }]}>
                  <Feather name="mail" size={18} color="#DAA520" />
                </View>
                <View style={rowStyles.rowContent}>
                  <ThemedText style={rowStyles.rowLabel}>Email Notifications</ThemedText>
                  <ThemedText style={rowStyles.rowValue}>Get message copies via email</ThemedText>
                </View>
                <Switch
                  value={emailEnabled}
                  onValueChange={toggleEmailNotifications}
                  trackColor={{ false: "#ccc", true: "#1A4D2E" }}
                  thumbColor={emailEnabled ? "#DAA520" : "#f4f3f4"}
                  testID="switch-email-notifications"
                />
              </View>

              <View style={emailStyles.inputRow}>
                <TextInput
                  style={[
                    emailStyles.input,
                    {
                      backgroundColor: theme.backgroundRoot,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="Enter your email address"
                  placeholderTextColor={theme.text + "60"}
                  value={notificationEmail}
                  onChangeText={(text) => {
                    setNotificationEmail(text);
                    setEmailSaved(false);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="input-notification-email"
                />
                <Pressable
                  onPress={saveEmailSettings}
                  disabled={isSavingEmail || !notificationEmail.includes("@")}
                  style={({ pressed }) => [
                    emailStyles.saveButton,
                    {
                      backgroundColor: notificationEmail.includes("@") ? "#1A4D2E" : "#ccc",
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  testID="button-save-email"
                >
                  {isSavingEmail ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : emailSaved ? (
                    <Feather name="check" size={16} color="#FFF" />
                  ) : (
                    <Text style={emailStyles.saveText}>Save</Text>
                  )}
                </Pressable>
              </View>

              <View style={emailStyles.infoRow}>
                <Feather name="info" size={12} color={theme.text + "60"} />
                <ThemedText style={[emailStyles.infoText, { color: theme.text + "60" }]}>
                  We'll send you a copy of new messages from vendors to this email
                </ThemedText>
              </View>
            </View>
          </View>
        ) : null}

        <View style={[sectionStyles.card, { backgroundColor: theme.backgroundDefault }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowVendorOptions(!showVendorOptions);
            }}
            style={styles.vendorToggle}
          >
            <View style={[rowStyles.iconCircle, { backgroundColor: "rgba(218,165,32,0.12)" }]}>
              <Feather name="briefcase" size={18} color="#DAA520" />
            </View>
            <View style={rowStyles.rowContent}>
              <ThemedText style={rowStyles.rowLabel}>Become a Host or Vendor</ThemedText>
              <ThemedText style={rowStyles.rowValue}>List your business on Tripsbnb</ThemedText>
            </View>
            <Feather name={showVendorOptions ? "chevron-up" : "chevron-down"} size={16} color="rgba(150,150,150,0.5)" />
          </Pressable>

          {showVendorOptions ? (
            <View style={styles.vendorList}>
              {vendorOptions.map((opt) => (
                <Pressable
                  key={opt.route}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    rootNavigation.navigate(opt.route as any);
                  }}
                  style={({ pressed }) => [
                    styles.vendorItem,
                    pressed ? { opacity: 0.8, transform: [{ scale: 0.98 }] } : null,
                  ]}
                >
                  <LinearGradient
                    colors={opt.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.vendorItemGradient}
                  >
                    <Feather name={opt.icon} size={20} color="#FFF" />
                    <View style={styles.vendorItemText}>
                      <Text style={styles.vendorItemTitle}>{opt.title}</Text>
                      <Text style={styles.vendorItemSubtitle}>{opt.subtitle}</Text>
                    </View>
                    <Feather name="arrow-right" size={16} color="rgba(255,255,255,0.7)" />
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={[sectionStyles.card, { backgroundColor: theme.backgroundDefault }]}>
          <SectionRow
            item={{
              icon: "log-out",
              label: t("profile.signOut"),
              danger: true,
              onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowSignOutModal(true);
              },
            }}
            theme={theme}
            isLast
          />
        </View>

        <View style={styles.footer}>
          <ThemedText type="caption" style={styles.footerText}>
            {t("profile.version")}
          </ThemedText>
          <ThemedText type="caption" style={styles.poweredByText}>
            Powered by TripVerse
          </ThemedText>
        </View>
      </ScrollView>

      <Modal
        visible={showSignOutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutModal(false)}
      >
        <Pressable
          style={signOutStyles.overlay}
          onPress={() => setShowSignOutModal(false)}
        >
          <Pressable style={[signOutStyles.modal, { backgroundColor: theme.backgroundRoot }]}>
            <View style={signOutStyles.iconCircle}>
              <Feather name="log-out" size={28} color="#E53935" />
            </View>
            <ThemedText style={signOutStyles.title}>Sign Out</ThemedText>
            <ThemedText style={signOutStyles.message}>
              Are you sure you want to sign out? You'll need to complete onboarding again.
            </ThemedText>
            <View style={signOutStyles.buttons}>
              <Pressable
                onPress={() => setShowSignOutModal(false)}
                style={[signOutStyles.button, signOutStyles.cancelButton, { borderColor: theme.border }]}
                testID="button-cancel-signout"
              >
                <ThemedText style={signOutStyles.cancelText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSignOut}
                style={[signOutStyles.button, signOutStyles.confirmButton]}
                testID="button-confirm-signout"
              >
                <Text style={signOutStyles.confirmText}>Sign Out</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <Pressable
          style={signOutStyles.overlay}
          onPress={() => setShowPhotoModal(false)}
        >
          <Pressable style={[signOutStyles.modal, { backgroundColor: theme.backgroundRoot }]}>
            <View style={signOutStyles.iconCircle}>
              <Feather name="camera" size={28} color="#1A4D2E" />
            </View>
            <ThemedText style={signOutStyles.title}>Update Photo</ThemedText>
            <ThemedText style={signOutStyles.message}>
              Choose how you'd like to update your profile photo
            </ThemedText>
            <View style={{ width: "100%", gap: Spacing.sm }}>
              <Pressable
                onPress={() => {
                  setShowPhotoModal(false);
                  setTimeout(() => pickPhoto(true), 400);
                }}
                style={[photoModalStyles.option, { backgroundColor: theme.primary }]}
                testID="button-take-selfie"
              >
                <Feather name="camera" size={18} color="#FFF" />
                <Text style={photoModalStyles.optionTextLight}>Take a Selfie</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowPhotoModal(false);
                  setTimeout(() => pickPhoto(false), 400);
                }}
                style={[photoModalStyles.option, { borderWidth: 1.5, borderColor: theme.border }]}
                testID="button-choose-gallery"
              >
                <Feather name="image" size={18} color={theme.text} />
                <ThemedText style={photoModalStyles.optionText}>Choose from Gallery</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setShowPhotoModal(false)}
                style={photoModalStyles.cancelOption}
              >
                <ThemedText style={{ opacity: 0.5, fontWeight: "600" }}>Cancel</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowValue: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 1,
  },
});

const sectionStyles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    ...Shadows.card,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    opacity: 0.4,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    ...Shadows.card,
  },
  profileGradient: {
    padding: Spacing.lg,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    position: "relative",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    overflow: "hidden",
  },
  avatarLoading: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  uploadErrorText: {
    color: "#FF6B6B",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
    maxWidth: 80,
  },
  editButton: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  profileInfo: {
    marginLeft: Spacing.lg,
    flex: 1,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: 2,
  },
  greetingText: {
    color: "#DAA520",
    fontWeight: "600",
    fontSize: 13,
  },
  name: {
    color: "#FFFFFF",
    marginBottom: Spacing.xs,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  verifiedText: {
    color: "#DAA520",
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statTile: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  vendorToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
  },
  vendorList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  vendorItem: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  vendorItemGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  vendorItemText: {
    flex: 1,
  },
  vendorItemTitle: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  vendorItemSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 1,
  },
  footer: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
  footerText: {
    opacity: 0.5,
  },
  poweredByText: {
    opacity: 0.4,
    marginTop: Spacing.sm,
    fontStyle: "italic",
  },
});

const signOutStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing["2xl"],
  },
  modal: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    padding: Spacing["2xl"],
    alignItems: "center",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(229,57,53,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.6,
    lineHeight: 20,
    marginBottom: Spacing["2xl"],
  },
  buttons: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1.5,
  },
  cancelText: {
    fontWeight: "600",
    fontSize: 15,
  },
  confirmButton: {
    backgroundColor: "#E53935",
  },
  confirmText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});

const emailStyles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
  saveButton: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
  },
  saveText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.sm,
    paddingLeft: 2,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
  },
});

const photoModalStyles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
  },
  optionTextLight: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  optionText: {
    fontWeight: "600",
    fontSize: 15,
  },
  cancelOption: {
    alignItems: "center",
    paddingVertical: 10,
    marginTop: Spacing.xs,
  },
});
