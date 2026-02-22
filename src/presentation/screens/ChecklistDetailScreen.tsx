import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Checklist } from '../../domain/checklist';
import { useChecklistActions } from '../context/ChecklistContext';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from '../../i18n';
import { ChecklistItemRow } from '../components/ChecklistItemRow';
import { AddItemInput } from '../components/AddItemInput';
import { SortPicker } from '../components/SortPicker';
import { sortChecklistItems, type ItemSortOrder } from '../utils/sort-items';
import { generateId } from '../../application/utils/id';
import { ChecklistItem } from '@domain/checklist-item';
import { styles } from './ChecklistDetailScreen.style';

type Props = {
  checklistId: string;
  onBack: () => void;
};

export function ChecklistDetailScreen({ checklistId, onBack }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const {
    getChecklist,
    toggleItem: toggleItemAction,
    addItem: addItemAction,
    removeItem: removeItemAction,
    updateItem: updateItemAction,
  } = useChecklistActions();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [sortOrder, setSortOrder] = useState<ItemSortOrder>('lastAdded');

  async function load() {
    const data = await getChecklist.execute(checklistId);
    setChecklist(data);
  }

  useEffect(() => {
    load();
  }, [checklistId, getChecklist]);

  async function handleToggle(itemId: string) {
    const next = await toggleItemAction.execute(checklistId, itemId);
    if (next) setChecklist(next);
  }

  async function handleAddItem(label: string) {
    const item = ChecklistItem.create(generateId(), label, { checked: false });
    const next = await addItemAction.execute(checklistId, item);
    if (next) setChecklist(next);
  }

  async function handleRemoveItem(itemId: string) {
    const next = await removeItemAction.execute(checklistId, itemId);
    if (next) setChecklist(next);
  }

  async function handleUpdateItemLabel(itemId: string, newLabel: string) {
    const next = await updateItemAction.execute(checklistId, itemId, newLabel);
    if (next) setChecklist(next);
  }

  if (!checklist) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <Text style={{ color: theme.colors.textSecondary }}>{t('detailScreen.loading')}</Text>
      </SafeAreaView>
    );
  }

  const checkedLabels = checklist.items.filter((i) => i.checked).map((i) => i.label);
  const sortedItems = sortChecklistItems(checklist.items, sortOrder);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border, flexDirection: 'row', justifyContent: 'space-between' }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[styles.backText, { color: theme.colors.primary }]}>{t('detailScreen.back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text, ...theme.typography.title }]} numberOfLines={1}>
          {checklist.name}
        </Text>
      </View>
      <View style={styles.content}>
        <AddItemInput
          checkedItemLabels={checkedLabels}
          onSubmit={handleAddItem}
        />
        <SortPicker value={sortOrder} onChange={setSortOrder} />
        <FlatList
          data={sortedItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChecklistItemRow
              item={item}
              onToggle={() => handleToggle(item.id)}
              onDelete={() => handleRemoveItem(item.id)}
              onEditLabel={(newLabel) => handleUpdateItemLabel(item.id, newLabel)}
            />
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
              {t('detailScreen.empty')}
            </Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}


