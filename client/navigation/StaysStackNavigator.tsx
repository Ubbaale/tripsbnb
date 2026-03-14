import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import StaysScreen from "@/screens/StaysScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type StaysStackParamList = {
  Stays: undefined;
};

const Stack = createNativeStackNavigator<StaysStackParamList>();

export default function StaysStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Stays"
        component={StaysScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Accommodation Any Destination BnB" size="small" />,
        }}
      />
    </Stack.Navigator>
  );
}
