/** Categorical slots from the validated palette (fixed order, never cycled). */
export const slotVar = (slot: number) => (slot >= 1 && slot <= 8 ? `var(--s${slot})` : 'var(--ink-3)')
export const slotSoft = (slot: number) =>
  slot >= 1 && slot <= 8 ? `color-mix(in oklab, var(--s${slot}) 16%, transparent)` : 'var(--surface-2)'
export const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8]
