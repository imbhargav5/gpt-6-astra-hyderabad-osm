import { useEffect, useLayoutEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { placeCategories, type Category } from "./place-categories";
import { categoryShortcut, wrapCategory } from "./category-navigation";

export function CategoryPicker({
  active,
  onChange,
  counts,
}: {
  active: number;
  onChange: (index: number) => void;
  counts: Record<Category, number>;
}) {
  const tabs = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='slider'], [role='textbox']",
        )
      )
        return;
      const inTabs = target instanceof Node && tabs.current?.contains(target);
      const next =
        inTabs && event.key === "Home"
          ? 0
          : inTabs && event.key === "End"
            ? placeCategories.length - 1
            : categoryShortcut(event.key, active);
      if (next === null) return;
      event.preventDefault();
      event.stopPropagation();
      onChange(next);
      if (inTabs) buttons.current[next]?.focus({ preventScroll: true });
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [active, onChange]);

  const initialized = useRef(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function normalizeScroll() {
    const row = tabs.current;
    if (!row) return;
    const groups = row.querySelectorAll<HTMLElement>(".category-tab-cycle");
    const width = groups[1].offsetLeft - groups[0].offsetLeft;
    if (!width) return;
    // All five copies are identical: move back to the middle without changing
    // the visible pixels, keeping a full runway in both directions.
    const center = row.scrollLeft + row.clientWidth / 2;
    const cycle = Math.floor((center - groups[0].offsetLeft) / width);
    if (cycle !== 2) row.scrollLeft += (2 - cycle) * width;
  }

  useLayoutEffect(() => {
    const row = tabs.current;
    const button = buttons.current[active];
    if (!row || !button) return;
    normalizeScroll();
    const groups = row.querySelectorAll<HTMLElement>(".category-tab-cycle");
    const width = groups[1].offsetLeft - groups[0].offsetLeft;
    const canonical =
      groups[2].offsetLeft +
      button.offsetLeft -
      row.clientWidth / 2 +
      button.offsetWidth / 2;
    const target =
      canonical + Math.round((row.scrollLeft - canonical) / width) * width;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    row.scrollTo({
      left: initialized.current ? target : canonical,
      behavior: !initialized.current || reduce ? "instant" : "smooth",
    });
    initialized.current = true;
  }, [active]);

  useEffect(() => {
    const row = tabs.current;
    if (!row) return;
    const onScroll = () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      const groups = row.querySelectorAll<HTMLElement>(".category-tab-cycle");
      const width = groups[1].offsetLeft - groups[0].offsetLeft;
      if (row.scrollLeft < width / 2 || row.scrollLeft > width * 3.5)
        normalizeScroll();
      scrollTimer.current = setTimeout(normalizeScroll, 150);
    };
    row.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      row.removeEventListener("scroll", onScroll);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  return (
    <section className="category-picker" aria-label="Browse categories">
      <div className="category-heading">
        <span>
          CATEGORIES <small>{active + 1} / 10</small>
        </span>
        <div>
          <button
            type="button"
            aria-label="Previous category"
            title="Previous category (←)"
            onClick={() => onChange(wrapCategory(active - 1))}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            aria-label="Next category"
            title="Next category (→)"
            onClick={() => onChange(wrapCategory(active + 1))}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
      <div
        ref={tabs}
        className="category-tabs"
        role="tablist"
        aria-label="Place categories"
        aria-orientation="horizontal"
      >
        {[0, 1, 2, 3, 4].map((cycle) => (
          <div
            className="category-tab-cycle"
            key={cycle}
            role="presentation"
            aria-hidden={cycle !== 2 ? true : undefined}
          >
            {placeCategories.map((category, index) => (
              <button
                key={category}
                ref={(element) => {
                  if (cycle === 2) buttons.current[index] = element;
                }}
                id={cycle === 2 ? `category-tab-${index}` : undefined}
                type="button"
                role="tab"
                aria-selected={active === index}
                aria-controls="category-places"
                aria-keyshortcuts={String((index + 1) % 10)}
                title={`Press ${(index + 1) % 10} to select ${category}`}
                tabIndex={cycle === 2 && active === index ? 0 : -1}
                onMouseDown={(event) => {
                  if (cycle !== 2) event.preventDefault();
                }}
                onClick={() => onChange(index)}
              >
                <kbd>NUM {(index + 1) % 10}</kbd>
                <span>{category}</span>
                <small>{counts[category]}</small>
              </button>
            ))}
          </div>
        ))}
      </div>
      <p className="category-hint">
        <span>Press 1–9, 0 · ← → to cycle</span>
        <span>↑ ↓ places</span>
      </p>
    </section>
  );
}
