export type Theme = {
  colors: {
    background: string;
    surface: string;
    primary: string;
    text: string;
    textSecondary: string;
    border: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
  };
  typography: {
    title: { fontSize: number };
    body: { fontSize: number };
    caption: { fontSize: number };
  };
};
