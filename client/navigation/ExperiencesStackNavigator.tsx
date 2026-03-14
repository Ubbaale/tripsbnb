import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ExperiencesScreen from "@/screens/ExperiencesScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ExperiencesStackParamList = {
  Experiences: undefined;
};

const Stack = createNativeStackNavigator<ExperiencesStackParamList>();

export default function ExperiencesStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Experiences"
        component={ExperiencesScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Tripsbnb" />,
        }}
      />
    </Stack.Navigator>
  );
}
