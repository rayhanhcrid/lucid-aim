import { useEffect, useRef } from "react";

/**
 * Ambience — helper buat latar aplikasi: parallax dan sorot kursor.
 */

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Parallax halus dari pointer (desktop) atau gyro (HP). Nilainya ditulis ke
 * CSS var di elemen target, jadi nggak ada re-render React sama sekali.
 */
export function useParallax<T extends HTMLElement>(strength = 18) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;
    let alive = true;

    const loop = () => {
      if (!alive) return;
      // Kejar target pelan-pelan — gerakannya jadi kayak ada massanya.
      cx += (tx - cx) * 0.055;
      cy += (ty - cy) * 0.055;
      el.style.setProperty("--px", `${cx.toFixed(2)}px`);
      el.style.setProperty("--py", `${cy.toFixed(2)}px`);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onPointer = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * -2 * strength;
      ty = (e.clientY / window.innerHeight - 0.5) * -2 * strength;
    };
    const onScroll = () => {
      ty = -window.scrollY * 0.045;
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      tx = Math.max(-1, Math.min(1, e.gamma / 35)) * -strength;
      ty = Math.max(-1, Math.min(1, (e.beta - 45) / 45)) * -strength;
    };

    const fine = window.matchMedia?.("(pointer: fine)").matches;
    if (fine) {
      window.addEventListener("pointermove", onPointer, { passive: true });
    } else {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("deviceorientation", onOrient);
    }

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("deviceorientation", onOrient);
    };
  }, [strength]);

  return ref;
}

/**
 * Sorot cahaya yang ngikut kursor di elemen ber-class `.spotlight`.
 * Satu listener global buat seluruh app — nggak ada state React yang ikut gerak.
 */
export function useSpotlight() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) return;

    let raf = 0;
    let pending: PointerEvent | null = null;
    let last: HTMLElement | null = null;

    const apply = () => {
      raf = 0;
      const e = pending;
      pending = null;
      if (!e) return;
      const target = (e.target as Element | null)?.closest?.(".spotlight") as HTMLElement | null;
      if (target !== last) last = target;
      if (!target) return;
      const r = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(2)}%`);
      target.style.setProperty("--my", `${(((e.clientY - r.top) / r.height) * 100).toFixed(2)}%`);
    };

    const onMove = (e: PointerEvent) => {
      pending = e;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}
