import React, { useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius, SpeakerColors } from "@/constants/theme";
import { HistoryStackParamList } from "@/navigation/HistoryStackNavigator";

type Props = {
  navigation: NativeStackNavigationProp<HistoryStackParamList, "History">;
};

interface Session {
  id: number;
  sourceLanguage: string;
  targetLanguage: string;
  duration: number;
  speakerCount: number;
  avgConfidence: number;
  createdAt: string;
  preview?: string;
}

const LANGUAGE_CODES: Record<string, string> = {
  en: "EN",
  es: "ES",
  fr: "FR",
  de: "DE",
  it: "IT",
  pt: "PT",
  zh: "ZH",
  ja: "JA",
  ko: "KO",
  ar: "AR",
  hi: "HI",
  ru: "RU",
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "long" });
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}

export default function HistoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { token } = useAuth();

  const {
    data: sessions,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
    queryFn: async () => {
      const response = await fetch(new URL("/api/sessions", getApiUrl()).href, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch sessions");
      return response.json();
    },
    enabled: !!token,
  });

  const handleSessionPress = useCallback((session: Session) => {
    navigation.navigate("SessionDetail", { sessionId: session.id });
  }, [navigation]);

  const renderSession = useCallback(
    ({ item }: { item: Session }) => (
      <Card
        elevation={1}
        style={styles.sessionCard}
        onPress={() => handleSessionPress(item)}
      >
        <View style={styles.sessionHeader}>
          <View
            style={[
              styles.languagePairBadge,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText type="small" style={{ fontWeight: "600" }}>
              {LANGUAGE_CODES[item.sourceLanguage] || item.sourceLanguage.toUpperCase()}
            </ThemedText>
            <Feather name="arrow-right" size={12} color={theme.textSecondary} />
            <ThemedText type="small" style={{ fontWeight: "600" }}>
              {LANGUAGE_CODES[item.targetLanguage] || item.targetLanguage.toUpperCase()}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>

        <View style={styles.sessionMeta}>
          <View style={styles.metaItem}>
            <Feather name="clock" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {formatDuration(item.duration || 0)}
            </ThemedText>
          </View>
          <View style={styles.metaItem}>
            <Feather name="users" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {item.speakerCount || 1} speaker{(item.speakerCount || 1) !== 1 ? "s" : ""}
            </ThemedText>
          </View>
          <View style={styles.metaItem}>
            <Feather name="calendar" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {formatDate(item.createdAt)}
            </ThemedText>
          </View>
        </View>

        {item.preview ? (
          <ThemedText
            type="body"
            numberOfLines={2}
            style={[styles.preview, { color: theme.textSecondary }]}
          >
            {item.preview}
          </ThemedText>
        ) : null}
      </Card>
    ),
    [theme, handleSessionPress]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Image
          source={require("../../assets/images/empty-history.png")}
          style={styles.emptyImage}
          resizeMode="contain"
        />
        <ThemedText type="h3" style={styles.emptyTitle}>
          No Sessions Yet
        </ThemedText>
        <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          Start recording to see your transcription sessions here
        </ThemedText>
      </View>
    ),
    [theme]
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: headerHeight }]}>
          <ActivityIndicator size="large" color={theme.link} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={sessions || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderSession}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
          !sessions?.length && styles.emptyListContent,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.link}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  sessionCard: {
    gap: Spacing.md,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  languagePairBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  sessionMeta: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  preview: {
    marginTop: Spacing.xs,
  },
  separator: {
    height: Spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyImage: {
    width: 160,
    height: 160,
    marginBottom: Spacing.xl,
    opacity: 0.8,
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  emptySubtitle: {
    textAlign: "center",
    maxWidth: 280,
  },
});
