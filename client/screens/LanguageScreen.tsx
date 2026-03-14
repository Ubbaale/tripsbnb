import React from "react";
import { StyleSheet, View, ScrollView, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { AVAILABLE_LANGUAGES, changeLanguage, getCurrentLanguage } from "@/i18n";

const { width: screenWidth } = Dimensions.get("window");
const TILE_WIDTH = (screenWidth - Spacing.lg * 2 - Spacing.md) / 2;

export default function LanguageScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [currentLang, setCurrentLang] = React.useState(getCurrentLanguage());

  const handleSelectLanguage = async (langCode: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await changeLanguage(langCode);
    setCurrentLang(langCode);
    navigation.goBack();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <ThemedText type="h2">{t("languages.title")}</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
          Choose your preferred language for the app
        </ThemedText>
      </View>

      <View style={styles.tilesGrid}>
        {AVAILABLE_LANGUAGES.map((lang) => {
          const isSelected = currentLang === lang.code;
          return (
            <Pressable
              key={lang.code}
              onPress={() => handleSelectLanguage(lang.code)}
              style={({ pressed }) => [
                styles.tile,
                { backgroundColor: theme.backgroundDefault },
                Shadows.card,
                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                isSelected && { borderColor: theme.primary, borderWidth: 2 },
              ]}
            >
              <View style={styles.tileHeader}>
                <ThemedText style={styles.flag}>{lang.flag}</ThemedText>
                {isSelected ? (
                  <View style={[styles.checkIcon, { backgroundColor: theme.primary }]}>
                    <Feather name="check" size={12} color="#FFFFFF" />
                  </View>
                ) : null}
              </View>
              <ThemedText
                type="body"
                style={[styles.nativeName, isSelected && { color: theme.primary }]}
                numberOfLines={1}
              >
                {lang.nativeName}
              </ThemedText>
              <ThemedText type="caption" style={styles.englishName} numberOfLines={1}>
                {lang.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  tilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
  },
  tile: {
    width: TILE_WIDTH,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  tileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  flag: {
    fontSize: 36,
  },
  checkIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  nativeName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  englishName: {
    opacity: 0.6,
  },
});
