"use client";

import { useEffect, useRef, useState } from "react";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function Reveal({ children, className = "", delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(
    () =>
      typeof window !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const element = ref.current;
    if (!element || visible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -8%" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      const progress = max > 0 ? scrollY / max : 0;
      if (ref.current) ref.current.style.transform = `scaleX(${progress})`;
    };
    const requestUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", requestUpdate, { passive: true });
    addEventListener("resize", requestUpdate);
    return () => {
      removeEventListener("scroll", requestUpdate);
      removeEventListener("resize", requestUpdate);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="scroll-progress" ref={ref} aria-hidden="true" />;
}

export function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion =
    typeof window !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [shown, setShown] = useState(() => (reducedMotion ? value : 0));

  useEffect(() => {
    const element = ref.current;
    if (!element || reducedMotion) return;
    let animationFrame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / 700);
        setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) animationFrame = requestAnimationFrame(tick);
      };
      animationFrame = requestAnimationFrame(tick);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, [reducedMotion, value]);

  return <span ref={ref}>{shown.toLocaleString()}</span>;
}
