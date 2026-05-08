import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ScrollView } from 'react-native';
import type { ChecklistItem } from '../../domain/checklist-item';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from '../../i18n';
import { styles } from './AddItemInput.style';

type Props = {
  checkedItemLabels: string[];
  onSubmit: (label: string) => void;
  placeholder?: string;
};

export function AddItemInput({
  checkedItemLabels,
  onSubmit,
  placeholder,
}: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const resolvedPlaceholder = placeholder ?? t('addItem.placeholder');

  const q = value.trim().toLowerCase();
  const suggestions = !q
    ? []
    : checkedItemLabels.filter((label) => label.toLowerCase().includes(q));

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  };

  const handleSuggestionPress = (label: string) => {
    onSubmit(label);
    setValue('');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inputRow, { borderColor: theme.colors.border }]}>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.text,
              ...theme.typography.body,
              borderColor: theme.colors.border,
            },
          ]}
          value={value}
          onChangeText={setValue}
          placeholder={resolvedPlaceholder}
          placeholderTextColor={theme.colors.textSecondary}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          blurOnSubmit={false}
        />
      </View>
      {suggestions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestions}
          contentContainerStyle={styles.suggestionsContent}
        >
          {suggestions.map((label) => (
            <TouchableOpacity
              key={label}
              style={[
                styles.chip,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => handleSuggestionPress(label)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: theme.colors.primary, ...theme.typography.caption },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}


