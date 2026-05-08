import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { Checklist } from '../../domain/checklist';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from '../../i18n';
import { styles } from './ChecklistCard.style';

type Props = {
  checklist: Checklist;
  onPress: () => void;
  onLongPress?: () => void;
};

export function ChecklistCard({ checklist, onPress, onLongPress }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const uncheckedCount = checklist.items.filter((i) => !i.checked).length;
  const total = checklist.items.length;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.title, { color: theme.colors.text, ...theme.typography.title }]}>
        {checklist.name}
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary, ...theme.typography.caption }]}>
        {total === 0 ? t('card.noItems') : t('card.remaining', { count: uncheckedCount, total })}
      </Text>
    </TouchableOpacity>
  );
}


