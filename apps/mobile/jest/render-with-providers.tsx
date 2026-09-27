import { render } from '@testing-library/react-native';
import React from 'react';
import type { ChecklistStoragePort } from '@application/ports/storage-port';
import { ChecklistProvider } from '@presentation/context/ChecklistContext';
import { ThemeProvider } from '@presentation/theme/ThemeContext';

/** Renders `ui` inside the app providers, backed by the given storage instead of AsyncStorage. */
export function renderWithProviders(ui: React.ReactElement, { storage }: { storage: ChecklistStoragePort }) {
  return render(
    <ThemeProvider>
      <ChecklistProvider storage={storage}>{ui}</ChecklistProvider>
    </ThemeProvider>,
  );
}
