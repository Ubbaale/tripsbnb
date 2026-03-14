import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useTheme } from "@/hooks/useTheme";

export function MessageBell() {
  const { totalUnread } = useUnreadMessages();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate("ProfileTab", { screen: "ChatList" });
      }}
      style={({ pressed }) => [
        styles.container,
        pressed ? { opacity: 0.7 } : null,
      ]}
      testID="button-message-bell"
    >
      <Feather name="message-circle" size={22} color={theme.text} />
      {totalUnread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {totalUnread > 99 ? "99+" : totalUnread}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginRight: 16,
    marginTop: 24,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E53935",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
});
