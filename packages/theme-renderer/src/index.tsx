import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { defaultStudio, type ThemeLayerV1, type ThemeManifestV1 } from "@horune/theme-schema";

export type ClockAction = "sleep" | "shutdown" | "lock" | "reminder";
export type ClockMotionMode = "static" | "subtle" | "full";

export interface ClockThemeRendererProps {
  theme: ThemeManifestV1;
  remainingMs: number;
  endAt?: number;
  action: ClockAction;
  locale?: "vi" | "en";
  motionMode?: ClockMotionMode;
  quality?: "low" | "high";
  compact?: boolean;
  selectedLayerId?: string | null;
  onLayerPointerDown?: (layer: ThemeLayerV1, event: ReactPointerEvent<HTMLSpanElement>) => void;
}

const ACTIONS = {
  vi: { sleep: "Ngủ", shutdown: "Tắt máy", lock: "Khóa màn hình", reminder: "Nhắc nhở", at: "lúc" },
  en: { sleep: "Sleep", shutdown: "Shut down", lock: "Lock screen", reminder: "Reminder", at: "at" }
} as const;

export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function formatWordClock(ms: number, locale: "vi" | "en" = "en"): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (locale === "vi") {
    if (hours === 0) return `${minutes} phút`;
    return minutes === 0 ? `${hours} giờ` : `${hours} giờ ${minutes} phút`;
  }
  if (hours === 0) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  return minutes === 0 ? `${hours} ${hours === 1 ? "hour" : "hours"}` : `${hours}h ${minutes}m`;
}

function DigitalFace({ value, type, weight }: { value: string; type: "digital" | "flip"; weight: number }) {
  if (type === "flip") {
    return (
      <strong className="horune-clock__time horune-clock__flip font-mono" style={{ fontWeight: weight }}>
        {value.split("").map((character, index) => <span key={`${character}-${index}`}>{character}</span>)}
      </strong>
    );
  }
  return <strong className="horune-clock__time" style={{ fontWeight: weight }}>{value}</strong>;
}

function AnalogFace({ endAt, remainingMs }: { endAt?: number; remainingMs: number }) {
  const time = new Date(endAt ?? Date.now() + remainingMs);
  const hourAngle = (time.getHours() % 12) * 30 + time.getMinutes() * 0.5;
  const minuteAngle = time.getMinutes() * 6;
  const secondAngle = time.getSeconds() * 6;
  const style = {
    "--hour-angle": `${hourAngle}deg`,
    "--minute-angle": `${minuteAngle}deg`,
    "--second-angle": `${secondAngle}deg`
  } as CSSProperties;
  return <span className="horune-clock__analog" style={style} aria-hidden="true"><i className="hour" /><i className="minute" /><i className="second" /><b /></span>;
}

export function ClockThemeRenderer({
  theme,
  remainingMs,
  endAt,
  action,
  locale = "vi",
  motionMode = "subtle",
  quality = "high",
  compact = false,
  selectedLayerId = null,
  onLayerPointerDown
}: ClockThemeRendererProps) {
  const copy = ACTIONS[locale];
  const studio = theme.studio ?? defaultStudio;
  const displayValue = formatRemaining(remainingMs);
  const style = {
    "--clock-bg": theme.palette.background,
    "--clock-fg": theme.palette.foreground,
    "--clock-accent": theme.palette.accent,
    "--clock-muted": theme.palette.muted,
    "--clock-opacity": theme.opacity,
    "--clock-radius": `${theme.layout.radius}px`,
    "--clock-tracking": `${theme.typography.tracking}em`,
    "--clock-intensity": theme.effect.intensity,
    "--clock-bg-end": studio.appearance.backgroundEnd,
    "--clock-gradient-angle": `${studio.appearance.gradientAngle}deg`,
    "--clock-font-size": `${studio.appearance.fontSize}px`,
    "--clock-gap": `${studio.appearance.gap}px`,
    "--clock-frame-width": `${studio.appearance.frameWidth}px`,
    "--clock-frame-color": studio.appearance.frameColor,
    "--clock-aspect": `${studio.canvas.width} / ${studio.canvas.height}`
  } as CSSProperties;

  return (
    <section
      className={`horune-clock effect-${theme.effect.preset} motion-${motionMode} quality-${quality} shadow-${studio.appearance.shadow} ${compact ? "is-compact" : ""}`}
      style={style}
      aria-label={`${copy[action]} ${formatRemaining(remainingMs)}`}
      data-clock-type={studio.clock.type}
    >
      <div className="horune-clock__effect" aria-hidden="true" />
      <div className="horune-clock__content" data-align={theme.layout.align}>
        {studio.clock.showAction ? <span className="horune-clock__eyebrow">{studio.appearance.label || copy[action]}</span> : null}
        <div className={`horune-clock__face font-${theme.typography.family}`}>
          {studio.clock.type === "analog" || studio.clock.type === "hybrid" ? <AnalogFace endAt={endAt} remainingMs={remainingMs} /> : null}
          {studio.clock.type === "word" ? <strong className="horune-clock__words">{formatWordClock(remainingMs, locale)}</strong> : null}
          {studio.clock.type === "digital" || studio.clock.type === "flip" || studio.clock.type === "hybrid" ? <DigitalFace value={studio.clock.showSeconds ? displayValue : displayValue.slice(0, 5)} type={studio.clock.type === "flip" ? "flip" : "digital"} weight={theme.typography.weight} /> : null}
        </div>
        {studio.clock.showDate ? <span className="horune-clock__date">{new Intl.DateTimeFormat(locale, { weekday: "short", day: "2-digit", month: "short" }).format(endAt ?? Date.now())}</span> : null}
        {studio.clock.showCountdown && endAt ? (
          <span className="horune-clock__end">
            {copy.at} {new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(endAt)}
          </span>
        ) : null}
      </div>
      <div className="horune-clock__layers" aria-hidden="true">
        {studio.layers.filter((layer) => !layer.hidden).map((layer) => (
          <span
            key={layer.id}
            className={`horune-clock__layer layer-${layer.kind} ${selectedLayerId === layer.id ? "is-selected" : ""} ${layer.locked ? "is-locked" : ""}`}
            style={{ left: `${layer.x * 100}%`, top: `${layer.y * 100}%`, opacity: layer.opacity, zIndex: layer.zIndex, transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale})` }}
            onPointerDown={onLayerPointerDown ? (event) => onLayerPointerDown(layer, event) : undefined}
          >{layer.content}</span>
        ))}
      </div>
    </section>
  );
}
