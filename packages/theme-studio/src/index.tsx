"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
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
    apply: "Áp dụng vào overlay",
    reset: "Đặt lại",
    addText: "+ Văn bản",
    addSticker: "+ Sticker",
    commands: "Lệnh",
    commandPlaceholder: "Tìm lệnh…",
    noCommands: "Không có lệnh phù hợp.",
    duplicate: "Nhân bản",
    noLayer: "Chọn một layer để chỉnh vị trí, tỷ lệ và nội dung.",
    currentSupport: "Hiện hỗ trợ Theme JSON ≤ 256 KiB. PNG/WebP/GIF/SVG an toàn: planned.",
    saved: "Đã lưu nháp trên thiết bị.",
    restored: "Đã khôi phục nháp.",
    imported: "Theme hợp lệ đã được nhập.",
    applied: "Theme hợp lệ đã được áp dụng.",
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
    apply: "Apply to overlay",
    reset: "Reset",
    addText: "+ Text",
    addSticker: "+ Sticker",
    commands: "Commands",
    commandPlaceholder: "Find a command…",
    noCommands: "No matching commands.",
    duplicate: "Duplicate",
    noLayer: "Select a layer to edit its position, scale, and content.",
    currentSupport: "Currently supports Theme JSON ≤ 256 KiB. Safe PNG/WebP/GIF/SVG: planned.",
    saved: "Draft saved on this device.",
    restored: "Draft restored.",
    imported: "Valid theme imported.",
    applied: "Validated theme applied to the overlay.",
    invalid: "Theme import failed"
  }
} as const;

const clone = (theme: ThemeManifestV1) => structuredClone(theme);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export interface ThemeStudioProps {
  locale?: "vi" | "en";
  initialTheme?: ThemeManifestV1;
  storageKey?: string;
  onApplyTheme?: (theme: ThemeManifestV1) => void | Promise<void>;
}

export function ThemeStudio({ locale = "vi", initialTheme, storageKey = "horune.theme-studio.v1", onApplyTheme }: ThemeStudioProps) {
  const source = useMemo(() => createStudioTheme(initialTheme), [initialTheme]);
  const [history, setHistory] = useState<History>(() => ({ past: [], present: source, future: [] }));
  const [selectedId, setSelectedId] = useState<string | null>(history.present.studio?.layers[0]?.id ?? null);
  const [motion, setMotion] = useState<ClockMotionMode>("subtle");
  const [zoom, setZoom] = useState(100);
  const [grid, setGrid] = useState(true);
  const [snap, setSnap] = useState(true);
  const [message, setMessage] = useState<string>("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const dragRef = useRef<DragState | null>(null);
  const paletteInputRef = useRef<HTMLInputElement | null>(null);
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

  const deleteSelected = () => {
    if (!selectedId) return;
    commit((draft) => { draft.studio!.layers = draft.studio!.layers.filter((layer) => layer.id !== selectedId); });
    setSelectedId(null);
  };

  const duplicateSelected = () => {
    if (!selected || studio.layers.length >= THEME_IMPORT_LIMITS.layers) return;
    const id = `layer-${crypto.randomUUID()}`;
    commit((draft) => {
      const sourceLayer = draft.studio!.layers.find((layer) => layer.id === selected.id);
      if (!sourceLayer) return;
      const highest = Math.max(0, ...draft.studio!.layers.map((layer) => layer.zIndex));
      draft.studio!.layers.push({
        ...sourceLayer,
        id,
        x: clamp(sourceLayer.x + studio.canvas.gridSize / studio.canvas.width, 0, 1),
        y: clamp(sourceLayer.y + studio.canvas.gridSize / studio.canvas.height, 0, 1),
        zIndex: highest + 1
      });
    });
    setSelectedId(id);
  };

  const nudgeSelected = (xPixels: number, yPixels: number) => {
    if (!selected || selected.locked) return;
    updateLayer(selected.id, (layer) => {
      layer.x = clamp(layer.x + xPixels / studio.canvas.width, 0, 1);
      layer.y = clamp(layer.y + yPixels / studio.canvas.height, 0, 1);
    });
  };

  const alignSelected = (axis: "x" | "y", position: "start" | "center" | "end") => {
    if (!selected || selected.locked) return;
    const coordinate = position === "start" ? 0.1 : position === "center" ? 0.5 : 0.9;
    updateLayer(selected.id, (layer) => { layer[axis] = coordinate; });
  };

  const setCanvasSize = (width: number, height: number) => commit((draft) => {
    draft.studio!.canvas.width = clamp(Math.round(width), 280, 960);
    draft.studio!.canvas.height = clamp(Math.round(height), 140, 640);
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

  const applyTheme = async () => {
    try {
      const validated = parseThemeManifest(theme);
      await onApplyTheme?.(validated);
      setMessage(t.applied);
    } catch (error) {
      setMessage(`${t.invalid}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
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

  const commands = [
    { id: "save", label: t.save, shortcut: "Ctrl/Cmd + S", run: saveDraft },
    { id: "undo", label: locale === "vi" ? "Hoàn tác" : "Undo", shortcut: "Ctrl/Cmd + Z", run: undo, disabled: !history.past.length },
    { id: "redo", label: locale === "vi" ? "Làm lại" : "Redo", shortcut: "Ctrl/Cmd + Shift + Z", run: redo, disabled: !history.future.length },
    { id: "text", label: t.addText, shortcut: "T", run: () => addLayer("text", locale === "vi" ? "Thời gian của bạn" : "Your time"), disabled: studio.layers.length >= THEME_IMPORT_LIMITS.layers },
    { id: "duplicate", label: t.duplicate, shortcut: "Ctrl/Cmd + J", run: duplicateSelected, disabled: !selected || studio.layers.length >= THEME_IMPORT_LIMITS.layers },
    { id: "delete", label: locale === "vi" ? "Xóa layer" : "Delete layer", shortcut: "Delete", run: deleteSelected, disabled: !selected },
    { id: "deselect", label: locale === "vi" ? "Bỏ chọn" : "Deselect", shortcut: "Ctrl/Cmd + D", run: () => setSelectedId(null), disabled: !selected },
    { id: "zoom-in", label: locale === "vi" ? "Phóng to" : "Zoom in", shortcut: "+", run: () => setZoom((current) => clamp(current + 10, 60, 140)), disabled: zoom >= 140 },
    { id: "zoom-out", label: locale === "vi" ? "Thu nhỏ" : "Zoom out", shortcut: "−", run: () => setZoom((current) => clamp(current - 10, 60, 140)), disabled: zoom <= 60 },
    { id: "zoom-fit", label: locale === "vi" ? "Vừa khung" : "Fit canvas", shortcut: "0", run: () => setZoom(100), disabled: zoom === 100 }
  ];
  const normalizedQuery = commandQuery.trim().toLocaleLowerCase(locale);
  const filteredCommands = commands.filter((command) => command.label.toLocaleLowerCase(locale).includes(normalizedQuery));

  useEffect(() => {
    if (paletteOpen) paletteInputRef.current?.focus();
  }, [paletteOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (paletteOpen && event.key === "Escape") {
        event.preventDefault();
        setPaletteOpen(false);
        return;
      }
      if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName))) return;
      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (modifier && key === "k") {
        event.preventDefault();
        setCommandQuery("");
        setPaletteOpen(true);
        return;
      }
      if (paletteOpen) {
        return;
      }
      if (modifier && key === "s") { event.preventDefault(); saveDraft(); return; }
      if (modifier && key === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); return; }
      if (modifier && key === "j") { event.preventDefault(); duplicateSelected(); return; }
      if (modifier && key === "d") { event.preventDefault(); setSelectedId(null); return; }
      if (!modifier && key === "t") { event.preventDefault(); addLayer("text", locale === "vi" ? "Thời gian của bạn" : "Your time"); return; }
      if (!modifier && (event.key === "+" || event.key === "=")) { event.preventDefault(); setZoom((current) => clamp(current + 10, 60, 140)); return; }
      if (!modifier && event.key === "-") { event.preventDefault(); setZoom((current) => clamp(current - 10, 60, 140)); return; }
      if (!modifier && event.key === "0") { event.preventDefault(); setZoom(100); return; }
      if (!modifier && (event.key === "Delete" || event.key === "Backspace")) { event.preventDefault(); deleteSelected(); return; }
      if (!modifier && event.key.startsWith("Arrow")) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        if (event.key === "ArrowLeft") nudgeSelected(-step, 0);
        if (event.key === "ArrowRight") nudgeSelected(step, 0);
        if (event.key === "ArrowUp") nudgeSelected(0, -step);
        if (event.key === "ArrowDown") nudgeSelected(0, step);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <section className="theme-studio" aria-labelledby="theme-studio-title">
      <header className="theme-studio__header">
        <div><span className="h-label">STUDIO / V1</span><h1 id="theme-studio-title">{t.title}</h1><p>{t.subtitle}</p></div>
        <div className="theme-studio__history"><button type="button" onClick={() => { setCommandQuery(""); setPaletteOpen(true); }}>{t.commands} <kbd>⌘K</kbd></button><button type="button" onClick={undo} disabled={!history.past.length} aria-label="Undo">↶</button><button type="button" onClick={redo} disabled={!history.future.length} aria-label="Redo">↷</button></div>
      </header>

      {paletteOpen ? <div className="theme-studio__palette-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaletteOpen(false); }}><section className="theme-studio__palette" role="dialog" aria-modal="true" aria-label={t.commands}><header><strong>{t.commands}</strong><button type="button" onClick={() => setPaletteOpen(false)} aria-label="Close commands">×</button></header><input ref={paletteInputRef} value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} placeholder={t.commandPlaceholder} aria-label={t.commandPlaceholder} /><div>{filteredCommands.length ? filteredCommands.map((command) => <button type="button" key={command.id} disabled={command.disabled} onClick={() => { command.run(); setPaletteOpen(false); }}><span>{command.label}</span><kbd>{command.shortcut}</kbd></button>) : <p>{t.noCommands}</p>}</div></section></div> : null}

      <div className="theme-studio__toolbar">
        <div className="theme-studio__tool-group" role="group" aria-label={locale === "vi" ? "Thêm layer" : "Add layer"}>
          <button type="button" onClick={() => addLayer("text", locale === "vi" ? "Thời gian của bạn" : "Your time")} disabled={studio.layers.length >= THEME_IMPORT_LIMITS.layers}>{t.addText}</button>
          <button type="button" onClick={() => addLayer("sticker", STICKERS[studio.layers.length % STICKERS.length]!)} disabled={studio.layers.length >= THEME_IMPORT_LIMITS.layers}>{t.addSticker}</button>
        </div>
        <div className="theme-studio__tool-group" role="group" aria-label={locale === "vi" ? "Căn layer đã chọn" : "Align selected layer"}>
          <button type="button" title="Align left" aria-label="Align left" disabled={!selected || selected.locked} onClick={() => alignSelected("x", "start")}>⇤</button>
          <button type="button" title="Align horizontal center" aria-label="Align horizontal center" disabled={!selected || selected.locked} onClick={() => alignSelected("x", "center")}>↔</button>
          <button type="button" title="Align right" aria-label="Align right" disabled={!selected || selected.locked} onClick={() => alignSelected("x", "end")}>⇥</button>
          <button type="button" title="Align top" aria-label="Align top" disabled={!selected || selected.locked} onClick={() => alignSelected("y", "start")}>⇡</button>
          <button type="button" title="Align vertical center" aria-label="Align vertical center" disabled={!selected || selected.locked} onClick={() => alignSelected("y", "center")}>↕</button>
          <button type="button" title="Align bottom" aria-label="Align bottom" disabled={!selected || selected.locked} onClick={() => alignSelected("y", "end")}>⇣</button>
        </div>
        <label>Zoom <input aria-label="Canvas zoom" type="range" min="60" max="140" step="10" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /> {zoom}%</label>
        <label><input type="checkbox" checked={grid} onChange={(event) => setGrid(event.target.checked)} /> Grid</label>
        <label><input type="checkbox" checked={snap} onChange={(event) => setSnap(event.target.checked)} /> Snap</label>
        <label>Motion <select value={motion} onChange={(event) => setMotion(event.target.value as ClockMotionMode)}><option value="static">Static</option><option value="subtle">Subtle</option><option value="full">Full</option></select></label>
      </div>

      <div className="theme-studio__layout">
        <aside className="theme-studio__panel">
          <div className="theme-studio__panel-title"><strong>{t.layers}</strong><span>{studio.layers.length}/{THEME_IMPORT_LIMITS.layers}</span></div>
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
          <div className="theme-studio__stage-tools" role="group" aria-label={locale === "vi" ? "Bố cục canvas" : "Canvas layout"}>
            <span>{locale === "vi" ? "Bố cục" : "Layout"}</span>
            <button type="button" onClick={() => setCanvasSize(560, 260)} aria-pressed={studio.canvas.width === 560 && studio.canvas.height === 260}>Standard</button>
            <button type="button" onClick={() => setCanvasSize(720, 240)} aria-pressed={studio.canvas.width === 720 && studio.canvas.height === 240}>Wide</button>
            <button type="button" onClick={() => setCanvasSize(400, 400)} aria-pressed={studio.canvas.width === 400 && studio.canvas.height === 400}>Square</button>
          </div>
          <div className={`theme-studio__canvas ${grid ? "has-grid" : ""}`} style={{ width: `${zoom}%`, aspectRatio: `${studio.canvas.width} / ${studio.canvas.height}`, "--studio-grid": `${studio.canvas.gridSize}px` } as CSSProperties}>
            <ClockThemeRenderer theme={theme} remainingMs={30 * 60_000} action="sleep" locale={locale} motionMode={motion} selectedLayerId={selectedId} onLayerPointerDown={startDrag} />
          </div>
          <small>{studio.canvas.width} × {studio.canvas.height}px · {t.currentSupport}</small>
          <div className="theme-studio__stage-bottom" role="group" aria-label={locale === "vi" ? "Chỉnh nhanh layer" : "Quick layer edit"}>
            {selected ? <><strong>{selected.content}</strong><span>X {Math.round(selected.x * studio.canvas.width)} px · Y {Math.round(selected.y * studio.canvas.height)} px</span><button type="button" disabled={selected.locked} onClick={() => nudgeSelected(-studio.canvas.gridSize, 0)} aria-label="Move layer left">←</button><button type="button" disabled={selected.locked} onClick={() => nudgeSelected(0, -studio.canvas.gridSize)} aria-label="Move layer up">↑</button><button type="button" disabled={selected.locked} onClick={() => nudgeSelected(0, studio.canvas.gridSize)} aria-label="Move layer down">↓</button><button type="button" disabled={selected.locked} onClick={() => nudgeSelected(studio.canvas.gridSize, 0)} aria-label="Move layer right">→</button><button type="button" disabled={selected.locked} onClick={() => updateLayer(selected.id, (layer) => { layer.scale = 1; layer.rotation = 0; })}>Reset transform</button></> : <span>{locale === "vi" ? "Chọn layer để chỉnh nhanh vị trí." : "Select a layer to adjust its position."}</span>}
          </div>
        </div>

        <aside className="theme-studio__panel properties">
          <strong>{t.properties}</strong>
          <fieldset><legend>Canvas</legend><label>Width (px)<input type="number" min="280" max="960" value={studio.canvas.width} onChange={(event) => setCanvasSize(Number(event.target.value), studio.canvas.height)} /></label><label>Height (px)<input type="number" min="140" max="640" value={studio.canvas.height} onChange={(event) => setCanvasSize(studio.canvas.width, Number(event.target.value))} /></label><label>Grid size<select value={studio.canvas.gridSize} onChange={(event) => commit((draft) => { draft.studio!.canvas.gridSize = Number(event.target.value) as typeof studio.canvas.gridSize; })}>{[4, 8, 12, 16, 24].map((size) => <option value={size} key={size}>{size} px</option>)}</select></label></fieldset>
          <label>{t.clock}<select value={studio.clock.type} onChange={(event) => commit((draft) => { draft.studio!.clock.type = event.target.value as typeof studio.clock.type; })}><option value="digital">Digital</option><option value="analog">Analog</option><option value="flip">Flip</option><option value="word">Word</option><option value="hybrid">Hybrid</option></select></label>
          <div className="theme-studio__checks"><label><input type="checkbox" checked={studio.clock.showSeconds} onChange={(event) => commit((draft) => { draft.studio!.clock.showSeconds = event.target.checked; })} /> Seconds</label><label><input type="checkbox" checked={studio.clock.showDate} onChange={(event) => commit((draft) => { draft.studio!.clock.showDate = event.target.checked; })} /> Date</label><label><input type="checkbox" checked={studio.clock.showAction} onChange={(event) => commit((draft) => { draft.studio!.clock.showAction = event.target.checked; })} /> Action</label></div>
          <div className="theme-studio__color-row"><label>Background<input type="color" value={theme.palette.background} onChange={(event) => commit((draft) => { draft.palette.background = event.target.value; })} /></label><label>Gradient<input type="color" value={studio.appearance.backgroundEnd} onChange={(event) => commit((draft) => { draft.studio!.appearance.backgroundEnd = event.target.value; })} /></label><label>Accent<input type="color" value={theme.palette.accent} onChange={(event) => commit((draft) => { draft.palette.accent = event.target.value; })} /></label></div>
          <label>Font size <input type="range" min="28" max="160" value={studio.appearance.fontSize} onChange={(event) => commit((draft) => { draft.studio!.appearance.fontSize = Number(event.target.value); })} /></label>
          <label>Opacity <input type="range" min="0.45" max="1" step="0.05" value={theme.opacity} onChange={(event) => commit((draft) => { draft.opacity = Number(event.target.value); })} /></label>
          <label>Effect<select value={theme.effect.preset} onChange={(event) => commit((draft) => { draft.effect.preset = event.target.value as typeof theme.effect.preset; })}><option value="none">None</option><option value="pulse">Pulse</option><option value="scanline">Scanline</option><option value="flip">Flip</option><option value="grain">Grain</option><option value="orbit">Orbit</option></select></label>
          {selected ? <fieldset><legend>Selected: {selected.content}</legend><label>Content<input maxLength={80} value={selected.content} onChange={(event) => updateLayer(selected.id, (layer) => { layer.content = event.target.value || " "; })} /></label><label>X <input type="number" min="0" max="100" value={Math.round(selected.x * 100)} onChange={(event) => updateLayer(selected.id, (layer) => { layer.x = clamp(Number(event.target.value) / 100, 0, 1); })} /></label><label>Y <input type="number" min="0" max="100" value={Math.round(selected.y * 100)} onChange={(event) => updateLayer(selected.id, (layer) => { layer.y = clamp(Number(event.target.value) / 100, 0, 1); })} /></label><label>Scale <input type="range" min="0.25" max="4" step="0.05" value={selected.scale} onChange={(event) => updateLayer(selected.id, (layer) => { layer.scale = Number(event.target.value); })} /></label><label>Rotate <input type="range" min="-180" max="180" value={selected.rotation} onChange={(event) => updateLayer(selected.id, (layer) => { layer.rotation = Number(event.target.value); })} /></label><label>Layer opacity <input type="range" min="0" max="1" step="0.05" value={selected.opacity} onChange={(event) => updateLayer(selected.id, (layer) => { layer.opacity = Number(event.target.value); })} /></label><div className="theme-studio__layer-actions"><button type="button" onClick={() => moveLayer(selected.id, 1)}>Bring forward</button><button type="button" onClick={() => moveLayer(selected.id, -1)}>Send back</button><button type="button" onClick={duplicateSelected}>{t.duplicate}</button><button type="button" className="danger" onClick={deleteSelected}>Delete</button></div></fieldset> : <p className="theme-studio__empty">{t.noLayer}</p>}
        </aside>
      </div>

      <footer className="theme-studio__footer">
        <div>{onApplyTheme ? <button type="button" className="primary" onClick={applyTheme}>{t.apply}</button> : null}<button type="button" onClick={saveDraft}>{t.save}</button><button type="button" onClick={restoreDraft}>{t.restore}</button><button type="button" onClick={exportTheme}>{t.export}</button><label className="theme-studio__import">{t.import}<input type="file" accept="application/json,.json" onChange={importTheme} /></label><button type="button" onClick={() => { setHistory({ past: [history.present], present: source, future: [] }); setSelectedId(null); setMessage(""); }}>{t.reset}</button></div>
        <output aria-live="polite">{message}</output>
      </footer>
    </section>
  );
}
