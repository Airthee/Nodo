import { AddItemUseCase } from '@application/use-cases/add-item';
import { CreateChecklistUseCase } from '@application/use-cases/create-checklist';
import { DeleteChecklistUseCase } from '@application/use-cases/delete-checklist';
import { GetChecklistUseCase } from '@application/use-cases/get-checklist';
import { ListChecklistsUseCase } from '@application/use-cases/list-checklists';
import { RemoveItemUseCase } from '@application/use-cases/remove-item';
import { SaveChecklistUseCase } from '@application/use-cases/save-checklist';
import { ToggleItemUseCase } from '@application/use-cases/toggle-item';
import { UpdateItemUseCase } from '@application/use-cases/update-item';
import type { ChecklistStoragePort } from '@application/ports/storage-port';
import { AsyncStorageAdapter } from '@infrastructure/storage/async-storage-adapter';
import React, { createContext, useContext, useMemo } from 'react';

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

function createChecklistActions(storage: ChecklistStoragePort): ChecklistContextValue {
  return {
    listChecklists: new ListChecklistsUseCase(storage),
    getChecklist: new GetChecklistUseCase(storage),
    saveChecklist: new SaveChecklistUseCase(storage),
    deleteChecklist: new DeleteChecklistUseCase(storage),
    createChecklist: new CreateChecklistUseCase(storage),
    toggleItem: new ToggleItemUseCase(storage),
    addItem: new AddItemUseCase(storage),
    removeItem: new RemoveItemUseCase(storage),
    updateItem: new UpdateItemUseCase(storage),
  };
}

// Single app-wide adapter: it owns the write queue and the in-memory cache.
const defaultActions = createChecklistActions(new AsyncStorageAdapter());

const ChecklistContext = createContext<ChecklistContextValue | null>(null);

/** Provides the checklist use cases; `storage` overrides the AsyncStorage default (e.g. in tests). */
export function ChecklistProvider({
  children,
  storage,
}: {
  children: React.ReactNode;
  storage?: ChecklistStoragePort;
}) {
  const value = useMemo(() => (storage ? createChecklistActions(storage) : defaultActions), [storage]);
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
