import { Platform } from 'react-native';

const tintColor = '#DC2626';

export const Colors = {
  light: {
    text: '#0F172A',
    subtext: '#64748B',
    background: '#F8FAFC',
    card: '#FFFFFF',
    border: '#E2E8F0',
    tint: tintColor,
    primary: '#DC2626',
    secondary: '#B91C1C',
    accent: '#DC2626',
    blue: '#2563EB',
    purple: '#7C3AED',
    yellow: '#D97706',
    sale: '#DC2626',
    badge: '#FEF2F2',
    badgeText: '#DC2626',
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColor,
  },
  dark: {
    // Keep White & Red theme even if device is in dark mode
    text: '#0F172A',
    subtext: '#64748B',
    background: '#F8FAFC',
    card: '#FFFFFF',
    border: '#E2E8F0',
    tint: tintColor,
    primary: '#DC2626',
    secondary: '#B91C1C',
    accent: '#DC2626',
    blue: '#2563EB',
    purple: '#7C3AED',
    yellow: '#D97706',
    sale: '#DC2626',
    badge: '#FEF2F2',
    badgeText: '#DC2626',
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColor,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'system-ui',
    mono: 'monospace',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
});
