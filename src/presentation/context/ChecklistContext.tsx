import { AddItemUseCase } from '@application/use-cases/add-item';
import { CreateChecklistUseCase } from '@application/use-cases/create-checklist';
import { DeleteChecklistUseCase } from '@application/use-cases/delete-checklist';
import { GetChecklistUseCase } from '@application/use-cases/get-checklist';
import { ListChecklistsUseCase } from '@application/use-cases/list-checklists';
import { RemoveItemUseCase } from '@application/use-cases/remove-item';
import { SaveChecklistUseCase } from '@application/use-cases/save-checklist';
import { ToggleItemUseCase } from '@application/use-cases/toggle-item';
import { UpdateItemUseCase } from '@application/use-cases/update-item';
import { AsyncStorageAdapter } from '@infrastructure/storage/async-storage-adapter';
import React, { createContext, useContext } from 'react';

const storage = new AsyncStorageAdapter();

const listChecklists = new ListChecklistsUseCase(storage);
const getChecklist = new GetChecklistUseCase(storage);
const saveChecklist = new SaveChecklistUseCase(storage);
const deleteChecklist = new DeleteChecklistUseCase(storage);
const createNewChecklist = new CreateChecklistUseCase(storage);
const toggleItem = new ToggleItemUseCase(storage);
const addItem = new AddItemUseCase(storage);
const removeItem = new RemoveItemUseCase(storage);
const updateItem = new UpdateItemUseCase(storage);

type ChecklistContextValue = {
  listChecklists: ListChecklistsUseCase;
  getChecklist: GetChecklistUseCase;
  saveChecklist: SaveChecklistUseCase;
  deleteChecklist: DeleteChecklistUseCase;
  createChecklist: CreateChecklistUseCase;
  toggleItem: ToggleItemUseCase;
  addItem: AddItemUseCase;
  removeItem: RemoveItemUseCase;
  updateItem: UpdateItemUseCase;
};

const ChecklistContext = createContext<ChecklistContextValue | null>(null);

export function ChecklistProvider({ children }: { children: React.ReactNode }) {
  const value: ChecklistContextValue = {
    listChecklists,
    getChecklist,
    saveChecklist,
    deleteChecklist,
    createChecklist: createNewChecklist,
    toggleItem,
    addItem,
    removeItem,
    updateItem,
  };
  return (
    <ChecklistContext.Provider value={value}>
      {children}
    </ChecklistContext.Provider>
  );
}

export function useChecklistActions(): ChecklistContextValue {
  const ctx = useContext(ChecklistContext);
  if (!ctx) throw new Error('useChecklistActions must be used within ChecklistProvider');
  return ctx;
}
