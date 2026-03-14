import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProfileScreen from "@/screens/ProfileScreen";
import LanguageScreen from "@/screens/LanguageScreen";
import { SafetyCenterScreen } from "@/screens/SafetyCenterScreen";
import { ChatListScreen } from "@/screens/ChatListScreen";
import PaymentMethodsScreen from "@/screens/PaymentMethodsScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ProfileStackParamList = {
  Profile: undefined;
  Language: undefined;
  SafetyCenter: undefined;
  ChatList: undefined;
  PaymentMethods: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Tripsbnb" size="small" />,
        }}
      />
      <Stack.Screen
        name="Language"
        component={LanguageScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Language" size="small" />,
        }}
      />
      <Stack.Screen
        name="SafetyCenter"
        component={SafetyCenterScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Safety Center" size="small" />,
        }}
      />
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Messages" size="small" />,
        }}
      />
      <Stack.Screen
        name="PaymentMethods"
        component={PaymentMethodsScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Payment Methods" size="small" />,
        }}
      />
    </Stack.Navigator>
  );
}
