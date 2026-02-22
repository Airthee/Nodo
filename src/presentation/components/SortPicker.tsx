import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ItemSortOrder } from '../utils/sort-items';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  value: ItemSortOrder;
  onChange: (order: ItemSortOrder) => void;
};

const OPTIONS: { value: ItemSortOrder; label: string }[] = [
  { value: 'lastAdded', label: 'Derniers ajoutés' },
  { value: 'alphabetical', label: 'Alphabétique' },
];

export function SortPicker({ value, onChange }: Props) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.option,
            {
              backgroundColor: value === opt.value ? theme.colors.primary : theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => onChange(opt.value)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.optionText,
              {
                color: value === opt.value ? '#fff' : theme.colors.text,
                ...theme.typography.caption,
              },
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionText: {},
});
