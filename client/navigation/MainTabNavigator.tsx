import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, Image } from "react-native";

import DealsStackNavigator from "@/navigation/DealsStackNavigator";
import StaysStackNavigator from "@/navigation/StaysStackNavigator";
import ExperiencesStackNavigator from "@/navigation/ExperiencesStackNavigator";
import TimelineStackNavigator from "@/navigation/TimelineStackNavigator";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

export type MainTabParamList = {
  DealsTab: undefined;
  StaysTab: undefined;
  TimelineTab: undefined;
  ExperiencesTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_COLORS = {
  deals: "#FF3B30",
  stays: "#1A4D2E",
  experiences: "#E67E22",
  profile: "#9B59B6",
};

const INACTIVE_COLOR = "#8E8E93";

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="DealsTab"
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
            web: theme.backgroundRoot,
          }),
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
          elevation: 0,
          height: Platform.select({ ios: 88, android: 64, web: 68 }),
          paddingBottom: Platform.OS === "ios" ? 28 : Spacing.xs,
          paddingTop: Spacing.xs,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="DealsTab"
        component={DealsStackNavigator}
        options={{
          title: "Deals",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused ? { backgroundColor: `${TAB_COLORS.deals}15` } : undefined]}>
              <Feather
                name="zap"
                size={22}
                color={focused ? TAB_COLORS.deals : `${TAB_COLORS.deals}90`}
              />
            </View>
          ),
          tabBarActiveTintColor: TAB_COLORS.deals,
        }}
      />
      <Tab.Screen
        name="StaysTab"
        component={StaysStackNavigator}
        options={{
          title: "BnB",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused ? { backgroundColor: `${TAB_COLORS.stays}15` } : undefined]}>
              <Feather
                name="home"
                size={22}
                color={focused ? TAB_COLORS.stays : `${TAB_COLORS.stays}90`}
              />
            </View>
          ),
          tabBarActiveTintColor: TAB_COLORS.stays,
        }}
      />
      <Tab.Screen
        name="TimelineTab"
        component={TimelineStackNavigator}
        options={{
          title: "",
          tabBarIcon: () => (
            <View style={styles.centerTabWrapper}>
              <View style={[styles.centerTabRing, {
                borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.06)",
                backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF",
              }]}>
                <Image
                  source={require("../../assets/images/logo.png")}
                  style={styles.centerTabLogo}
                  resizeMode="contain"
                />
              </View>
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tab.Screen
        name="ExperiencesTab"
        component={ExperiencesStackNavigator}
        options={{
          title: "Explore",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused ? { backgroundColor: `${TAB_COLORS.experiences}15` } : undefined]}>
              <Feather
                name="star"
                size={22}
                color={focused ? TAB_COLORS.experiences : `${TAB_COLORS.experiences}90`}
              />
            </View>
          ),
          tabBarActiveTintColor: TAB_COLORS.experiences,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused ? { backgroundColor: `${TAB_COLORS.profile}15` } : undefined]}>
              <Feather
                name="user"
                size={22}
                color={focused ? TAB_COLORS.profile : `${TAB_COLORS.profile}90`}
              />
            </View>
          ),
          tabBarActiveTintColor: TAB_COLORS.profile,
        }}
      />
    </Tab.Navigator>
  );
}

const CENTER_SIZE = 56;
const RING_SIZE = CENTER_SIZE + 8;

const styles = StyleSheet.create({
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  centerTabWrapper: {
    position: "relative",
    top: -18,
    alignItems: "center",
    justifyContent: "center",
    width: RING_SIZE,
    height: RING_SIZE,
  },
  centerTabRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
      },
    }),
  },
  centerTabLogo: {
    width: CENTER_SIZE - 4,
    height: CENTER_SIZE - 4,
    borderRadius: (CENTER_SIZE - 4) / 2,
  },
});
