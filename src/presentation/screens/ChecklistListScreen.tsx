import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Checklist } from '../../domain/checklist';
import { useChecklistActions } from '../context/ChecklistContext';
import { useTheme } from '../theme/ThemeContext';
import { ChecklistCard } from '../components/ChecklistCard';
import { styles } from './ChecklistListScreen.style';

type Props = {
  onSelectChecklist: (id: string) => void;
};

export function ChecklistListScreen({ onSelectChecklist }: Props) {
  const { theme } = useTheme();
  const { listChecklists, createChecklist, deleteChecklist } = useChecklistActions();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');

  async function load() {
    const list = await listChecklists.execute();
    setChecklists(list);
  }

  useEffect(() => {
    load();
  }, [listChecklists]);

  const handleAddChecklist = async () => {
    const name = newName.trim();
    if (!name) return;
    await createChecklist.execute(name);
    setNewName('');
    setModalVisible(false);
    load();
  };

  const handleLongPress = (checklist: Checklist) => {
    Alert.alert(
      'Supprimer',
      `Supprimer la liste « ${checklist.name} » ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteChecklist.execute(checklist.id);
            load();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text, ...theme.typography.title }]}>
          Mes listes
        </Text>
      </View>
      <FlatList
        data={checklists}
        keyExtractor={(c) => c.id}
        contentContainerStyle={[styles.list, checklists.length === 0 && styles.listEmpty]}
        renderItem={({ item }) => (
          <ChecklistCard
            checklist={item}
            onPress={() => onSelectChecklist(item.id)}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text
              style={[
                styles.emptyStateText,
                { color: theme.colors.textSecondary, ...theme.typography.body },
              ]}
            >
              Aucune liste pour le moment, cliquez sur + pour créer votre première liste
            </Text>
          </View>
        }
      />
      <View style={styles.fabContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Nouvelle liste
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  ...theme.typography.body,
                },
              ]}
              value={newName}
              onChangeText={setNewName}
              placeholder="Nom de la liste"
              placeholderTextColor={theme.colors.textSecondary}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: theme.colors.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: theme.colors.text }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleAddChecklist}
              >
                <Text style={styles.modalButtonPrimaryText}>Créer</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}


