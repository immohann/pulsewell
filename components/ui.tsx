"use client";

import type { ReactNode } from "react";
import { ZONE_COLORS } from "@/lib/engine";

export function Card({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-white/[0.07] bg-[var(--card)] p-4 sm:p-5 ${onClick ? "cursor-pointer transition hover:bg-white/[0.04]" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function Title({ children, sub, right }: { children: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{children}</h2>
        {sub ? <p className="mt-1 text-sm text-[var(--muted)]">{sub}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function PageHead({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {sub ? <p className="mt-1 text-sm text-[var(--muted)]">{sub}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function Ring({
  value,
  max = 100,
  size = 120,
  stroke = 10,
  color = "#4ade80",
  label,
  sub,
  children,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, maxWidth: "100%", aspectRatio: "1 / 1" }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children ?? (
          <>
            <div className="text-2xl font-semibold tabular-nums leading-none sm:text-3xl">{label}</div>
            {sub ? <div className="mt-1 text-[11px] uppercase tracking-wider text-[var(--muted)]">{sub}</div> : null}
          </>
        )}
      </div>
    </div>
  );
}

export function Pill({ children, color = "#9aa3b2" }: { children: ReactNode; color?: string }) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: color + "22", color }}>
      {children}
    </span>
  );
}

export function Stat({ label, value, unit, sub, color }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; color?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums" style={color ? { color } : undefined}>
        {value}
        {unit ? <span className="ml-1 text-sm font-normal text-[var(--muted)]">{unit}</span> : null}
      </div>
      {sub ? <div className="mt-0.5 text-xs text-[var(--muted)]">{sub}</div> : null}
    </div>
  );
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-[var(--muted)]">
      <div>{children}</div>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function Btn({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-40";
  const v =
    variant === "primary"
      ? "bg-[var(--accent)] text-black hover:brightness-110"
      : variant === "danger"
        ? "bg-red-500/15 text-red-300 hover:bg-red-500/25"
        : "bg-white/[0.06] text-[var(--fg)] hover:bg-white/10";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${v} ${className}`}>
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--muted)]">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-[var(--muted)]">{hint}</span> : null}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-[var(--fg)] outline-none transition focus:border-[var(--accent)]";

export function NumInput({ value, onChange, min, max, step = 1 }: { value: number | undefined; onChange: (n: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <input
      type="number"
      className={inputCls}
      value={value ?? ""}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const n = parseFloat(e.target.value);
        if (Number.isFinite(n)) onChange(n);
      }}
    />
  );
}

/* ---------- charts (plain SVG) ---------- */

export function Bars({
  data,
  height = 120,
  max,
  colorFor,
  labels,
  target,
}: {
  data: (number | null)[];
  height?: number;
  max?: number;
  colorFor?: (v: number, i: number) => string;
  labels?: string[];
  target?: [number, number];
}) {
  const vals = data.filter((v): v is number => v != null);
  const m = max ?? Math.max(1, ...vals);
  const W = 100;
  const bw = W / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      {target ? <rect x={0} y={height - (target[1] / m) * (height - 14)} width={W} height={((target[1] - target[0]) / m) * (height - 14)} fill="rgba(255,255,255,0.06)" /> : null}
      {data.map((v, i) => {
        if (v == null) return null;
        const h = Math.max(1.5, (v / m) * (height - 14));
        return <rect key={i} x={i * bw + bw * 0.18} y={height - h - 12} width={bw * 0.64} height={h} rx={0.9} fill={colorFor ? colorFor(v, i) : "#6c8cff"} />;
      })}
      {labels
        ? labels.map((l, i) => (
            <text key={i} x={i * bw + bw / 2} y={height - 1} fontSize={3.4} textAnchor="middle" fill="rgba(255,255,255,0.45)">
              {l}
            </text>
          ))
        : null}
    </svg>
  );
}

export function Line({
  data,
  height = 110,
  color = "#3dd6c6",
  band,
  min,
  max,
}: {
  data: (number | null)[];
  height?: number;
  color?: string;
  band?: [number, number];
  min?: number;
  max?: number;
}) {
  const vals = data.filter((v): v is number => v != null);
  if (vals.length < 2) return <div className="h-[110px]" />;
  const lo = min ?? Math.min(...vals, band?.[0] ?? Infinity);
  const hi = max ?? Math.max(...vals, band?.[1] ?? -Infinity);
  const span = hi - lo || 1;
  const W = 100;
  const y = (v: number) => height - 6 - ((v - lo) / span) * (height - 12);
  const x = (i: number) => (i / (data.length - 1)) * W;
  let d = "";
  let pen = false;
  data.forEach((v, i) => {
    if (v == null) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"}${x(i).toFixed(2)},${y(v).toFixed(2)} `;
    pen = true;
  });
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      {band ? <rect x={0} y={y(band[1])} width={W} height={Math.max(0, y(band[0]) - y(band[1]))} fill="rgba(255,255,255,0.06)" /> : null}
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function ZoneBars({ zoneMin }: { zoneMin: number[] }) {
  const total = zoneMin.reduce((a, b) => a + b, 0) || 1;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-white/5">
        {zoneMin.map((m, i) => (
          <div key={i} style={{ width: `${(m / total) * 100}%`, background: ZONE_COLORS[i] }} />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1 text-center text-[11px] text-[var(--muted)]">
        {zoneMin.map((m, i) => (
          <div key={i}>
            <div style={{ color: ZONE_COLORS[i] }} className="font-semibold">
              Z{i + 1}
            </div>
            {Math.round(m)}m
          </div>
        ))}
      </div>
    </div>
  );
}

export function Progress({ pct, color = "var(--accent)" }: { pct: number; color?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.round(pct * 100)}%`, background: color }} />
    </div>
  );
}
