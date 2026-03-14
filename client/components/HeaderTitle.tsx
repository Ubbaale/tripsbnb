import React from "react";
import { View, StyleSheet, Image } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

interface HeaderTitleProps {
  title: string;
  size?: "small" | "default";
}

export function HeaderTitle({ title, size = "default" }: HeaderTitleProps) {
  const { theme } = useTheme();
  const isSmall = size === "small";
  
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/logo.png")}
        style={isSmall ? styles.iconSmall : styles.icon}
        resizeMode="contain"
      />
      <ThemedText style={[isSmall ? styles.titleSmall : styles.title, { color: theme.primary }]}>
        {title}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 24,
  },
  icon: {
    width: 32,
    height: 32,
    marginRight: Spacing.sm,
    borderRadius: 8,
  },
  iconSmall: {
    width: 24,
    height: 24,
    marginRight: Spacing.xs,
    borderRadius: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "CormorantGaramond_700Bold",
    letterSpacing: 0.75,
  },
  titleSmall: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "CormorantGaramond_700Bold",
    letterSpacing: 0.5,
  },
});
