import type { Map } from "maplibre-gl";

/** Desktop orbit controls, leaving native touch gestures intact. */
export function installMouseOrbit(map: Map, onInteract: () => void) {
  const canvas = map.getCanvas();
  const surface = map.getCanvasContainer();
  let drag: {
    x: number;
    y: number;
    pan: boolean;
    moved: boolean;
    buttonMask: number;
  } | null = null;
  let suppressClick = false;
  let spaceHeld = false;

  const down = (event: MouseEvent) => {
    if ((event.target as Element).closest("button, a, input")) return;
    if (event.button !== 0 && event.button !== 2) return;
    if (event.button === 0 && map.getPitch() <= 10) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    canvas.focus();
    map.stop();
    suppressClick = false;
    drag = {
      x: event.clientX,
      y: event.clientY,
      pan: event.button === 2 || event.shiftKey || spaceHeld,
      buttonMask: event.button === 2 ? 2 : 1,
      moved: false,
    };
  };
  const move = (event: MouseEvent) => {
    if (!drag) return;
    if (!(event.buttons & drag.buttonMask)) {
      end();
      return;
    }
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 3) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!drag.moved) onInteract();
    drag.moved = true;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (drag.pan) {
      map.panBy([-dx, -dy], { duration: 0 }, { originalEvent: event });
    } else {
      map.jumpTo(
        {
          bearing: map.getBearing() + dx * 0.35,
          // Keep an orbit gesture in 3D; the explicit 2D button flattens the map.
          pitch: Math.max(
            11,
            Math.min(map.getMaxPitch(), map.getPitch() - dy * 0.3),
          ),
        },
        { originalEvent: event },
      );
    }
  };
  const end = () => {
    if (drag) suppressClick = drag.moved;
    drag = null;
  };
  const click = (event: MouseEvent) => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const keyDown = (event: KeyboardEvent) => {
    if (event.code !== "Space") return;
    // Preserve typing and keyboard activation in the surrounding interface.
    if (
      event.target instanceof Element &&
      event.target.closest(
        'input, textarea, select, button, a, [contenteditable]:not([contenteditable="false"])',
      )
    )
      return;
    spaceHeld = true;
    event.preventDefault();
  };
  const keyUp = (event: KeyboardEvent) => {
    if (event.code === "Space") spaceHeld = false;
  };
  const blur = () => {
    spaceHeld = false;
    end();
  };
  const contextMenu = (event: MouseEvent) => event.preventDefault();
  surface.addEventListener("contextmenu", contextMenu);
  surface.addEventListener("mousedown", down, true);
  surface.addEventListener("click", click, true);
  window.addEventListener("mousemove", move, true);
  window.addEventListener("mouseup", end, true);
  window.addEventListener("blur", blur);
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  return () => {
    surface.removeEventListener("contextmenu", contextMenu);
    surface.removeEventListener("mousedown", down, true);
    surface.removeEventListener("click", click, true);
    window.removeEventListener("mousemove", move, true);
    window.removeEventListener("mouseup", end, true);
    window.removeEventListener("blur", blur);
    window.removeEventListener("keydown", keyDown);
    window.removeEventListener("keyup", keyUp);
  };
}
