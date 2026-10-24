"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { STAGE_H, STAGE_W } from "@/lib/theme";

/**
 * Games keep their fixed reference canvas. Menus use normal document flow
 * so shorter screens and larger text can scroll instead of shrinking.
 */
export function Stage({ children, style, scrollable = false }: { children: ReactNode; style?: CSSProperties; scrollable?: boolean }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (scrollable || !viewport.current) return;
    const area = viewport.current;
    function fit() {
      setScale(Math.min(area.clientWidth / STAGE_W, area.clientHeight / STAGE_H));
    }
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(area);
    return () => observer.disconnect();
  }, [scrollable]);

  if (scrollable) {
    return (
      <div className="app-stage app-stage--scrollable">
        <div className="app-stage__flow" style={style}>{children}</div>
      </div>
    );
  }

  return (
    <div className="app-stage">
      <div ref={viewport} className="app-stage__viewport">
      <div
        className="app-stage__canvas"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: STAGE_W,
          height: STAGE_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center",
          overflow: "hidden",
          ...style,
        }}
      >
        {children}
      </div>
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
