import { useEffect, useState } from "react";

/**
 * Panduan napas 4-2-6: tarik 4 detik, tahan 2, buang 6, lalu jeda.
 * Fase buangnya sengaja lebih panjang dari tariknya — itu yang bikin sistem
 * saraf turun, bukan sekadar animasi lingkaran yang membesar-mengecil.
 */
export type BreathPhase = {
  key: "in" | "hold" | "out" | "rest";
  label: string;
  ms: number;
  scale: number;
};

export const BREATH_CYCLE: BreathPhase[] = [
  { key: "in", label: "Tarik napas", ms: 4000, scale: 1.34 },
  { key: "hold", label: "Tahan", ms: 2000, scale: 1.34 },
  { key: "out", label: "Buang pelan", ms: 6000, scale: 0.8 },
  { key: "rest", label: "Diam sebentar", ms: 1500, scale: 0.8 },
];

export function useBreath(active: boolean) {
  const [index, setIndex] = useState(0);
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      setCycles(0);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    let i = 0;
    const step = () => {
      timer = setTimeout(() => {
        i = (i + 1) % BREATH_CYCLE.length;
        setIndex(i);
        if (i === 0) setCycles((c) => c + 1);
        step();
      }, BREATH_CYCLE[i].ms);
    };
    step();
    return () => clearTimeout(timer);
  }, [active]);

  return { phase: BREATH_CYCLE[index], cycles };
}
