export class ChecklistItem {
  private constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly checked: boolean,
    public readonly addedAt: number,
  ) {}

  static create(id: string, label: string, options?: { checked?: boolean; addedAt?: number }): ChecklistItem {
    return new ChecklistItem(id, label.trim(), options?.checked ?? false, options?.addedAt ?? Date.now());
  }

  public toggle(): ChecklistItem {
    return new ChecklistItem(this.id, this.label, !this.checked, this.addedAt);
  }

  /** Returns an unchecked copy with a refreshed addedAt, keeping id and label. */
  public revive(addedAt = Date.now()): ChecklistItem {
    return new ChecklistItem(this.id, this.label, false, addedAt);
  }

  public withLabel(newLabel: string): ChecklistItem {
    return new ChecklistItem(this.id, newLabel.trim(), this.checked, this.addedAt);
  }
}
