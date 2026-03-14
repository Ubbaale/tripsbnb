import React, { useEffect, useState, useRef } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator, StyleSheet } from "react-native";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import OnboardingScreen, { checkOnboardingComplete } from "@/screens/OnboardingScreen";
import type { UserRole } from "@/screens/OnboardingScreen";
import { AgeVerificationScreen, AgeBlockedScreen, checkAgeVerification } from "@/screens/AgeVerificationScreen";
import { RestaurantOnboardingScreen } from "@/screens/RestaurantOnboardingScreen";
import { RestaurantDetailScreen } from "@/screens/RestaurantDetailScreen";
import { RestaurantsListScreen } from "@/screens/RestaurantsListScreen";
import { VendorDetailScreen } from "@/screens/VendorDetailScreen";
import { TripMemoriesScreen } from "@/screens/TripMemoriesScreen";
import { CompanionDiscoveryScreen } from "@/screens/CompanionDiscoveryScreen";
import { CompanionProfileScreen } from "@/screens/CompanionProfileScreen";
import { MatchesScreen } from "@/screens/MatchesScreen";
import { CompanionOnboardingScreen } from "@/screens/CompanionOnboardingScreen";
import { SafetyCenterScreen } from "@/screens/SafetyCenterScreen";
import TripListenerScreen from "@/screens/TripListenerScreen";
import FlightStatusScreen from "@/screens/FlightStatusScreen";
import CarHireScreen from "@/screens/CarHireScreen";
import { ChatScreen } from "@/screens/ChatScreen";
import { HostOnboardingScreen } from "@/screens/HostOnboardingScreen";
import { LoyaltyRewardsScreen } from "@/screens/LoyaltyRewardsScreen";
import { ReferralScreen } from "@/screens/ReferralScreen";
import { NegotiationsScreen } from "@/screens/NegotiationsScreen";
import { SafariOnboardingScreen } from "@/screens/SafariOnboardingScreen";
import { VendorWalletScreen } from "@/screens/VendorWalletScreen";
import { VendorDealsScreen } from "@/screens/VendorDealsScreen";
import { DamageReportScreen } from "@/screens/DamageReportScreen";
import { TravelToolkitScreen } from "@/screens/TravelToolkitScreen";
import { DestinationGuideScreen } from "@/screens/DestinationGuideScreen";
import { EventSubmissionScreen } from "@/screens/EventSubmissionScreen";
import DiscoverScreen from "@/screens/DiscoverScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { MessageBell } from "@/components/MessageBell";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  RestaurantOnboarding: undefined;
  RestaurantDetail: { restaurantId: string };
  RestaurantsList: { country?: string; city?: string };
  VendorDetail: { vendorType: "restaurant" | "safari" | "accommodation" | "companion" | "car_rental"; vendorId: string };
  DamageReport: { carRentalId: string; carRentalName: string; bookingId?: string };
  TripMemories: { tripId: string; tripName: string; tripDestination?: string };
  CompanionDiscovery: undefined;
  CompanionProfile: { companionId: string };
  Matches: undefined;
  CompanionOnboarding: undefined;
  SafetyCenter: undefined;
  TripListener: undefined;
  FlightStatus: undefined;
  CarHire: undefined;
  HostOnboarding: undefined;
  SafariOnboarding: undefined;
  LoyaltyRewards: undefined;
  Referral: undefined;
  Negotiations: undefined;
  VendorWallet: { vendorId: string; vendorType: string; vendorName: string };
  VendorDeals: undefined;
  TravelToolkit: undefined;
  DestinationGuide: { destination: string; country?: string };
  EventSubmission: { destination?: string };
  Chat: { conversationId: string; vendorName: string; vendorType: string; vendorImageUrl: string | null };
  Discover: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [ageStatus, setAgeStatus] = useState<"verified" | "blocked" | "pending">("pending");

  useEffect(() => {
    checkInitialStatus();
  }, []);

  const checkInitialStatus = async () => {
    const ageResult = await checkAgeVerification();
    setAgeStatus(ageResult);
    if (ageResult === "verified") {
      const isComplete = await checkOnboardingComplete();
      setShowOnboarding(!isComplete);
    }
    setIsLoading(false);
  };

  const handleAgeVerified = async () => {
    setAgeStatus("verified");
    const isComplete = await checkOnboardingComplete();
    setShowOnboarding(!isComplete);
  };

  const handleAgeBlocked = () => {
    setAgeStatus("blocked");
  };

  const pendingRoleRef = useRef<UserRole | null>(null);

  const handleOnboardingComplete = (selectedRole?: UserRole) => {
    if (selectedRole && selectedRole !== "traveller") {
      pendingRoleRef.current = selectedRole;
    }
    setShowOnboarding(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (ageStatus === "blocked") {
    return <AgeBlockedScreen />;
  }

  if (ageStatus === "pending") {
    return <AgeVerificationScreen onVerified={handleAgeVerified} onBlocked={handleAgeBlocked} />;
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  const initialRole = pendingRoleRef.current;
  pendingRoleRef.current = null;

  return (
    <Stack.Navigator
      screenOptions={screenOptions}
      initialRouteName={
        initialRole === "host" ? "HostOnboarding" :
        initialRole === "restaurant" ? "RestaurantOnboarding" :
        initialRole === "safari" ? "SafariOnboarding" :
        initialRole === "companion" ? "CompanionOnboarding" :
        "Main"
      }
    >
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RestaurantOnboarding"
        component={RestaurantOnboardingScreen}
        options={{ headerTitle: () => <HeaderTitle title="Register Restaurant" size="small" /> }}
      />
      <Stack.Screen
        name="RestaurantDetail"
        component={RestaurantDetailScreen}
        options={{ headerTitle: () => <HeaderTitle title="Restaurant" size="small" /> }}
      />
      <Stack.Screen
        name="RestaurantsList"
        component={RestaurantsListScreen}
        options={{ headerTitle: () => <HeaderTitle title="Restaurants" size="small" /> }}
      />
      <Stack.Screen
        name="VendorDetail"
        component={VendorDetailScreen}
        options={({ route }: any) => {
          const labels: Record<string, string> = {
            restaurant: "Restaurant",
            safari: "Safari",
            accommodation: "Accommodation",
            companion: "Companion",
            car_rental: "Car Rental",
          };
          const label = labels[route.params?.vendorType] || "Details";
          return { headerTitle: () => <HeaderTitle title={label} size="small" /> };
        }}
      />
      <Stack.Screen
        name="TripMemories"
        component={TripMemoriesScreen}
        options={{ headerTitle: () => <HeaderTitle title="Memories" size="small" /> }}
      />
      <Stack.Screen
        name="CompanionDiscovery"
        component={CompanionDiscoveryScreen}
        options={{ headerTitle: () => <HeaderTitle title="Find Companions" size="small" /> }}
      />
      <Stack.Screen
        name="CompanionProfile"
        component={CompanionProfileScreen}
        options={{ headerTitle: () => <HeaderTitle title="Profile" size="small" /> }}
      />
      <Stack.Screen
        name="Matches"
        component={MatchesScreen}
        options={{ headerTitle: () => <HeaderTitle title="Matches" size="small" /> }}
      />
      <Stack.Screen
        name="CompanionOnboarding"
        component={CompanionOnboardingScreen}
        options={{ headerTitle: () => <HeaderTitle title="Become a Companion" size="small" /> }}
      />
      <Stack.Screen
        name="SafetyCenter"
        component={SafetyCenterScreen}
        options={{ headerTitle: () => <HeaderTitle title="Safety Center" size="small" /> }}
      />
      <Stack.Screen
        name="TripListener"
        component={TripListenerScreen}
        options={{ headerTitle: () => <HeaderTitle title="Trip Listener" size="small" /> }}
      />
      <Stack.Screen
        name="FlightStatus"
        component={FlightStatusScreen}
        options={{ headerTitle: () => <HeaderTitle title="Flight Status" size="small" /> }}
      />
      <Stack.Screen
        name="CarHire"
        component={CarHireScreen}
        options={{ headerTitle: () => <HeaderTitle title="Car Hire" size="small" /> }}
      />
      <Stack.Screen
        name="HostOnboarding"
        component={HostOnboardingScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="SafariOnboarding"
        component={SafariOnboardingScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="LoyaltyRewards"
        component={LoyaltyRewardsScreen}
        options={{ headerTitle: () => <HeaderTitle title="Rewards" size="small" /> }}
      />
      <Stack.Screen
        name="Referral"
        component={ReferralScreen}
        options={{ headerTitle: () => <HeaderTitle title="Refer Friends" size="small" /> }}
      />
      <Stack.Screen
        name="Negotiations"
        component={NegotiationsScreen}
        options={{ headerTitle: () => <HeaderTitle title="My Offers" size="small" /> }}
      />
      <Stack.Screen
        name="VendorWallet"
        component={VendorWalletScreen}
        options={{ headerTitle: () => <HeaderTitle title="Vendor Wallet" size="small" /> }}
      />
      <Stack.Screen
        name="VendorDeals"
        component={VendorDealsScreen}
        options={{ headerTitle: () => <HeaderTitle title="Manage Deals" size="small" /> }}
      />
      <Stack.Screen
        name="TravelToolkit"
        component={TravelToolkitScreen}
        options={{ headerTitle: () => <HeaderTitle title="Travel Toolkit" size="small" /> }}
      />
      <Stack.Screen
        name="DestinationGuide"
        component={DestinationGuideScreen}
        options={{ headerTitle: () => <HeaderTitle title="Destination Guide" size="small" /> }}
      />
      <Stack.Screen
        name="EventSubmission"
        component={EventSubmissionScreen}
        options={{ headerTitle: () => <HeaderTitle title="Promote Event" size="small" /> }}
      />
      <Stack.Screen
        name="DamageReport"
        component={DamageReportScreen}
        options={{ headerTitle: () => <HeaderTitle title="Condition Report" size="small" /> }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }: any) => ({
          headerTitle: () => <HeaderTitle title={route.params?.vendorName || "Chat"} size="small" />,
        })}
      />
      <Stack.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Discover" size="small" />,
          headerRight: () => <MessageBell />,
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
