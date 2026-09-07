import { useEffect, useLayoutEffect, useRef } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
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
        event.metaKey
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
        inTabs && !event.shiftKey && event.key === "Home"
          ? 0
          : inTabs && !event.shiftKey && event.key === "End"
            ? placeCategories.length - 1
            : categoryShortcut(event.key, active, event.shiftKey);
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
  const userScrolling = useRef(false);
  const activeRef = useRef(active);
  const onChangeRef = useRef(onChange);
  activeRef.current = active;
  onChangeRef.current = onChange;
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function normalizeScroll() {
    const row = tabs.current;
    if (!row) return;
    const groups = row.querySelectorAll<HTMLElement>(".category-tab-cycle");
    const height = groups[1].offsetTop - groups[0].offsetTop;
    if (!height) return;
    // All five copies are identical: move back to the middle without changing
    // the visible pixels, keeping a full runway in both directions.
    const center = row.scrollTop + row.clientHeight / 2;
    const cycle = Math.floor((center - groups[0].offsetTop) / height);
    if (cycle !== 2) row.scrollTop += (2 - cycle) * height;
  }

  useLayoutEffect(() => {
    const row = tabs.current;
    const button = buttons.current[active];
    if (!row || !button || userScrolling.current) return;
    normalizeScroll();
    const groups = row.querySelectorAll<HTMLElement>(".category-tab-cycle");
    const height = groups[1].offsetTop - groups[0].offsetTop;
    const canonical =
      groups[2].offsetTop +
      button.offsetTop -
      row.clientHeight / 2 +
      button.offsetHeight / 2;
    const target =
      canonical + Math.round((row.scrollTop - canonical) / height) * height;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    row.scrollTo({
      top: initialized.current ? target : canonical,
      behavior: !initialized.current || reduce ? "instant" : "smooth",
    });
    initialized.current = true;
  }, [active]);

  useEffect(() => {
    const row = tabs.current;
    if (!row) return;
    const beginSwipe = () => {
      userScrolling.current = true;
    };
    const onScroll = () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      const groups = row.querySelectorAll<HTMLElement>(".category-tab-cycle");
      const height = groups[1].offsetTop - groups[0].offsetTop;
      if (row.scrollTop < height / 2 || row.scrollTop > height * 3.5)
        normalizeScroll();
      if (userScrolling.current) {
        const center = row.scrollTop + row.clientHeight / 2;
        let closest = activeRef.current;
        let distance = Infinity;
        groups.forEach((group) => {
          [
            ...group.querySelectorAll<HTMLButtonElement>("[role='tab']"),
          ].forEach((button, index) => {
            const delta = Math.abs(
              group.offsetTop +
                button.offsetTop +
                button.offsetHeight / 2 -
                center,
            );
            if (delta < distance) {
              distance = delta;
              closest = index;
            }
          });
        });
        if (closest !== activeRef.current) {
          activeRef.current = closest;
          onChangeRef.current(closest);
        }
      }
      scrollTimer.current = setTimeout(() => {
        userScrolling.current = false;
        normalizeScroll();
      }, 180);
    };
    row.addEventListener("scroll", onScroll, { passive: true });
    row.addEventListener("wheel", beginSwipe, { passive: true });
    row.addEventListener("touchstart", beginSwipe, { passive: true });
    return () => {
      row.removeEventListener("scroll", onScroll);
      row.removeEventListener("wheel", beginSwipe);
      row.removeEventListener("touchstart", beginSwipe);
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
            title="Previous category (Shift + ↑)"
            aria-keyshortcuts="Shift+ArrowUp"
            onClick={() => onChange(wrapCategory(active - 1))}
          >
            <ChevronUp size={15} />
          </button>
          <button
            type="button"
            aria-label="Next category"
            title="Next category (Shift + ↓)"
            aria-keyshortcuts="Shift+ArrowDown"
            onClick={() => onChange(wrapCategory(active + 1))}
          >
            <ChevronDown size={15} />
          </button>
        </div>
      </div>
      <div
        ref={tabs}
        className="category-tabs"
        role="tablist"
        aria-label="Place categories"
        aria-orientation="vertical"
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
        <span>Shift + ↑ ↓ categories</span>
        <span>↑ ↓ places</span>
      </p>
    </section>
  );
}
