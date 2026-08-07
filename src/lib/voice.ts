/** Perekam suara sederhana: menangkap PCM lalu membungkusnya jadi WAV 16kHz mono. */

function encodeWav(chunks: Float32Array[], sampleRate: number, targetRate = 16000): Blob {
  const length = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Float32Array(length);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }

  const ratio = sampleRate / targetRate;
  const outLength = Math.max(1, Math.floor(merged.length / ratio));
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    out[i] = merged[Math.min(merged.length - 1, Math.floor(i * ratio))] ?? 0;
  }

  const buffer = new ArrayBuffer(44 + out.length * 2);
  const view = new DataView(buffer);
  const writeStr = (pos: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(pos + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + out.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, out.length * 2, true);
  for (let i = 0; i < out.length; i++) {
    const s = Math.max(-1, Math.min(1, out[i] ?? 0));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export type Recorder = {
  stop: () => Promise<Blob>;
  level: () => number;
};

export type RecordOptions = {
  /** Dipanggil sekali saat terdeteksi hening cukup lama setelah ada suara. */
  onSilence?: () => void;
  /** Berapa lama hening (ms) sebelum dianggap selesai bicara. */
  silenceMs?: number;
};

export async function startRecording(options: RecordOptions = {}): Promise<Recorder> {
  const { onSilence, silenceMs = 1800 } = options;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  });
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  const source = ctx.createMediaStreamSource(stream);
  const node = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  let level = 0;
  let spoke = false;
  let silenceSince: number | null = null;
  let silenceFired = false;

  node.onaudioprocess = (e) => {
    const data = e.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(data));
    let sum = 0;
    let peak = 0;
    for (let i = 0; i < data.length; i += 32) {
      const v = Math.abs(data[i] ?? 0);
      sum += v;
      if (v > peak) peak = v;
    }
    const rms = sum / (data.length / 32);
    level = Math.min(1, rms * 6);

    // Ambang hening: pakai kombinasi rata-rata & puncak supaya napas/noise
    // pelan tidak dianggap bicara.
    const speaking = rms > 0.012 || peak > 0.06;
    const now = Date.now();
    if (speaking) {
      spoke = true;
      silenceSince = null;
      return;
    }
    if (!spoke || silenceFired) return;
    if (silenceSince === null) silenceSince = now;
    else if (now - silenceSince >= silenceMs) {
      silenceFired = true;
      onSilence?.();
    }
  };
  source.connect(node);
  node.connect(ctx.destination);

  return {
    level: () => level,
    stop: async () => {
      node.disconnect();
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      const rate = ctx.sampleRate;
      await ctx.close();
      return encodeWav(chunks, rate);
    },
  };
}

// ---------------------------------------------------------------- dikte lokal

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function speechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Dikte langsung di perangkat — tidak butuh API key maupun server. */
export function dictationSupported() {
  return speechRecognitionCtor() !== null;
}

export type Dictation = { stop: () => void; cancel: () => void };

/**
 * Merekam sekali ucapan lalu mengembalikan teksnya. Berhenti sendiri begitu
 * kamu diam sejenak, sama seperti perilaku perekam sebelumnya.
 */
export function startDictation(handlers: {
  onText: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
  lang?: string;
}): Dictation {
  const Ctor = speechRecognitionCtor();
  if (!Ctor) {
    handlers.onError("Dikte tidak didukung browser ini.");
    handlers.onEnd();
    return { stop: () => {}, cancel: () => {} };
  }

  const rec = new Ctor();
  rec.lang = handlers.lang ?? "id-ID";
  rec.continuous = false; // berhenti otomatis setelah jeda bicara
  rec.interimResults = true;

  let finalText = "";
  let failed = false;
  let cancelled = false;

  rec.onresult = (e) => {
    finalText = "";
    for (let i = 0; i < e.results.length; i++) {
      const result = e.results[i];
      if (result?.isFinal) finalText += result[0]?.transcript ?? "";
    }
  };

  rec.onerror = (e) => {
    failed = true;
    const message =
      e.error === "not-allowed" || e.error === "service-not-allowed"
        ? "Mikrofon belum diizinkan. Aktifkan dulu di pengaturan browser ya."
        : e.error === "no-speech"
          ? "Belum ada suara yang terdengar. Coba rekam ulang."
          : e.error === "network"
            ? "Butuh koneksi internet untuk mengubah suara jadi teks."
            : "Gagal mengubah suara jadi teks.";
    handlers.onError(message);
  };

  rec.onend = () => {
    if (!cancelled && !failed) {
      const text = finalText.trim();
      if (text) handlers.onText(text);
      else handlers.onError("Belum ada suara yang terdengar. Coba rekam ulang.");
    }
    handlers.onEnd();
  };

  try {
    rec.start();
  } catch {
    failed = true;
    handlers.onError("Dikte sedang dipakai proses lain. Coba lagi sebentar.");
    handlers.onEnd();
  }

  return {
    stop: () => rec.stop(),
    cancel: () => {
      cancelled = true;
      rec.abort();
    },
  };
}

export async function transcribe(blob: Blob): Promise<string> {
  const body = new FormData();
  body.append("audio", blob, "recording.wav");
  const res = await fetch("/api/transcribe", { method: "POST", body });
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
  if (!res.ok) throw new Error(data.error || "Gagal mengubah suara jadi teks.");
  return data.text ?? "";
}