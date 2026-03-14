import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import DealsScreen from "@/screens/DealsScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { MessageBell } from "@/components/MessageBell";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

export type DealsStackParamList = {
  Deals: undefined;
};

const Stack = createNativeStackNavigator<DealsStackParamList>();

function DiscoverButton() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <HeaderButton
      onPress={() => navigation.navigate("Discover")}
    >
      <Feather name="compass" size={22} color="#DAA520" />
    </HeaderButton>
  );
}

export default function DealsStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Deals"
        component={DealsScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Tripsbnb" />,
          headerLeft: () => <DiscoverButton />,
          headerRight: () => <MessageBell />,
        }}
      />
    </Stack.Navigator>
  );
}
