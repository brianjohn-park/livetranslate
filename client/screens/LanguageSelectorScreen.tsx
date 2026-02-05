import React, { useState, useMemo } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RecordStackParamList } from "@/navigation/RecordStackNavigator";

type Props = {
  route: RouteProp<RecordStackParamList, "LanguageSelector">;
  navigation: NativeStackNavigationProp<RecordStackParamList, "LanguageSelector">;
};

interface Language {
  code: string;
  name: string;
  native: string;
}

const LANGUAGES: Language[] = [
  { code: "en", name: "English", native: "English" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "zh", name: "Chinese", native: "中文" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "da", name: "Danish", native: "Dansk" },
  { code: "fi", name: "Finnish", native: "Suomi" },
  { code: "no", name: "Norwegian", native: "Norsk" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "he", name: "Hebrew", native: "עברית" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "hu", name: "Hungarian", native: "Magyar" },
  { code: "sk", name: "Slovak", native: "Slovenčina" },
  { code: "bg", name: "Bulgarian", native: "Български" },
];

export default function LanguageSelectorScreen({ route, navigation }: Props) {
  const { sourceLanguage, targetLanguage, onSelect } = route.params;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<"source" | "target">("source");
  const [selectedSource, setSelectedSource] = useState(sourceLanguage);
  const [selectedTarget, setSelectedTarget] = useState(targetLanguage);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLanguages = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(query) ||
        lang.native.toLowerCase().includes(query) ||
        lang.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  function handleLanguageSelect(code: string) {
    Haptics.selectionAsync();
    
    if (activeTab === "source") {
      setSelectedSource(code);
      if (code === selectedTarget) {
        // Swap languages
        setSelectedTarget(selectedSource);
      }
    } else {
      setSelectedTarget(code);
      if (code === selectedSource) {
        // Swap languages
        setSelectedSource(selectedTarget);
      }
    }
  }

  function handleDone() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(selectedSource, selectedTarget);
    navigation.goBack();
  }

  const currentSelection = activeTab === "source" ? selectedSource : selectedTarget;

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.content,
          { paddingTop: headerHeight + Spacing.md },
        ]}
      >
        {/* Tab Selector */}
        <View style={[styles.tabContainer, { backgroundColor: theme.backgroundDefault }]}>
          <Pressable
            onPress={() => setActiveTab("source")}
            style={[
              styles.tab,
              activeTab === "source" && { backgroundColor: theme.backgroundRoot },
            ]}
          >
            <ThemedText
              type="small"
              style={[
                styles.tabLabel,
                { color: activeTab === "source" ? theme.text : theme.textSecondary },
              ]}
            >
              From
            </ThemedText>
            <ThemedText type="h4">
              {LANGUAGES.find((l) => l.code === selectedSource)?.name || selectedSource}
            </ThemedText>
          </Pressable>

          <Feather name="arrow-right" size={20} color={theme.textSecondary} />

          <Pressable
            onPress={() => setActiveTab("target")}
            style={[
              styles.tab,
              activeTab === "target" && { backgroundColor: theme.backgroundRoot },
            ]}
          >
            <ThemedText
              type="small"
              style={[
                styles.tabLabel,
                { color: activeTab === "target" ? theme.text : theme.textSecondary },
              ]}
            >
              To
            </ThemedText>
            <ThemedText type="h4">
              {LANGUAGES.find((l) => l.code === selectedTarget)?.name || selectedTarget}
            </ThemedText>
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[
              styles.searchInput,
              { color: theme.text },
            ]}
            placeholder="Search languages..."
            placeholderTextColor={theme.textDisabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        {/* Language List */}
        <FlatList
          data={filteredLanguages}
          keyExtractor={(item) => item.code}
          contentContainerStyle={{
            paddingBottom: insets.bottom + Spacing.xl + 60,
          }}
          renderItem={({ item }) => {
            const isSelected = item.code === currentSelection;
            const isDisabled =
              (activeTab === "source" && item.code === selectedTarget) ||
              (activeTab === "target" && item.code === selectedSource);

            return (
              <Pressable
                onPress={() => handleLanguageSelect(item.code)}
                disabled={isDisabled}
                style={({ pressed }) => [
                  styles.languageRow,
                  {
                    backgroundColor: isSelected
                      ? theme.link + "15"
                      : pressed
                      ? theme.backgroundDefault
                      : "transparent",
                    opacity: isDisabled ? 0.4 : 1,
                  },
                ]}
              >
                <View style={styles.languageInfo}>
                  <ThemedText type="body" style={{ fontWeight: isSelected ? "600" : "400" }}>
                    {item.name}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {item.native}
                  </ThemedText>
                </View>
                {isSelected ? (
                  <Feather name="check" size={20} color={theme.link} />
                ) : null}
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: theme.border }]} />
          )}
        />
      </View>

      {/* Done Button */}
      <View
        style={[
          styles.doneButtonContainer,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: theme.backgroundRoot,
            borderTopColor: theme.border,
          },
        ]}
      >
        <Pressable
          onPress={handleDone}
          style={({ pressed }) => [
            styles.doneButton,
            {
              backgroundColor: theme.text,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          testID="button-done"
        >
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
            Done
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  tabContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.xs,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  tabLabel: {
    marginBottom: Spacing.xs,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  languageInfo: {
    gap: 2,
  },
  separator: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  doneButtonContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  doneButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
});
