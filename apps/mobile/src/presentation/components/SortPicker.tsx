import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ItemSortOrder } from '../utils/sort-items';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from '../../i18n';

type Props = {
  value: ItemSortOrder;
  onChange: (order: ItemSortOrder) => void;
};

const SORT_KEYS: Record<ItemSortOrder, string> = {
  lastAdded: 'sort.lastAdded',
  alphabetical: 'sort.alphabetical',
};

export function SortPicker({ value, onChange }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {(Object.keys(SORT_KEYS) as ItemSortOrder[]).map((sortValue) => (
        <TouchableOpacity
          key={sortValue}
          style={[
            styles.option,
            {
              backgroundColor: value === sortValue ? theme.colors.primary : theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => onChange(sortValue)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.optionText,
              {
                color: value === sortValue ? '#fff' : theme.colors.text,
                ...theme.typography.caption,
              },
            ]}
          >
            {t(SORT_KEYS[sortValue])}
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
