/**
 * Soundscape — ambience audio yang dibangkitkan langsung di WebAudio, tanpa
 * file apa pun. Default-nya mati; cuma nyala kalau user yang ngidupin.
 */
import { useEffect } from "react";

export type Scene = "tenang" | "hujan" | "dalam";

export const SCENES: { id: Scene; label: string; hint: string }[] = [
  { id: "tenang", label: "Tenang", hint: "Pad hangat yang mengambang" },
  { id: "hujan", label: "Hujan", hint: "Gerimis jauh di balik jendela" },
  { id: "dalam", label: "Dalam", hint: "Dengung rendah, ruang luas" },
];

const STORE_KEY = "rayhan.soundscape";

type Saved = { on: boolean; scene: Scene; volume: number };

export function loadPref(): Saved {
  const fallback: Saved = { on: false, scene: "tenang", volume: 0.5 };
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<Saved>;
    return {
      on: !!p.on,
      scene: SCENES.some((s) => s.id === p.scene) ? (p.scene as Scene) : "tenang",
      volume: typeof p.volume === "number" ? Math.min(1, Math.max(0, p.volume)) : 0.5,
    };
  } catch {
    return fallback;
  }
}

function savePref(p: Saved) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(p));
  } catch {
    /* storage penuh / mode privat — nggak masalah, preferensinya cuma nggak diingat */
  }
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let nodes: { stop: () => void } | null = null;
let currentScene: Scene | null = null;
let volume = 0.5;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
  }
  return ctx;
}

/** Noise pink-ish — lebih adem di kuping dibanding white noise mentah. */
function noiseBuffer(ac: AudioContext, seconds = 4) {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buf;
}

function buildScene(ac: AudioContext, out: GainNode, scene: Scene) {
  const disposers: (() => void)[] = [];

  const lfo = (freq: number, depth: number, target: AudioParam, center: number) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.frequency.value = freq;
    gain.gain.value = depth;
    osc.connect(gain).connect(target);
    target.value = center;
    osc.start();
    disposers.push(() => { try { osc.stop(); } catch { /* sudah berhenti */ } osc.disconnect(); gain.disconnect(); });
  };

  const air = (cutoff: number, level: number, sweep: number) => {
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(ac);
    src.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.6;
    const gain = ac.createGain();
    gain.gain.value = level;
    src.connect(filter).connect(gain).connect(out);
    lfo(0.03 + Math.random() * 0.02, sweep, filter.frequency, cutoff);
    src.start();
    disposers.push(() => { try { src.stop(); } catch { /* sudah berhenti */ } src.disconnect(); filter.disconnect(); gain.disconnect(); });
  };

  const pad = (freq: number, level: number, detune: number) => {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    const gain = ac.createGain();
    gain.gain.value = level;
    osc.connect(filter).connect(gain).connect(out);
    // Tremolo super lambat — bikin nada-nya "bernapas", bukan datar.
    lfo(0.05 + Math.random() * 0.04, level * 0.45, gain.gain, level);
    osc.start();
    disposers.push(() => { try { osc.stop(); } catch { /* sudah berhenti */ } osc.disconnect(); filter.disconnect(); gain.disconnect(); });
  };

  if (scene === "tenang") {
    air(760, 0.16, 260);
    pad(110, 0.05, -4);
    pad(164.81, 0.032, 5);
    pad(220, 0.022, -7);
  } else if (scene === "hujan") {
    air(1900, 0.3, 700);
    air(420, 0.2, 160);
    pad(82.41, 0.028, 0);
  } else {
    air(280, 0.2, 90);
    pad(55, 0.07, -3);
    pad(82.41, 0.038, 4);
    pad(110, 0.02, 6);
  }

  return { stop: () => disposers.forEach((d) => d()) };
}

function targetGain() {
  return 0.55 * volume;
}

export async function startAmbient(scene: Scene, vol?: number) {
  const ac = audio();
  if (!ac || !master) return false;
  if (typeof vol === "number") volume = Math.min(1, Math.max(0, vol));
  if (ac.state === "suspended") await ac.resume();

  if (nodes && currentScene === scene) {
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.linearRampToValueAtTime(targetGain(), ac.currentTime + 1.2);
    savePref({ on: true, scene, volume });
    return true;
  }

  nodes?.stop();
  nodes = buildScene(ac, master, scene);
  currentScene = scene;
  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), ac.currentTime);
  // Fade-in panjang supaya suaranya "masuk" pelan, nggak nyeplak.
  master.gain.linearRampToValueAtTime(targetGain(), ac.currentTime + 2.4);
  savePref({ on: true, scene, volume });
  return true;
}

export function stopAmbient() {
  const pref = loadPref();
  savePref({ ...pref, on: false });
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(0.0001, now + 1.4);
  const dying = nodes;
  nodes = null;
  currentScene = null;
  setTimeout(() => dying?.stop(), 1600);
}

export function setVolume(v: number) {
  volume = Math.min(1, Math.max(0, v));
  const pref = loadPref();
  savePref({ ...pref, volume });
  if (ctx && master && nodes) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(targetGain(), ctx.currentTime + 0.25);
  }
}

export function isPlaying() {
  return nodes !== null;
}

/**
 * Denting lembut buat momen selesai. Sengaja cuma bunyi kalau ambience-nya lagi
 * nyala — biar app-nya nggak pernah tiba-tiba ngeluarin suara sendiri.
 */
export function chime(semitone = 0) {
  if (!nodes || !ctx || !master) return;
  const ac = ctx;
  const now = ac.currentTime;
  const base = 523.25 * Math.pow(2, semitone / 12);
  [1, 2, 3].forEach((partial, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = base * partial;
    const peak = (0.12 / (i + 1)) * volume;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8 + i * 0.4);
    osc.connect(gain).connect(master!);
    osc.start(now);
    osc.stop(now + 2.6);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  });
}

/**
 * Kalau kunjungan sebelumnya ambience-nya nyala, hidupin lagi — tapi baru
 * setelah user nyentuh layar. Browser emang melarang autoplay, dan lagi pula
 * app nggak boleh tiba-tiba bunyi sendiri begitu dibuka.
 */
export function useAmbientRestore() {
  useEffect(() => {
    const pref = loadPref();
    if (!pref.on || isPlaying()) return;

    const go = () => {
      void startAmbient(pref.scene, pref.volume);
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener("pointerdown", go);
      window.removeEventListener("keydown", go);
    };
    window.addEventListener("pointerdown", go, { once: true });
    window.addEventListener("keydown", go, { once: true });
    return cleanup;
  }, []);
}
