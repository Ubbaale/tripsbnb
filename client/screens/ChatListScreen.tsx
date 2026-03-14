import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Typography, Shadows } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type ChatConversation = {
  id: string;
  userId: string;
  vendorType: string;
  vendorId: string;
  vendorName: string;
  vendorImageUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  hasActiveBooking: boolean;
  isBlocked: boolean;
};

const VENDOR_TYPE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  restaurant: "coffee",
  safari: "sunrise",
  accommodation: "home",
  companion: "users",
};

const VENDOR_TYPE_EMOJIS: Record<string, string> = {
  restaurant: "🍽️",
  safari: "🦁",
  accommodation: "🏨",
  companion: "👫",
};

const VENDOR_TYPE_COLORS: Record<string, string> = {
  restaurant: "#E67E22",
  safari: "#2ECC71",
  accommodation: "#3498DB",
  companion: "#9B59B6",
};

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ChatListScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { data: conversations = [], isLoading } = useQuery<ChatConversation[]>({
    queryKey: ["/api/chat/conversations?userId=anonymous"],
    refetchInterval: 5000,
  });

  const renderItem = useCallback(
    ({ item }: { item: ChatConversation }) => {
      const typeColor = VENDOR_TYPE_COLORS[item.vendorType] || theme.primary;
      const typeIcon = VENDOR_TYPE_ICONS[item.vendorType] || "message-circle";

      return (
        <Pressable
          testID={`chat-conversation-${item.id}`}
          style={[styles.conversationCard, { backgroundColor: theme.backgroundDefault }]}
          onPress={() =>
            navigation.navigate("Chat", {
              conversationId: item.id,
              vendorName: item.vendorName,
              vendorType: item.vendorType,
              vendorImageUrl: item.vendorImageUrl,
            })
          }
        >
          <View style={styles.avatarContainer}>
            {item.vendorImageUrl ? (
              <Image source={{ uri: item.vendorImageUrl }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: `${typeColor}20` }]}>
                <Feather name={typeIcon} size={22} color={typeColor} />
              </View>
            )}
            {item.hasActiveBooking ? (
              <View style={[styles.statusDot, { backgroundColor: "#34C759" }]} />
            ) : null}
          </View>

          <View style={styles.contentArea}>
            <View style={styles.topRow}>
              <Text
                style={[styles.vendorName, { color: theme.text }]}
                numberOfLines={1}
              >
                {item.vendorName}
              </Text>
              <Text style={[styles.timestamp, { color: theme.textSecondary }]}>
                {formatTime(item.lastMessageAt)}
              </Text>
            </View>
            <View style={styles.bottomRow}>
              <View style={[styles.typeBadge, { backgroundColor: `${typeColor}15` }]}>
                <Feather name={typeIcon} size={10} color={typeColor} />
                <Text style={[styles.typeLabel, { color: typeColor }]}>
                  {item.vendorType.charAt(0).toUpperCase() + item.vendorType.slice(1)}
                </Text>
              </View>
              <Text
                style={[styles.lastMessage, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {item.lastMessage || "Start a conversation..."}
              </Text>
            </View>
          </View>

          {item.unreadCount > 0 ? (
            <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 99 ? "99+" : item.unreadCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      );
    },
    [theme, navigation],
  );

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingTop: Spacing.md,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: Spacing.lg,
        }}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: `${theme.primary}10` }]}>
              <Feather name="message-circle" size={48} color={theme.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              💬 No conversations yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Start chatting with vendors from their listing pages to communicate safely through Tripsbnb 🔒
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  conversationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    ...Shadows.card,
  },
  avatarContainer: {
    position: "relative",
    marginRight: Spacing.md,
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    position: "absolute",
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  contentArea: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  vendorName: {
    ...Typography.label,
    flex: 1,
    marginRight: Spacing.sm,
  },
  timestamp: {
    ...Typography.caption,
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  typeLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  lastMessage: {
    ...Typography.caption,
    flex: 1,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: Spacing["2xl"],
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    textAlign: "center",
  },
});
