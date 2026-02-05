import { Platform } from "react-native";

// Design guidelines colors
export const Colors = {
  light: {
    text: "#1A1A1A",
    textSecondary: "#6B7280",
    textDisabled: "#9CA3AF",
    buttonText: "#FFFFFF",
    tabIconDefault: "#6B7280",
    tabIconSelected: "#1A1A1A",
    link: "#2563EB",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F8F9FA",
    backgroundSecondary: "#F0F1F3",
    backgroundTertiary: "#E5E7EB",
    border: "#E5E7EB",
    // Semantic colors
    success: "#059669",
    warning: "#F59E0B",
    error: "#DC2626",
    info: "#2563EB",
    // Speaker accent colors
    speaker1: "#2563EB",
    speaker2: "#DC2626",
    speaker3: "#059669",
    speaker4: "#7C3AED",
    speaker5: "#EA580C",
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#9CA3AF",
    textDisabled: "#6B7280",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: "#ECEDEE",
    link: "#3B82F6",
    backgroundRoot: "#1A1A1A",
    backgroundDefault: "#2A2C2E",
    backgroundSecondary: "#353739",
    backgroundTertiary: "#404244",
    border: "#404244",
    // Semantic colors
    success: "#10B981",
    warning: "#FBBF24",
    error: "#EF4444",
    info: "#3B82F6",
    // Speaker accent colors
    speaker1: "#3B82F6",
    speaker2: "#EF4444",
    speaker3: "#10B981",
    speaker4: "#8B5CF6",
    speaker5: "#F97316",
  },
};

export const SpeakerColors = [
  Colors.light.speaker1,
  Colors.light.speaker2,
  Colors.light.speaker3,
  Colors.light.speaker4,
  Colors.light.speaker5,
];

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  translation: {
    fontSize: 24,
    lineHeight: 36,
    fontWeight: "500" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
