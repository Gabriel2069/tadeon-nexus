export class SelectionManager {
  private selected = new Set<string>();

  get ids() {
    return [...this.selected];
  }

  has(id: string) {
    return this.selected.has(id);
  }

  select(id: string, additive = false) {
    if (!additive) this.selected.clear();
    if (additive && this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
  }

  replace(ids: Iterable<string>) {
    this.selected = new Set(ids);
  }

  clear() {
    this.selected.clear();
  }

  prune(validIds: Iterable<string>) {
    const valid = new Set(validIds);
    this.selected = new Set(this.ids.filter((id) => valid.has(id)));
  }
}
