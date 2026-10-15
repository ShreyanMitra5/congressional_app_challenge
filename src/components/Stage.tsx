"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { STAGE_H, STAGE_W } from "@/lib/theme";

/**
 * Every screen is laid out on a fixed 390 x 844 dp canvas and the whole
 * canvas is scaled to fit the viewport. Positions therefore stay identical
 * on every device, which the measurement depends on.
 */
export function Stage({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function fit() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(vw / STAGE_W, vh / STAGE_H);
      setScale(s);
      setOffset({ x: (vw - STAGE_W * s) / 2, y: (vh - STAGE_H * s) / 2 });
    }
    fit();
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-night">
      <div
        style={{
          position: "absolute",
          left: offset.x,
          top: offset.y,
          width: STAGE_W,
          height: STAGE_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          overflow: "hidden",
          borderRadius: scale < 1 ? 28 : 0,
          boxShadow: scale < 1 ? "0 30px 80px rgba(0,0,0,0.45)" : undefined,
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Absolute-positioned box on the stage. */
export function At({
  x,
  y,
  w,
  h,
  children,
  style,
  className,
  center,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  /** when true, (x, y) is the centre of the box */
  center?: boolean;
}) {
  const left = center && w != null ? x - w / 2 : x;
  const top = center && h != null ? y - h / 2 : y;
  return (
    <div
      className={className}
      style={{ position: "absolute", left, top, width: w, height: h, ...style }}
    >
      {children}
    </div>
  );
}
