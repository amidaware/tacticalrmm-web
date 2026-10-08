import type { AgentMenuLayout } from "./types";

// saved order first; items missing from it (e.g. added in a newer version)
// are inserted right after their nearest default predecessor
export function orderedIds(layout: AgentMenuLayout, ids: string[]): string[] {
  const known = new Set(ids);
  const result: string[] = [];
  for (const id of layout.order ?? []) {
    if (known.has(id) && !result.includes(id)) result.push(id);
  }

  ids.forEach((id, index) => {
    if (result.includes(id)) return;
    let position = 0;
    for (let j = index - 1; j >= 0; j--) {
      const placed = result.indexOf(ids[j]);
      if (placed !== -1) {
        position = placed + 1;
        break;
      }
    }
    result.splice(position, 0, id);
  });

  return result;
}

export function visibleIds(layout: AgentMenuLayout, ids: string[]): string[] {
  const hidden = new Set(layout.hidden ?? []);
  return orderedIds(layout, ids).filter((id) => !hidden.has(id));
}

export function layoutFromRows(
  rows: { id: string; visible: boolean }[],
): AgentMenuLayout {
  return {
    order: rows.map((row) => row.id),
    hidden: rows.filter((row) => !row.visible).map((row) => row.id),
  };
}
