import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRoute, RouteProp } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { apiRequest, queryClient } from "@/lib/query-client";
import { BorderRadius, Spacing, Typography } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: string;
  content: string;
  messageType: string;
  isFiltered: boolean;
  createdAt: string;
};

const USER_ID = "anonymous";

export function ChatScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const route = useRoute<RouteProp<RootStackParamList, "Chat">>();
  const { conversationId, vendorName, vendorType } = route.params;

  const [text, setText] = useState("");
  const [filterWarning, setFilterWarning] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: [`/api/chat/conversations/${conversationId}/messages`],
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/chat/conversations/${conversationId}/messages`, {
        senderId: USER_ID,
        senderType: "user",
        content,
        messageType: "text",
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/chat/conversations/${conversationId}/messages`],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/chat/conversations?userId=anonymous"],
      });
      if (data.wasFiltered) {
        setFilterWarning(data.filterWarning);
        setTimeout(() => setFilterWarning(null), 5000);
      }
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMutation.mutate(trimmed);
    setText("");
  }, [text, sendMutation]);

  const newestFirst = [...messages].reverse();

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.senderType === "user";
      return (
        <View
          testID={`message-${item.id}`}
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.vendorBubble,
            {
              backgroundColor: isUser ? theme.primary : theme.backgroundDefault,
            },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isUser ? "#FFFFFF" : theme.text },
            ]}
          >
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            {item.isFiltered ? (
              <Feather
                name="shield"
                size={10}
                color={isUser ? "rgba(255,255,255,0.5)" : theme.textSecondary}
              />
            ) : null}
            <Text
              style={[
                styles.messageTime,
                {
                  color: isUser ? "rgba(255,255,255,0.6)" : theme.textSecondary,
                },
              ]}
            >
              {new Date(item.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>
      );
    },
    [theme],
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
    >
      <View style={[styles.safetyBanner, { backgroundColor: `${theme.primary}08`, marginTop: Spacing.md }]}>
        <Feather name="shield" size={14} color={theme.primary} />
        <Text style={[styles.safetyText, { color: theme.primary }]}>
          Keep all communication and bookings on Tripsbnb. Sharing phone numbers, emails, or external app contacts is blocked for your protection.
        </Text>
      </View>

      {filterWarning ? (
        <View style={[styles.warningBanner, { backgroundColor: "#FF9500" }]}>
          <Feather name="alert-triangle" size={14} color="#FFFFFF" />
          <Text style={styles.warningText}>{filterWarning}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          inverted={messages.length > 0}
          data={newestFirst}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.messagesList,
            { paddingBottom: Spacing.md },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View style={[styles.emptyChatIcon, { backgroundColor: `${theme.primary}10` }]}>
                <Feather name="message-circle" size={36} color={theme.primary} />
              </View>
              <Text style={[styles.emptyChatTitle, { color: theme.text }]}>
                Chat with {vendorName}
              </Text>
              <Text style={[styles.emptyChatSubtitle, { color: theme.textSecondary }]}>
                Send a message to start the conversation. Keep all communication within Tripsbnb for your safety.
              </Text>
            </View>
          }
        />
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundDefault,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.sm,
          },
        ]}
      >
        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <TextInput
            testID="input-chat-message"
            style={[styles.textInput, { color: theme.text }]}
            placeholder="Type a message..."
            placeholderTextColor={theme.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
        </View>
        <Pressable
          testID="button-send-message"
          style={[
            styles.sendButton,
            {
              backgroundColor: text.trim() ? theme.primary : theme.backgroundTertiary,
            },
          ]}
          onPress={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
        >
          {sendMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather
              name="send"
              size={18}
              color={text.trim() ? "#FFFFFF" : theme.textSecondary}
            />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safetyBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  safetyText: {
    ...Typography.caption,
    fontSize: 11,
    flex: 1,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  warningText: {
    ...Typography.caption,
    fontSize: 11,
    color: "#FFFFFF",
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  messageBubble: {
    maxWidth: "78%",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  vendorBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    ...Typography.body,
    fontSize: 15,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 2,
  },
  messageTime: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
    justifyContent: "center",
  },
  textInput: {
    ...Typography.body,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: Platform.OS === "ios" ? Spacing.sm : 6,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyChat: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing["4xl"],
  },
  emptyChatIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyChatTitle: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptyChatSubtitle: {
    ...Typography.body,
    textAlign: "center",
    fontSize: 14,
  },
});
