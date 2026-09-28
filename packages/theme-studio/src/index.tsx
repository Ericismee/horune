"use client";

import { useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { ClockThemeRenderer, type ClockMotionMode } from "@horune/theme-renderer";
import { createStudioTheme, parseThemeManifest, THEME_IMPORT_LIMITS, type ThemeLayerV1, type ThemeManifestV1 } from "@horune/theme-schema";
import { parseThemeJson, serializeTheme, themeFileName } from "./io";

export { parseThemeJson, serializeTheme, themeFileName } from "./io";

type History = { past: ThemeManifestV1[]; present: ThemeManifestV1; future: ThemeManifestV1[] };
type DragState = { before: ThemeManifestV1; layerId: string; rect: DOMRect };

const STICKERS = ["✦", "☾", "★", "♥", "🐈", "🐇"];
const COPY = {
  vi: {
    title: "Theme Studio",
    subtitle: "Chỉnh ThemeManifest khai báo — không chạy mã tùy ý.",
    layers: "Layer",
    properties: "Thuộc tính",
    clock: "Loại đồng hồ",
    save: "Lưu nháp",
    restore: "Khôi phục",
    export: "Xuất JSON",
    import: "Nhập JSON",
    reset: "Đặt lại",
    addText: "+ Văn bản",
    addSticker: "+ Sticker",
    noLayer: "Chọn một layer để chỉnh vị trí, tỷ lệ và nội dung.",
    currentSupport: "Hiện hỗ trợ Theme JSON ≤ 256 KiB. PNG/WebP/GIF/SVG an toàn: planned.",
    saved: "Đã lưu nháp trên thiết bị.",
    restored: "Đã khôi phục nháp.",
    imported: "Theme hợp lệ đã được nhập.",
    invalid: "Không thể nhập theme"
  },
  en: {
    title: "Theme Studio",
    subtitle: "Edit a declarative ThemeManifest — arbitrary code never runs.",
    layers: "Layers",
    properties: "Properties",
    clock: "Clock type",
    save: "Save draft",
    restore: "Restore",
    export: "Export JSON",
    import: "Import JSON",
    reset: "Reset",
    addText: "+ Text",
    addSticker: "+ Sticker",
    noLayer: "Select a layer to edit its position, scale, and content.",
    currentSupport: "Currently supports Theme JSON ≤ 256 KiB. Safe PNG/WebP/GIF/SVG: planned.",
    saved: "Draft saved on this device.",
    restored: "Draft restored.",
    imported: "Valid theme imported.",
    invalid: "Theme import failed"
  }
} as const;

const clone = (theme: ThemeManifestV1) => structuredClone(theme);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export interface ThemeStudioProps {
  locale?: "vi" | "en";
  initialTheme?: ThemeManifestV1;
  storageKey?: string;
}

export function ThemeStudio({ locale = "vi", initialTheme, storageKey = "horune.theme-studio.v1" }: ThemeStudioProps) {
  const source = useMemo(() => createStudioTheme(initialTheme), [initialTheme]);
  const [history, setHistory] = useState<History>(() => ({ past: [], present: source, future: [] }));
  const [selectedId, setSelectedId] = useState<string | null>(history.present.studio?.layers[0]?.id ?? null);
  const [motion, setMotion] = useState<ClockMotionMode>("subtle");
  const [zoom, setZoom] = useState(100);
  const [grid, setGrid] = useState(true);
  const [snap, setSnap] = useState(true);
  const [message, setMessage] = useState<string>("");
  const dragRef = useRef<DragState | null>(null);
  const t = COPY[locale];
  const theme = history.present;
  const studio = theme.studio!;
  const selected = studio.layers.find((layer) => layer.id === selectedId) ?? null;

  const commit = (mutate: (draft: ThemeManifestV1) => void) => {
    setHistory((current) => {
      const next = clone(current.present);
      mutate(next);
      return { past: [...current.past.slice(-49), current.present], present: next, future: [] };
    });
  };

  const undo = () => setHistory((current) => {
    const previous = current.past.at(-1);
    return previous ? { past: current.past.slice(0, -1), present: previous, future: [current.present, ...current.future] } : current;
  });
  const redo = () => setHistory((current) => {
    const next = current.future[0];
    return next ? { past: [...current.past, current.present], present: next, future: current.future.slice(1) } : current;
  });

  const addLayer = (kind: ThemeLayerV1["kind"], content: string) => {
    if (studio.layers.length >= THEME_IMPORT_LIMITS.layers) return;
    const id = `layer-${crypto.randomUUID()}`;
    commit((draft) => draft.studio!.layers.push({ id, kind, content, x: 0.5, y: 0.22, scale: 1, rotation: 0, opacity: 1, hidden: false, locked: false, zIndex: draft.studio!.layers.length + 1 }));
    setSelectedId(id);
  };

  const updateLayer = (id: string, mutate: (layer: ThemeLayerV1) => void) => commit((draft) => {
    const layer = draft.studio!.layers.find((item) => item.id === id);
    if (layer) mutate(layer);
  });

  const moveLayer = (id: string, direction: -1 | 1) => commit((draft) => {
    const ordered = [...draft.studio!.layers].sort((a, b) => a.zIndex - b.zIndex);
    const index = ordered.findIndex((layer) => layer.id === id);
    const swap = ordered[index + direction];
    const active = ordered[index];
    if (!active || !swap) return;
    [active.zIndex, swap.zIndex] = [swap.zIndex, active.zIndex];
  });

  const startDrag = (layer: ThemeLayerV1, event: ReactPointerEvent<HTMLSpanElement>) => {
    if (layer.locked) return;
    const canvas = event.currentTarget.closest(".theme-studio__canvas");
    if (!(canvas instanceof HTMLElement)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(layer.id);
    dragRef.current = { before: clone(history.present), layerId: layer.id, rect: canvas.getBoundingClientRect() };
  };

  const dragLayer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const rawX = clamp((event.clientX - drag.rect.left) / drag.rect.width, 0, 1);
    const rawY = clamp((event.clientY - drag.rect.top) / drag.rect.height, 0, 1);
    const x = snap ? Math.round((rawX * studio.canvas.width) / studio.canvas.gridSize) * studio.canvas.gridSize / studio.canvas.width : rawX;
    const y = snap ? Math.round((rawY * studio.canvas.height) / studio.canvas.gridSize) * studio.canvas.gridSize / studio.canvas.height : rawY;
    setHistory((current) => {
      const next = clone(current.present);
      const layer = next.studio!.layers.find((item) => item.id === drag.layerId);
      if (layer) { layer.x = clamp(x, 0, 1); layer.y = clamp(y, 0, 1); }
      return { ...current, present: next };
    });
  };

  const finishDrag = () => {
    const drag = dragRef.current;
    if (!drag) return;
    setHistory((current) => ({ past: [...current.past.slice(-49), drag.before], present: current.present, future: [] }));
    dragRef.current = null;
  };

  const saveDraft = () => {
    try {
      localStorage.setItem(storageKey, serializeTheme(theme));
      setMessage(t.saved);
    } catch (error) { setMessage(`${t.invalid}: ${error instanceof Error ? error.message : "unknown error"}`); }
  };

  const restoreDraft = () => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) throw new Error("No saved draft");
      const restored = parseThemeJson(stored);
      setHistory((current) => ({ past: [...current.past, current.present], present: restored, future: [] }));
      setSelectedId(restored.studio?.layers[0]?.id ?? null);
      setMessage(t.restored);
    } catch (error) { setMessage(`${t.invalid}: ${error instanceof Error ? error.message : "unknown error"}`); }
  };

  const exportTheme = () => {
    try {
      const content = serializeTheme(theme);
      const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = themeFileName(theme); anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) { setMessage(`${t.invalid}: ${error instanceof Error ? error.message : "unknown error"}`); }
  };

  const importTheme = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > THEME_IMPORT_LIMITS.jsonBytes) throw new Error("File exceeds 256 KiB");
      const imported = parseThemeJson(await file.text());
      setHistory((current) => ({ past: [...current.past, current.present], present: imported.studio ? imported : createStudioTheme(imported), future: [] }));
      setSelectedId(imported.studio?.layers[0]?.id ?? null);
      setMessage(t.imported);
    } catch (error) { setMessage(`${t.invalid}: ${error instanceof Error ? error.message : "unknown error"}`); }
  };

  return (
    <section className="theme-studio" aria-labelledby="theme-studio-title">
      <header className="theme-studio__header">
        <div><span className="h-label">STUDIO / V1</span><h1 id="theme-studio-title">{t.title}</h1><p>{t.subtitle}</p></div>
        <div className="theme-studio__history"><button type="button" onClick={undo} disabled={!history.past.length} aria-label="Undo">↶</button><button type="button" onClick={redo} disabled={!history.future.length} aria-label="Redo">↷</button></div>
      </header>

      <div className="theme-studio__toolbar">
        <label>Zoom <input aria-label="Canvas zoom" type="range" min="60" max="140" step="10" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /> {zoom}%</label>
        <label><input type="checkbox" checked={grid} onChange={(event) => setGrid(event.target.checked)} /> Grid</label>
        <label><input type="checkbox" checked={snap} onChange={(event) => setSnap(event.target.checked)} /> Snap</label>
        <label>Motion <select value={motion} onChange={(event) => setMotion(event.target.value as ClockMotionMode)}><option value="static">Static</option><option value="subtle">Subtle</option><option value="full">Full</option></select></label>
      </div>

      <div className="theme-studio__layout">
        <aside className="theme-studio__panel">
          <div className="theme-studio__panel-title"><strong>{t.layers}</strong><span>{studio.layers.length}/{THEME_IMPORT_LIMITS.layers}</span></div>
          <div className="theme-studio__add"><button type="button" onClick={() => addLayer("text", locale === "vi" ? "Thời gian của bạn" : "Your time")}>{t.addText}</button><button type="button" onClick={() => addLayer("sticker", STICKERS[studio.layers.length % STICKERS.length]!)}>{t.addSticker}</button></div>
          <div className="theme-studio__layers">
            {[...studio.layers].sort((a, b) => b.zIndex - a.zIndex).map((layer) => (
              <div className={selectedId === layer.id ? "is-selected" : ""} key={layer.id}>
                <button type="button" className="layer-name" onClick={() => setSelectedId(layer.id)}><span>{layer.kind === "text" ? "T" : layer.content}</span>{layer.content}</button>
                <button type="button" onClick={() => updateLayer(layer.id, (draft) => { draft.hidden = !draft.hidden; })} aria-label={layer.hidden ? "Show layer" : "Hide layer"}>{layer.hidden ? "○" : "●"}</button>
                <button type="button" onClick={() => updateLayer(layer.id, (draft) => { draft.locked = !draft.locked; })} aria-label={layer.locked ? "Unlock layer" : "Lock layer"}>{layer.locked ? "▣" : "□"}</button>
              </div>
            ))}
          </div>
        </aside>

        <div className="theme-studio__stage" onPointerMove={dragLayer} onPointerUp={finishDrag} onPointerCancel={finishDrag}>
          <div className={`theme-studio__canvas ${grid ? "has-grid" : ""}`} style={{ width: `${zoom}%`, aspectRatio: `${studio.canvas.width} / ${studio.canvas.height}`, "--studio-grid": `${studio.canvas.gridSize}px` } as CSSProperties}>
            <ClockThemeRenderer theme={theme} remainingMs={30 * 60_000} endAt={Date.now() + 30 * 60_000} action="sleep" locale={locale} motionMode={motion} selectedLayerId={selectedId} onLayerPointerDown={startDrag} />
          </div>
          <small>{studio.canvas.width} × {studio.canvas.height}px · {t.currentSupport}</small>
        </div>

        <aside className="theme-studio__panel properties">
          <strong>{t.properties}</strong>
          <label>{t.clock}<select value={studio.clock.type} onChange={(event) => commit((draft) => { draft.studio!.clock.type = event.target.value as typeof studio.clock.type; })}><option value="digital">Digital</option><option value="analog">Analog</option><option value="flip">Flip</option><option value="word">Word</option><option value="hybrid">Hybrid</option></select></label>
          <div className="theme-studio__checks"><label><input type="checkbox" checked={studio.clock.showSeconds} onChange={(event) => commit((draft) => { draft.studio!.clock.showSeconds = event.target.checked; })} /> Seconds</label><label><input type="checkbox" checked={studio.clock.showDate} onChange={(event) => commit((draft) => { draft.studio!.clock.showDate = event.target.checked; })} /> Date</label><label><input type="checkbox" checked={studio.clock.showAction} onChange={(event) => commit((draft) => { draft.studio!.clock.showAction = event.target.checked; })} /> Action</label></div>
          <div className="theme-studio__color-row"><label>Background<input type="color" value={theme.palette.background} onChange={(event) => commit((draft) => { draft.palette.background = event.target.value; })} /></label><label>Gradient<input type="color" value={studio.appearance.backgroundEnd} onChange={(event) => commit((draft) => { draft.studio!.appearance.backgroundEnd = event.target.value; })} /></label><label>Accent<input type="color" value={theme.palette.accent} onChange={(event) => commit((draft) => { draft.palette.accent = event.target.value; })} /></label></div>
          <label>Font size <input type="range" min="28" max="160" value={studio.appearance.fontSize} onChange={(event) => commit((draft) => { draft.studio!.appearance.fontSize = Number(event.target.value); })} /></label>
          <label>Opacity <input type="range" min="0.45" max="1" step="0.05" value={theme.opacity} onChange={(event) => commit((draft) => { draft.opacity = Number(event.target.value); })} /></label>
          <label>Effect<select value={theme.effect.preset} onChange={(event) => commit((draft) => { draft.effect.preset = event.target.value as typeof theme.effect.preset; })}><option value="none">None</option><option value="pulse">Pulse</option><option value="scanline">Scanline</option><option value="flip">Flip</option><option value="grain">Grain</option><option value="orbit">Orbit</option></select></label>
          {selected ? <fieldset><legend>Selected: {selected.content}</legend><label>Content<input maxLength={80} value={selected.content} onChange={(event) => updateLayer(selected.id, (layer) => { layer.content = event.target.value || " "; })} /></label><label>X <input type="number" min="0" max="100" value={Math.round(selected.x * 100)} onChange={(event) => updateLayer(selected.id, (layer) => { layer.x = clamp(Number(event.target.value) / 100, 0, 1); })} /></label><label>Y <input type="number" min="0" max="100" value={Math.round(selected.y * 100)} onChange={(event) => updateLayer(selected.id, (layer) => { layer.y = clamp(Number(event.target.value) / 100, 0, 1); })} /></label><label>Scale <input type="range" min="0.25" max="4" step="0.05" value={selected.scale} onChange={(event) => updateLayer(selected.id, (layer) => { layer.scale = Number(event.target.value); })} /></label><label>Rotate <input type="range" min="-180" max="180" value={selected.rotation} onChange={(event) => updateLayer(selected.id, (layer) => { layer.rotation = Number(event.target.value); })} /></label><div className="theme-studio__layer-actions"><button type="button" onClick={() => moveLayer(selected.id, 1)}>Bring forward</button><button type="button" onClick={() => moveLayer(selected.id, -1)}>Send back</button><button type="button" className="danger" onClick={() => { commit((draft) => { draft.studio!.layers = draft.studio!.layers.filter((layer) => layer.id !== selected.id); }); setSelectedId(null); }}>Delete</button></div></fieldset> : <p className="theme-studio__empty">{t.noLayer}</p>}
        </aside>
      </div>

      <footer className="theme-studio__footer">
        <div><button type="button" onClick={saveDraft}>{t.save}</button><button type="button" onClick={restoreDraft}>{t.restore}</button><button type="button" onClick={exportTheme}>{t.export}</button><label className="theme-studio__import">{t.import}<input type="file" accept="application/json,.json" onChange={importTheme} /></label><button type="button" onClick={() => { setHistory({ past: [history.present], present: source, future: [] }); setSelectedId(null); setMessage(""); }}>{t.reset}</button></div>
        <output aria-live="polite">{message}</output>
      </footer>
    </section>
  );
}
