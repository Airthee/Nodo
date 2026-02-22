import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/presentation/theme/ThemeContext';
import { ChecklistProvider } from './src/presentation/context/ChecklistContext';
import { ChecklistListScreen } from './src/presentation/screens/ChecklistListScreen';
import { ChecklistDetailScreen } from './src/presentation/screens/ChecklistDetailScreen';

enum Screen {
  List = 'list',
  Detail = 'detail',
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(Screen.List);
  const [selectedChecklistId, setSelectedChecklistId] = useState<string | null>(null);

  const handleSelectChecklist = (id: string) => {
    setSelectedChecklistId(id);
    setScreen(Screen.Detail);
  };

  const handleBack = () => {
    setScreen(Screen.List);
    setSelectedChecklistId(null);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ChecklistProvider>
          <StatusBar style="dark" />
          {screen === Screen.List && (
            <ChecklistListScreen onSelectChecklist={handleSelectChecklist} />
          )}
          {screen === Screen.Detail && selectedChecklistId && (
            <ChecklistDetailScreen
              checklistId={selectedChecklistId}
              onBack={handleBack}
            />
          )}
          </ChecklistProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
