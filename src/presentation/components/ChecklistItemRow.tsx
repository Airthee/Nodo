import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { ChecklistItem as ChecklistItemType } from '../../domain/checklist-item';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from '../../i18n';

type Props = {
  item: ChecklistItemType;
  onToggle: () => void;
  onDelete: () => void;
  onEditLabel: (newLabel: string) => void;
};

export function ChecklistItemRow({ item, onToggle, onDelete, onEditLabel }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [editVisible, setEditVisible] = useState(false);
  const [draftLabel, setDraftLabel] = useState(item.label);

  const openEdit = () => {
    setDraftLabel(item.label);
    setEditVisible(true);
  };

  const saveEdit = () => {
    const trimmed = draftLabel.trim();
    if (trimmed.length > 0 && trimmed !== item.label) {
      onEditLabel(trimmed);
    }
    setEditVisible(false);
  };

  return (
    <>
      <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={onToggle}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: theme.colors.border,
                backgroundColor: item.checked ? theme.colors.primary : 'transparent',
              },
            ]}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.labelTouch} onPress={openEdit} activeOpacity={0.7}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.text,
                ...theme.typography.body,
                textDecorationLine: item.checked ? 'line-through' : 'none',
                opacity: item.checked ? 0.7 : 1,
              },
            ]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={[styles.deleteButton, { borderColor: theme.colors.border }]}
          activeOpacity={0.6}
        >
          <Text style={[styles.deleteIcon, { color: theme.colors.textSecondary }]}>×</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={editVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalCenter}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
            >
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {t('itemRow.editLabelTitle')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    ...theme.typography.body,
                  },
                ]}
                value={draftLabel}
                onChangeText={setDraftLabel}
                placeholder={t('itemRow.labelPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                autoFocus
                selectTextOnFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { borderColor: theme.colors.border }]}
                  onPress={() => setEditVisible(false)}
                >
                  <Text style={{ color: theme.colors.textSecondary }}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: theme.colors.primary }]}
                  onPress={saveEdit}
                >
                  <Text style={styles.modalButtonPrimaryText}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 12,
  },
  labelTouch: {
    flex: 1,
  },
  label: {},
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteIcon: {
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCenter: {
    justifyContent: 'center',
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalButtonPrimary: {},
  modalButtonPrimaryText: {
    color: '#fff',
    fontWeight: '600',
  },
});
