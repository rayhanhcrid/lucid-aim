import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { startRecording, transcribe, type Recorder } from "@/lib/voice";
import { haptic } from "@/lib/celebrate";

type Status = "idle" | "recording" | "working";

/** Tombol kecil untuk merekam suara lalu menempelkan hasil teksnya. */
export function VoiceInput({
  onText,
  label = "Rekam suara",
}: {
  onText: (text: string) => void;
  label?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const recorder = useRef<Recorder | null>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      void recorder.current?.stop();
    };
  }, []);

  const tick = () => {
    setLevel(recorder.current?.level() ?? 0);
    raf.current = requestAnimationFrame(tick);
  };

  async function begin() {
    setError(null);
    try {
      recorder.current = await startRecording();
      setStatus("recording");
      haptic();
      raf.current = requestAnimationFrame(tick);
    } catch {
      setError("Mikrofon belum diizinkan. Aktifkan dulu di pengaturan browser ya.");
    }
  }

  async function finish() {
    if (!recorder.current) return;
    if (raf.current) cancelAnimationFrame(raf.current);
    setStatus("working");
    haptic();
    try {
      const blob = await recorder.current.stop();
      recorder.current = null;
      if (blob.size < 2048) {
        setError("Rekamannya kependekan. Coba bicara sebentar lagi.");
        setStatus("idle");
        return;
      }
      const text = await transcribe(blob);
      if (text) onText(text);
      else setError("Belum ada suara yang terdengar. Coba rekam ulang.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengubah suara jadi teks.");
    } finally {
      setStatus("idle");
      setLevel(0);
    }
  }

  const recording = status === "recording";

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-[11px] text-muted-foreground">{error}</span>}
      {recording && (
        <span className="flex items-end gap-0.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-0.5 rounded-full bg-gold transition-[height] duration-100"
              style={{ height: `${6 + level * 14 * (i === 1 ? 1.4 : 1)}px` }}
            />
          ))}
        </span>
      )}
      <button
        type="button"
        onClick={recording ? finish : begin}
        disabled={status === "working"}
        aria-label={recording ? "Selesai merekam" : label}
        title={recording ? "Selesai merekam" : label}
        className={[
          "grid size-8 shrink-0 place-items-center rounded-full transition active:scale-95",
          recording
            ? "bg-gold text-white animate-pulse-glow"
            : "bg-white/[0.06] text-muted-foreground hairline hover:text-foreground",
        ].join(" ")}
      >
        {status === "working" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : recording ? (
          <Square className="size-3" fill="currentColor" />
        ) : (
          <Mic className="size-3.5" />
        )}
      </button>
    </div>
  );
}