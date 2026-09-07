import { bind, play, setEnabled, setVolume } from "cuelume";

const SOUND_KEY = "hyderabad-atlas:sound-enabled:v1";
let lastSliderTick = -Infinity;

export function playSliderTick() {
  const now = performance.now();
  if (now - lastSliderTick < 100) return;
  lastSliderTick = now;
  play("tick", { volume: 0.8 });
}

export function readSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "false";
  } catch {
    return true;
  }
}

export function initializeSounds() {
  setVolume(0.9);
  setEnabled(readSoundEnabled());
  bind(document.getElementById("root")!);
}

export function changeSoundEnabled(enabled: boolean) {
  setEnabled(enabled);
  try {
    window.localStorage.setItem(SOUND_KEY, String(enabled));
  } catch {
    // Sound controls still work when browser storage is unavailable.
  }
  if (enabled) play("toggle");
}
