import { describe, expect, it } from '@jest/globals';
import { screen, userEvent } from '@testing-library/react-native';
import React from 'react';
import { InMemoryStorage } from '@application/test-helpers/in-memory-storage';
import { Checklist } from '@domain/checklist';
import { ChecklistItem } from '@domain/checklist-item';
import { renderWithProviders } from '../../../jest/render-with-providers';
import { ChecklistDetailScreen } from './ChecklistDetailScreen';

const LIST_ID = 'groceries';

async function openGroceries(items: ChecklistItem[] = []) {
  const storage = new InMemoryStorage([Checklist.create(LIST_ID, 'Groceries', { items, createdAt: 1 })]);
  await renderWithProviders(<ChecklistDetailScreen checklistId={LIST_ID} onBack={() => {}} />, { storage });
  const input = await screen.findByPlaceholderText('Add an item');
  return { storage, input, user: userEvent.setup() };
}

// The main list only renders unchecked rows and the checked section only checked ones,
// so the checkbox state tells which of the two a row lives in.
const inMainList = (label: string) => screen.findByRole('checkbox', { name: label, checked: false });
const checkedSectionHeader = (count: number) =>
  screen.getByRole('button', { name: new RegExp(`^Checked items \\(${count}\\)`) });

describe('Checklist detail journeys', () => {
  it('adds a typed item to the list when submitted and clears the input', async () => {
    const { storage, input, user } = await openGroceries();
    expect(screen.getByText('No items. Add one above.')).toBeOnTheScreen();

    await user.type(input, 'Milk', { submitEditing: true });

    expect(await inMainList('Milk')).toBeOnTheScreen();
    expect(input).toHaveDisplayValue('');
    expect(screen.queryByText('No items. Add one above.')).not.toBeOnTheScreen();
    const saved = await storage.getById(LIST_ID);
    expect(saved?.items.map((item) => item.label)).toEqual(['Milk']);
  });

  it('ignores a blank submission', async () => {
    const { storage, input, user } = await openGroceries();

    await user.type(input, '   ', { submitEditing: true });

    expect(screen.queryByRole('checkbox')).not.toBeOnTheScreen();
    expect(storage.writes).toBe(0);
  });

  it('moves a checked item into the collapsed checked section', async () => {
    const { user } = await openGroceries([ChecklistItem.create('milk', 'Milk', { addedAt: 10 })]);

    await user.press(await inMainList('Milk'));

    expect(await screen.findByRole('button', { name: /^Checked items \(1\)/ })).toBeCollapsed();
    expect(screen.queryByRole('checkbox', { name: 'Milk' })).not.toBeOnTheScreen();

    await user.press(checkedSectionHeader(1));

    expect(checkedSectionHeader(1)).toBeExpanded();
    expect(screen.getByRole('checkbox', { name: 'Milk' })).toBeChecked();
  });

  it('brings an unchecked item back to the main list', async () => {
    const { user } = await openGroceries([
      ChecklistItem.create('milk', 'Milk', { checked: true, addedAt: 10 }),
      ChecklistItem.create('eggs', 'Eggs', { checked: true, addedAt: 20 }),
    ]);
    await user.press(checkedSectionHeader(2));

    await user.press(screen.getByRole('checkbox', { name: 'Milk', checked: true }));

    expect(await inMainList('Milk')).toBeOnTheScreen();
    expect(checkedSectionHeader(1)).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: 'Eggs' })).toBeChecked();
  });

  it('suggests a checked item matching the typed text and re-adds it when pressed', async () => {
    const { storage, input, user } = await openGroceries([
      ChecklistItem.create('milk', 'Milk', { checked: true, addedAt: 10 }),
      ChecklistItem.create('mint', 'Mint', { checked: true, addedAt: 20 }),
    ]);

    await user.type(input, 'mil');

    expect(screen.getByRole('button', { name: 'Milk' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Mint' })).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Milk' }));

    expect(await inMainList('Milk')).toBeOnTheScreen();
    expect(input).toHaveDisplayValue('');
    expect(screen.queryByRole('button', { name: 'Milk' })).not.toBeOnTheScreen();
    const saved = await storage.getById(LIST_ID);
    expect(saved?.items).toHaveLength(2);
  });

  it('only suggests checked items, and re-submitting an unchecked label does not duplicate it', async () => {
    const { storage, input, user } = await openGroceries([ChecklistItem.create('milk', 'Milk', { addedAt: 10 })]);

    await user.type(input, 'Mil');

    expect(screen.queryByRole('button', { name: 'Milk' })).not.toBeOnTheScreen();

    await user.type(input, 'k', { submitEditing: true });

    expect(await inMainList('Milk')).toBeOnTheScreen();
    expect(screen.getAllByRole('checkbox', { name: 'Milk' })).toHaveLength(1);
    const saved = await storage.getById(LIST_ID);
    expect(saved?.items).toHaveLength(1);
  });
});
