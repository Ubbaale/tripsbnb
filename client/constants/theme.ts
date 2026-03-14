import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#0A0A0A",
    textSecondary: "#3D3D3D",
    buttonText: "#FFFFFF",
    tabIconDefault: "#5A5A5A",
    tabIconSelected: "#1A4D2E",
    link: "#1A4D2E",
    primary: "#1A4D2E",
    accent: "#DAA520",
    success: "#34C759",
    error: "#FF3B30",
    warning: "#FF9500",
    backgroundRoot: "#FAFAF8",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F5F5F3",
    backgroundTertiary: "#EEEEE9",
    border: "rgba(0,0,0,0.08)",
    cardShadow: "rgba(0,0,0,0.10)",
  },
  dark: {
    text: "#F8F8F8",
    textSecondary: "#C4C4C4",
    buttonText: "#FFFFFF",
    tabIconDefault: "#A0A0A0",
    tabIconSelected: "#7CB994",
    link: "#7CB994",
    primary: "#7CB994",
    accent: "#DAA520",
    success: "#30D158",
    error: "#FF453A",
    warning: "#FF9F0A",
    backgroundRoot: "#1C1C1E",
    backgroundDefault: "#2C2C2E",
    backgroundSecondary: "#3A3A3C",
    backgroundTertiary: "#48484A",
    border: "rgba(255,255,255,0.12)",
    cardShadow: "rgba(0,0,0,0.35)",
  },
};

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
  "6xl": 64,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  full: 9999,
};

export const Typography = {
  hero: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: "700" as const,
    fontFamily: "CormorantGaramond_700Bold",
    letterSpacing: 0,
  },
  h1: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "700" as const,
    fontFamily: "CormorantGaramond_700Bold",
    letterSpacing: 0,
  },
  h2: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700" as const,
    fontFamily: "CormorantGaramond_700Bold",
    letterSpacing: 0,
  },
  h3: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0,
  },
  h4: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500" as const,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500" as const,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0,
  },
  label: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0,
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

export const Shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHover: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.20,
    shadowRadius: 16,
    elevation: 10,
  },
  fab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  tile: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
};
