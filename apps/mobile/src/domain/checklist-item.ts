export class ChecklistItem {
  private constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly checked: boolean,
    public readonly addedAt: number,
    public readonly checkedAt?: number,
  ) {}

  static create(
    id: string,
    label: string,
    options?: { checked?: boolean; addedAt?: number; checkedAt?: number },
  ): ChecklistItem {
    const checked = options?.checked ?? false;
    return new ChecklistItem(id, label.trim(), checked, options?.addedAt ?? Date.now(), checked ? options?.checkedAt : undefined);
  }

  /** Flips the checked state, stamping checkedAt when checking and clearing it when unchecking. */
  public toggle(at = Date.now()): ChecklistItem {
    const checked = !this.checked;
    return new ChecklistItem(this.id, this.label, checked, this.addedAt, checked ? at : undefined);
  }

  /** Returns an unchecked copy with a refreshed addedAt, keeping id and label. */
  public revive(addedAt = Date.now()): ChecklistItem {
    return new ChecklistItem(this.id, this.label, false, addedAt);
  }

  public withLabel(newLabel: string): ChecklistItem {
    return new ChecklistItem(this.id, newLabel.trim(), this.checked, this.addedAt, this.checkedAt);
  }
}
