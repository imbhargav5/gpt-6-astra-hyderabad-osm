import { placeCategories } from "./place-categories";

export function wrapCategory(index: number) {
  return (
    ((index % placeCategories.length) + placeCategories.length) %
    placeCategories.length
  );
}

export function categoryShortcut(key: string, current: number): number | null {
  if (key === "ArrowRight") return wrapCategory(current + 1);
  if (key === "ArrowLeft") return wrapCategory(current - 1);
  return /^[0-9]$/.test(key) ? wrapCategory(Number(key) - 1) : null;
}

export function nextPlaceIndex(
  current: number,
  count: number,
  direction: 1 | -1,
): number | null {
  if (count === 0) return null;
  if (current < 0) return direction === 1 ? 0 : count - 1;
  return (current + direction + count) % count;
}
