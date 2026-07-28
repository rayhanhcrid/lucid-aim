import confetti from "canvas-confetti";

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/** Getaran singkat ala haptic di HP. Diabaikan di device yang tidak mendukung. */
export function haptic(pattern: number | number[] = 12) {
  if (typeof navigator === "undefined") return;
  if (reducedMotion()) return;
  navigator.vibrate?.(pattern);
}

const TEAL = ["#00b3b0", "#37d0c4", "#0a7f86", "#b8ece6", "#ffffff"];

export function celebrate(intensity: "small" | "big" = "small") {
  if (typeof window === "undefined" || reducedMotion()) return;
  const base = {
    colors: TEAL,
    disableForReducedMotion: true,
    scalar: 0.9,
    zIndex: 70,
  } as const;

  if (intensity === "small") {
    confetti({ ...base, particleCount: 45, spread: 62, startVelocity: 28, origin: { y: 0.7 } });
    return;
  }

  confetti({ ...base, particleCount: 110, spread: 90, startVelocity: 42, origin: { y: 0.65 } });
  setTimeout(
    () => confetti({ ...base, particleCount: 70, spread: 120, angle: 60, origin: { x: 0, y: 0.7 } }),
    180,
  );
  setTimeout(
    () => confetti({ ...base, particleCount: 70, spread: 120, angle: 120, origin: { x: 1, y: 0.7 } }),
    300,
  );
}