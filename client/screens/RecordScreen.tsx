import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius, SpeakerColors } from "@/constants/theme";
import { RecordStackParamList } from "@/navigation/RecordStackNavigator";

type Props = {
  navigation: NativeStackNavigationProp<RecordStackParamList, "Record">;
};

interface TranslationChunk {
  speaker: string;
  text: string;
  originalText?: string;
  confidence?: number;
  startTime?: number;
  endTime?: number;
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

export default function RecordScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { token, user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState("es");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [translations, setTranslations] = useState<TranslationChunk[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);

  useEffect(() => {
    checkPermission();
    return () => {
      cleanupRecording();
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseScale.value = 1;
      pulseOpacity.value = 0.4;
    }
  }, [isRecording]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  async function checkPermission() {
    if (Platform.OS === "web") {
      try {
        const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
        // On web: granted = true, denied = false, prompt = true (will ask when recording)
        setPermissionGranted(result.state !== "denied");
      } catch {
        // If permissions API fails, assume we can try (will ask when recording starts)
        setPermissionGranted(true);
      }
    } else {
      const { status } = await Audio.requestPermissionsAsync();
      setPermissionGranted(status === "granted");
    }
  }

  function getWebSocketUrl(): string {
    const apiUrl = getApiUrl();
    const wsProtocol = apiUrl.startsWith("https") ? "wss" : "ws";
    const host = apiUrl.replace(/^https?:\/\//, "");
    return `${wsProtocol}://${host}/ws/transcribe`;
  }

  function cleanupRecording() {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }

  async function startRecording() {
    if (Platform.OS !== "web") {
      Alert.alert(
        "Web Only Feature",
        "Real-time streaming transcription is available in the web browser. Please open the app in your browser for live transcription."
      );
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsConnecting(true);
      setStatusMessage("Connecting...");
      setTranslations([]);

      // Create session first
      const sessionResponse = await fetch(new URL("/api/sessions", getApiUrl()).href, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceLanguage,
          targetLanguage,
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error("Failed to create session");
      }

      const session = await sessionResponse.json();
      setCurrentSessionId(session.id);

      // Connect to WebSocket
      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        // Authenticate
        ws.send(JSON.stringify({ type: "auth", token }));
      };

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "auth_success") {
            // Start transcription session
            ws.send(JSON.stringify({
              type: "start",
              sessionId: session.id,
              sourceLanguage,
              targetLanguage,
              userId: user?.id,
            }));
          }

          if (message.type === "ready") {
            setStatusMessage("Listening...");
            setIsConnecting(false);
            setIsRecording(true);
            recordingStartTimeRef.current = Date.now();
            
            // Start capturing audio
            await startAudioCapture();
          }

          if (message.type === "translation") {
            const newChunk: TranslationChunk = {
              speaker: message.speaker || "A",
              text: message.translatedText,
              originalText: message.originalText,
              confidence: message.confidence,
              startTime: message.startTime,
              endTime: message.endTime,
            };
            setTranslations(prev => [...prev, newChunk]);
            
            // Auto-scroll to bottom
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }

          if (message.type === "error") {
            console.error("Server error:", message.message);
            setStatusMessage(`Error: ${message.message}`);
            setIsConnecting(false);
          }

          if (message.type === "stopped") {
            console.log("Transcription stopped");
          }
        } catch (e) {
          console.error("Error parsing WebSocket message:", e);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setStatusMessage("Connection error");
        setIsConnecting(false);
        cleanupRecording();
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        setIsRecording(false);
        setIsConnecting(false);
      };

    } catch (error) {
      console.error("Failed to start recording:", error);
      setStatusMessage("Failed to start");
      setIsConnecting(false);
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  }

  async function startAudioCapture() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          // Convert float32 to int16
          const int16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          wsRef.current.send(int16Data.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setPermissionGranted(true);
    } catch (error) {
      console.error("Failed to capture audio:", error);
      Alert.alert("Microphone Error", "Could not access microphone. Please check permissions.");
    }
  }

  async function stopRecording() {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Stop audio capture
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Send stop message to server
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "stop" }));
        wsRef.current.close();
      }
      wsRef.current = null;

      setIsRecording(false);
      setStatusMessage("");

      // Finalize session with collected translations
      if (currentSessionId && translations.length > 0) {
        const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        
        await fetch(new URL(`/api/sessions/${currentSessionId}/finalize`, getApiUrl()).href, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            duration,
            utterances: translations.map((t, i) => ({
              speaker: t.speaker,
              originalText: t.originalText || t.text,
              translatedText: t.text,
              confidence: t.confidence,
              startTime: t.startTime || i * 5000,
              endTime: t.endTime || (i + 1) * 5000,
            })),
          }),
        });
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
    }
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

  function openLanguageSelector() {
    navigation.navigate("LanguageSelector", {
      sourceLanguage,
      targetLanguage,
      onSelect: (source: string, target: string) => {
        setSourceLanguage(source);
        setTargetLanguage(target);
      },
    });
  }

  if (permissionGranted === null) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.centerContent, { paddingTop: headerHeight }]}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (permissionGranted === false) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.centerContent, { paddingTop: headerHeight }]}>
          <Feather name="mic-off" size={48} color={theme.textSecondary} />
          <ThemedText type="h3" style={styles.permissionTitle}>
            Microphone Access Required
          </ThemedText>
          <ThemedText style={[styles.permissionText, { color: theme.textSecondary }]}>
            LiveTranslate needs microphone access to record and transcribe speech.
          </ThemedText>
          <Pressable
            onPress={checkPermission}
            style={[styles.permissionButton, { backgroundColor: theme.link }]}
          >
            <ThemedText style={{ color: "#FFFFFF" }}>Enable Microphone</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const hasTranslations = translations.length > 0;
  const isActive = isRecording || isConnecting;

  return (
    <ThemedView style={styles.container}>
      {/* Language Badge */}
      <Pressable
        onPress={openLanguageSelector}
        style={({ pressed }) => [
          styles.languageBadge,
          {
            backgroundColor: theme.backgroundDefault,
            top: headerHeight + Spacing.md,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
        disabled={isActive}
        testID="button-language-selector"
      >
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {LANGUAGE_NAMES[sourceLanguage] || sourceLanguage}
        </ThemedText>
        <Feather name="arrow-right" size={14} color={theme.textSecondary} />
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {LANGUAGE_NAMES[targetLanguage] || targetLanguage}
        </ThemedText>
        <Feather name="chevron-down" size={14} color={theme.textSecondary} />
      </Pressable>

      {/* Main Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing["4xl"],
            paddingBottom: 100 + tabBarHeight + Spacing.xl,
          },
        ]}
        onContentSizeChange={() => {
          if (hasTranslations) {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }
        }}
      >
        {!hasTranslations && !isActive ? (
          <View style={styles.emptyState}>
            <Image
              source={require("../../assets/images/microphone-start.png")}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <ThemedText type="h3" style={styles.emptyTitle}>
              Ready to Translate
            </ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              {Platform.OS === "web" 
                ? "Tap the record button to start live transcription and translation"
                : "Open in browser for real-time transcription"}
            </ThemedText>
          </View>
        ) : isActive && !hasTranslations ? (
          <View style={styles.recordingState}>
            <View style={styles.recordingIndicator}>
              <View style={[styles.recordingDot, { backgroundColor: theme.error }]} />
              <ThemedText type="body" style={{ color: theme.error }}>
                {isConnecting ? "Connecting..." : "Listening..."}
              </ThemedText>
            </View>
            <ThemedText style={[styles.recordingHint, { color: theme.textSecondary }]}>
              {statusMessage || "Speak clearly. Translations will appear as you speak."}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.translationsContainer}>
            {translations.map((chunk, index) => (
              <View key={index} style={styles.translationRow}>
                <View
                  style={[
                    styles.speakerBar,
                    { backgroundColor: getSpeakerColor(chunk.speaker) },
                  ]}
                />
                <View style={styles.translationContent}>
                  <View style={styles.speakerBadge}>
                    <View
                      style={[
                        styles.speakerDot,
                        { backgroundColor: getSpeakerColor(chunk.speaker) },
                      ]}
                    />
                    <ThemedText
                      type="small"
                      style={{ color: getSpeakerColor(chunk.speaker) }}
                    >
                      Speaker {chunk.speaker}
                    </ThemedText>
                  </View>
                  <ThemedText
                    style={[
                      styles.translationText,
                      { opacity: getConfidenceOpacity(chunk.confidence) },
                    ]}
                  >
                    {chunk.text}
                  </ThemedText>
                </View>
              </View>
            ))}
            {isRecording && (
              <View style={styles.listeningIndicator}>
                <View style={[styles.listeningDot, { backgroundColor: theme.link }]} />
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Listening for more...
                </ThemedText>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Record Button */}
      <View
        style={[
          styles.recordButtonContainer,
          { bottom: tabBarHeight + Spacing.xl },
        ]}
      >
        {isActive && (
          <Animated.View
            style={[
              styles.recordButtonPulse,
              { backgroundColor: theme.error },
              pulseStyle,
            ]}
          />
        )}
        <Pressable
          onPress={isActive ? stopRecording : startRecording}
          style={({ pressed }) => [
            styles.recordButton,
            {
              backgroundColor: isActive ? theme.error : theme.text,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
          disabled={isConnecting}
          testID="button-record"
        >
          <Feather
            name={isActive ? "square" : "mic"}
            size={32}
            color="#FFFFFF"
          />
        </Pressable>
        <ThemedText type="small" style={[styles.recordLabel, { color: theme.textSecondary }]}>
          {isConnecting ? "Connecting..." : isRecording ? "Tap to stop" : "Tap to record"}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  languageBadge: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    zIndex: 10,
    alignSelf: "center",
    maxWidth: 300,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
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
  recordingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  recordingHint: {
    textAlign: "center",
    maxWidth: 280,
  },
  translationsContainer: {
    gap: Spacing.lg,
  },
  translationRow: {
    flexDirection: "row",
  },
  speakerBar: {
    width: 4,
    borderRadius: 2,
    marginRight: Spacing.md,
  },
  translationContent: {
    flex: 1,
  },
  speakerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  speakerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  translationText: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: "500",
  },
  listeningIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordButtonContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  recordButtonPulse: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    top: -8,
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  recordLabel: {
    marginTop: Spacing.sm,
  },
  permissionTitle: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  permissionText: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    maxWidth: 280,
  },
  permissionButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
  },
});
