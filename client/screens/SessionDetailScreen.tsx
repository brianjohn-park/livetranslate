import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { RouteProp } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius, SpeakerColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type Props = {
  route: RouteProp<RootStackParamList, "SessionDetail">;
};

interface Utterance {
  id: number;
  speakerLabel: string;
  originalText: string;
  translatedText: string;
  confidence?: number;
}

interface SessionDetail {
  id: number;
  sourceLanguage: string;
  targetLanguage: string;
  duration: number;
  speakerCount: number;
  avgConfidence: number;
  createdAt: string;
  utterances: Utterance[];
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  hi: "Hindi",
  ru: "Russian",
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getSpeakerColor(speaker: string): string {
  const index = speaker.charCodeAt(0) - 65;
  return SpeakerColors[index % SpeakerColors.length];
}

function getConfidenceOpacity(confidence?: number): number {
  if (!confidence) return 1;
  if (confidence >= 0.9) return 1;
  if (confidence >= 0.7) return 0.8;
  return 0.5;
}

export default function SessionDetailScreen({ route }: Props) {
  const { sessionId } = route.params;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { token } = useAuth();

  const { data: session, isLoading } = useQuery<SessionDetail>({
    queryKey: ["/api/sessions", sessionId],
    queryFn: async () => {
      const response = await fetch(
        new URL(`/api/sessions/${sessionId}`, getApiUrl()).href,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch session");
      return response.json();
    },
    enabled: !!token && !!sessionId,
  });

  if (isLoading || !session) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: headerHeight }]}>
          <ActivityIndicator size="large" color={theme.link} />
        </View>
      </ThemedView>
    );
  }

  const uniqueSpeakers = [
    ...new Set(session.utterances?.map((u) => u.speakerLabel) || []),
  ].sort();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        {/* Session Metadata */}
        <View style={[styles.metadataCard, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h4">{formatDate(session.createdAt)}</ThemedText>
          
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="globe" size={16} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {LANGUAGE_NAMES[session.sourceLanguage]} → {LANGUAGE_NAMES[session.targetLanguage]}
              </ThemedText>
            </View>
            <View style={styles.metaItem}>
              <Feather name="clock" size={16} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {formatDuration(session.duration || 0)}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Speaker Legend */}
        {uniqueSpeakers.length > 1 ? (
          <View style={styles.speakerLegend}>
            {uniqueSpeakers.map((speaker) => (
              <View key={speaker} style={styles.speakerLegendItem}>
                <View
                  style={[
                    styles.speakerDot,
                    { backgroundColor: getSpeakerColor(speaker) },
                  ]}
                />
                <ThemedText type="small">Speaker {speaker}</ThemedText>
              </View>
            ))}
          </View>
        ) : null}

        {/* Two Column Layout */}
        <View style={styles.columnsContainer}>
          <View style={styles.columnHeader}>
            <ThemedText type="h4" style={styles.columnTitle}>
              Original
            </ThemedText>
            <ThemedText type="h4" style={styles.columnTitle}>
              Translation
            </ThemedText>
          </View>

          {session.utterances && session.utterances.length > 0 ? (
            session.utterances.map((utterance) => (
              <View key={utterance.id} style={styles.utteranceRow}>
                {/* Original Column */}
                <View style={styles.utteranceColumn}>
                  <View style={styles.utteranceContent}>
                    <View
                      style={[
                        styles.speakerBar,
                        { backgroundColor: getSpeakerColor(utterance.speakerLabel) },
                      ]}
                    />
                    <View style={styles.utteranceTextContainer}>
                      <View style={styles.speakerBadgeSmall}>
                        <View
                          style={[
                            styles.speakerDotSmall,
                            { backgroundColor: getSpeakerColor(utterance.speakerLabel) },
                          ]}
                        />
                        <ThemedText
                          type="small"
                          style={{ color: getSpeakerColor(utterance.speakerLabel), fontSize: 11 }}
                        >
                          {utterance.speakerLabel}
                        </ThemedText>
                      </View>
                      <ThemedText
                        style={[
                          styles.utteranceText,
                          { opacity: getConfidenceOpacity(utterance.confidence) },
                        ]}
                      >
                        {utterance.originalText}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {/* Translation Column */}
                <View style={styles.utteranceColumn}>
                  <View style={styles.utteranceContent}>
                    <View
                      style={[
                        styles.speakerBar,
                        { backgroundColor: getSpeakerColor(utterance.speakerLabel) },
                      ]}
                    />
                    <View style={styles.utteranceTextContainer}>
                      <View style={styles.speakerBadgeSmall}>
                        <View
                          style={[
                            styles.speakerDotSmall,
                            { backgroundColor: getSpeakerColor(utterance.speakerLabel) },
                          ]}
                        />
                        <ThemedText
                          type="small"
                          style={{ color: getSpeakerColor(utterance.speakerLabel), fontSize: 11 }}
                        >
                          {utterance.speakerLabel}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.utteranceText}>
                        {utterance.translatedText}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.noContent}>
              <ThemedText style={{ color: theme.textSecondary }}>
                No transcription data available
              </ThemedText>
            </View>
          )}
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  metadataCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  metaRow: {
    flexDirection: "row",
    gap: Spacing.xl,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  speakerLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  speakerLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  speakerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  columnsContainer: {
    flex: 1,
  },
  columnHeader: {
    flexDirection: "row",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  columnTitle: {
    flex: 1,
  },
  utteranceRow: {
    flexDirection: "row",
    marginBottom: Spacing.lg,
  },
  utteranceColumn: {
    flex: 1,
    paddingHorizontal: Spacing.xs,
  },
  utteranceContent: {
    flexDirection: "row",
  },
  speakerBar: {
    width: 3,
    borderRadius: 1.5,
    marginRight: Spacing.sm,
  },
  utteranceTextContainer: {
    flex: 1,
  },
  speakerBadgeSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  speakerDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  utteranceText: {
    fontSize: 14,
    lineHeight: 20,
  },
  noContent: {
    padding: Spacing.xl,
    alignItems: "center",
  },
});
