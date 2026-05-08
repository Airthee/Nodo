import type { Theme } from './theme-types';

export const defaultTheme: Theme = {
  colors: {
    background: '#fafafa',
    surface: '#ffffff',
    primary: '#1a73e8',
    text: '#202124',
    textSecondary: '#5f6368',
    border: '#dadce0',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
  },
  typography: {
    title: { fontSize: 20 },
    body: { fontSize: 16 },
    caption: { fontSize: 14 },
  },
};
