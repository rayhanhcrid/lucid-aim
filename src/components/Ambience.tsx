import { useEffect, useRef } from "react";
import { prefersReducedMotion, useParallax } from "@/lib/ambience";

/**
 * Lapisan latar aplikasi: aurora yang hanyut, debu cahaya, dan vignette.
 * Dipasang sekali di __root supaya animasinya nggak pernah restart pas pindah
 * halaman — inilah yang bikin app-nya kerasa satu ruangan, bukan tumpukan page.
 */
export function Ambience() {
  const ref = useParallax<HTMLDivElement>(22);

  return (
    <div className="aurora" aria-hidden="true" ref={ref}>
      <div className="aurora-layer" style={{ "--depth": 1.6 } as React.CSSProperties}>
        <div className="aurora-blob aurora-a" />
      </div>
      <div className="aurora-layer" style={{ "--depth": 1.1 } as React.CSSProperties}>
        <div className="aurora-blob aurora-b" />
      </div>
      <div className="aurora-layer" style={{ "--depth": 0.55 } as React.CSSProperties}>
        <div className="aurora-blob aurora-c" />
      </div>
      <div className="aurora-layer" style={{ "--depth": 2.1 } as React.CSSProperties}>
        <div className="aurora-blob aurora-d" />
      </div>
      <DustField />
      <div className="ambient-vignette" />
    </div>
  );
}

type Mote = { x: number; y: number; z: number; r: number; drift: number; phase: number; speed: number };

/**
 * Debu cahaya yang melayang pelan. Berhenti sendiri kalau tab-nya nggak
 * kelihatan, dan mati total kalau user minta reduced motion.
 */
function DustField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion()) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let motes: Mote[] = [];
    let raf = 0;
    let t = 0;
    let running = true;

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const area = w * h;
      const count = Math.round(Math.min(90, Math.max(26, area / 26000)));
      motes = Array.from({ length: count }, () => {
        const z = 0.25 + Math.random() * 0.75;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          z,
          r: 0.5 + z * 1.7,
          drift: (Math.random() - 0.5) * 0.16,
          phase: Math.random() * Math.PI * 2,
          speed: (0.1 + Math.random() * 0.22) * z,
        };
      });
    };

    // Canvas2D baru ngerti oklch di browser yang agak baru — kalau nggak, pakai hsl.
    ctx.fillStyle = "#000";
    ctx.fillStyle = "oklch(0.9 0.08 190 / 0.5)";
    const supportsOklch = ctx.fillStyle !== "#000000";

    const accentHue = 190;
    const density = 0.7;

    const draw = () => {
      if (!running) return;
      t += 1;
      ctx.clearRect(0, 0, w, h);
      const visible = Math.round(motes.length * density);
      for (let i = 0; i < visible; i++) {
        const m = motes[i];
        m.y -= m.speed;
        m.x += m.drift + Math.sin((t * 0.004 + m.phase) * 0.9) * 0.12;
        if (m.y < -6) {
          m.y = h + 6;
          m.x = Math.random() * w;
        }
        if (m.x < -6) m.x = w + 6;
        if (m.x > w + 6) m.x = -6;

        const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.012 + m.phase));
        const alpha = twinkle * (0.1 + m.z * 0.24);
        ctx.beginPath();
        ctx.fillStyle = supportsOklch
          ? `oklch(0.9 0.08 ${accentHue} / ${alpha.toFixed(3)})`
          : `hsla(${accentHue.toFixed(0)}, 60%, 82%, ${alpha.toFixed(3)})`;
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    build();
    raf = requestAnimationFrame(draw);

    const onResize = () => build();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(draw);
      }
    };
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="dust-field" />;
}
