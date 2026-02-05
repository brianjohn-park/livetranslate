import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import RecordScreen from "@/screens/RecordScreen";
import LanguageSelectorScreen from "@/screens/LanguageSelectorScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RecordStackParamList = {
  Record: undefined;
  LanguageSelector: {
    sourceLanguage: string;
    targetLanguage: string;
    onSelect: (source: string, target: string) => void;
  };
};

const Stack = createNativeStackNavigator<RecordStackParamList>();

export default function RecordStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Record"
        component={RecordScreen}
        options={{
          headerTitle: () => <HeaderTitle title="LiveTranslate" />,
        }}
      />
      <Stack.Screen
        name="LanguageSelector"
        component={LanguageSelectorScreen}
        options={{
          presentation: "modal",
          headerTitle: "Select Languages",
        }}
      />
    </Stack.Navigator>
  );
}
