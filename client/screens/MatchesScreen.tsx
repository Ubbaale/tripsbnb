import React from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

const USER_ID = "traveler-" + Platform.OS;

interface MatchCompanion {
  id: string;
  name: string;
  imageUrl: string | null;
  photos: string | null;
  city: string;
  country: string;
  serviceType: string;
  age: number | null;
  verified: boolean;
  averageRating: string;
  availability: string | null;
}

interface MatchItem {
  id: string;
  userId: string;
  companionId: string;
  conversationId: string | null;
  isActive: boolean;
  createdAt: string;
  companion: MatchCompanion;
}

function getPhoto(companion: MatchCompanion): string | null {
  if (companion.photos) {
    try {
      const arr = JSON.parse(companion.photos);
      if (arr.length > 0) return arr[0];
    } catch {}
  }
  return companion.imageUrl;
}

function MatchCard({ match }: { match: MatchItem }) {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const { companion } = match;
  const photo = getPhoto(companion);
  const displayAge = companion.age ? `, ${companion.age}` : "";
  const rating = parseFloat(companion.averageRating) || 0;
  const serviceLabel = companion.serviceType
    ? companion.serviceType.replace(/_/g, " ")
    : "";

  const availColor =
    companion.availability === "available"
      ? "#4CAF50"
      : companion.availability === "busy"
        ? "#FF9800"
        : "#9E9E9E";

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (match.conversationId) {
          navigation.navigate("Chat", {
            conversationId: match.conversationId,
            vendorName: companion.name,
            vendorType: "companion",
            vendorImageUrl: photo,
          });
        } else {
          navigation.navigate("CompanionProfile", {
            companionId: companion.id,
          });
        }
      }}
      style={[
        styles.matchCard,
        { backgroundColor: theme.backgroundDefault },
        Shadows.card,
      ]}
      testID={`match-card-${companion.id}`}
    >
      <View style={styles.matchPhotoWrap}>
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={styles.matchPhoto}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.matchPhoto,
              {
                backgroundColor: theme.backgroundSecondary,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <Feather name="user" size={32} color={theme.textSecondary} />
          </View>
        )}
        <View
          style={[
            styles.availDot,
            { backgroundColor: availColor, borderColor: theme.backgroundDefault },
          ]}
        />
        {companion.verified ? (
          <View style={styles.verifiedBadge}>
            <Feather name="check-circle" size={14} color="#DAA520" />
          </View>
        ) : null}
      </View>

      <View style={styles.matchInfo}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {companion.name}
          {displayAge}
        </ThemedText>
        <View style={styles.matchLocationRow}>
          <Feather
            name="map-pin"
            size={12}
            color={theme.textSecondary}
          />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary }}
            numberOfLines={1}
          >
            {companion.city}, {companion.country}
          </ThemedText>
        </View>
        <View style={styles.matchMetaRow}>
          <View
            style={[
              styles.serviceChip,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText
              type="caption"
              style={{
                color: theme.primary,
                textTransform: "capitalize",
                fontSize: 11,
              }}
            >
              {serviceLabel}
            </ThemedText>
          </View>
          {rating > 0 ? (
            <View style={styles.ratingRow}>
              <Feather name="star" size={12} color="#DAA520" />
              <ThemedText
                type="caption"
                style={{ color: "#DAA520", fontWeight: "600" }}
              >
                {rating.toFixed(1)}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.matchAction}>
        <View
          style={[
            styles.chatButton,
            { backgroundColor: theme.primary },
          ]}
        >
          <Feather name="message-circle" size={18} color="#FFFFFF" />
        </View>
      </View>
    </Pressable>
  );
}

export function MatchesScreen() {
  const insets = useSafeAreaInsets();

  const { theme } = useTheme();

  const {
    data: matches = [],
    isLoading,
    refetch,
  } = useQuery<MatchItem[]>({
    queryKey: [`/api/companions/matches/${USER_ID}`],
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: Spacing.md,
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <LinearGradient
              colors={["#1A4D2E", "#2D6B45"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              <View style={styles.headerContent}>
                <View style={styles.headerIconWrap}>
                  <Feather name="heart" size={24} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    type="subtitle"
                    style={{ color: "#FFFFFF", marginBottom: 2 }}
                  >
                    Your Matches
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: "rgba(255,255,255,0.8)" }}
                  >
                    {matches.length > 0
                      ? `${matches.length} connection${matches.length !== 1 ? "s" : ""} — tap to chat`
                      : "Connect with companions to start chatting"}
                  </ThemedText>
                </View>
              </View>
            </LinearGradient>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <EmptyState
                image={require("../../assets/images/empty-companions.png")}
                title="No matches yet"
                subtitle="Swipe right on companions you'd like to connect with. When you match, a chat will be created automatically."
              />
            </View>
          )
        }
        renderItem={({ item }) => <MatchCard match={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        onRefresh={refetch}
        refreshing={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginBottom: Spacing.lg },
  headerGradient: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingWrap: {
    paddingVertical: 80,
    alignItems: "center",
  },
  emptyWrap: {
    paddingTop: 40,
  },
  matchCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  matchPhotoWrap: {
    position: "relative",
  },
  matchPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  availDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  verifiedBadge: {
    position: "absolute",
    top: -2,
    right: -2,
  },
  matchInfo: {
    flex: 1,
    gap: 2,
  },
  matchLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  matchMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  serviceChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  matchAction: {
    alignItems: "center",
    justifyContent: "center",
  },
  chatButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
