import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, ChevronDown } from "lucide-react";
import { SCENES, isPlaying, loadPref, setVolume, startAmbient, stopAmbient, type Scene } from "@/lib/soundscape";
import { haptic } from "@/lib/celebrate";

/**
 * Tombol ambience audio. Selalu mulai dari mati — suaranya cuma nyala kalau
 * user sendiri yang mencet, dan pilihannya diingat buat kunjungan berikutnya.
 */
export function SoundControl({ className = "" }: { className?: string }) {
  const [on, setOn] = useState(false);
  const [scene, setScene] = useState<Scene>("tenang");
  const [vol, setVol] = useState(0.5);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pref = loadPref();
    setScene(pref.scene);
    setVol(pref.volume);
    setOn(isPlaying());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const toggle = async () => {
    haptic(10);
    if (on) {
      stopAmbient();
      setOn(false);
      setOpen(false);
      return;
    }
    const ok = await startAmbient(scene, vol);
    setOn(ok);
    if (ok) setOpen(true);
  };

  const pick = async (id: Scene) => {
    setScene(id);
    haptic(8);
    const ok = await startAmbient(id, vol);
    setOn(ok);
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="flex items-center gap-1 rounded-full bg-surface/70 p-1 backdrop-blur hairline">
        <button
          onClick={toggle}
          className={[
            "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition",
            on ? "bg-white/[0.08] text-gold" : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
          aria-pressed={on}
          aria-label={on ? "Matikan suara latar" : "Nyalakan suara latar"}
        >
          {on ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
          <span className="tracking-wide">{on ? SCENES.find((s) => s.id === scene)?.label : "Suara"}</span>
          {/* Tiga garis kecil yang naik-turun pas bunyi — indikator hidup tanpa teks. */}
          {on && (
            <span className="flex items-end gap-[2px]" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-[2px] rounded-full bg-gold animate-breathe"
                  style={{ height: 6 + i * 3, animationDuration: `${1.6 + i * 0.5}s` }}
                />
              ))}
            </span>
          )}
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          className="grid size-7 place-items-center rounded-full text-muted-foreground transition hover:text-foreground"
          aria-label="Pilihan suara"
          aria-expanded={open}
        >
          <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="animate-rise absolute bottom-full right-0 z-50 mb-2 w-60 rounded-2xl card-cinema p-3">
          <p className="mb-2 px-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Suasana
          </p>
          <div className="space-y-1">
            {SCENES.map((sc) => (
              <button
                key={sc.id}
                onClick={() => pick(sc.id)}
                className={[
                  "w-full rounded-xl px-3 py-2 text-left transition",
                  scene === sc.id && on ? "bg-white/[0.09]" : "hover:bg-white/[0.05]",
                ].join(" ")}
              >
                <p className={`text-sm ${scene === sc.id && on ? "text-gold" : ""}`}>{sc.label}</p>
                <p className="text-[11px] text-muted-foreground">{sc.hint}</p>
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 px-1 pb-1">
            <VolumeX className="size-3 shrink-0 text-muted-foreground" />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(vol * 100)}
              onChange={(e) => {
                const v = Number(e.target.value) / 100;
                setVol(v);
                setVolume(v);
              }}
              className="h-1 w-full appearance-none rounded-full bg-white/15 accent-[var(--gold)]"
              aria-label="Volume suara latar"
            />
            <Volume2 className="size-3 shrink-0 text-muted-foreground" />
          </div>
        </div>
      )}
    </div>
  );
}
