import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/ambience";

type Props = {
  children: ReactNode;
  /** Jeda tambahan (detik) buat efek stagger antar item. */
  delay?: number;
  className?: string;
  as?: ElementType;
};

/**
 * Munculin isi begitu masuk viewport, bukan cuma sekali pas mount. Bikin scroll
 * kerasa kayak halaman yang "kebangun" pelan-pelan, bukan tembok konten.
 */
export function Reveal({ children, delay = 0, className = "", as: Tag = "div" }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.06 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-shown={shown ? "true" : "false"}
      className={`reveal ${className}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </Tag>
  );
}
