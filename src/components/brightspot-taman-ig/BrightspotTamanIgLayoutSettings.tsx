"use client";

import { useEffect, useState } from "react";
import type {
  SlotLayout,
  StoredLayouts,
} from "@/components/brightspot-taman-ig/brightspotTamanIgStrip";
import {
  defaultLayouts,
  loadLayouts,
  saveLayouts,
} from "@/components/brightspot-taman-ig/brightspotTamanIgStrip";

const FIELDS: {
  key: keyof SlotLayout;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "shiftX", label: "Geser X", min: -0.4, max: 0.4, step: 0.005 },
  { key: "left", label: "Left", min: 0, max: 0.5, step: 0.005 },
  { key: "top", label: "Top", min: 0, max: 0.5, step: 0.005 },
  { key: "cellW", label: "Lebar foto", min: 0.2, max: 0.9, step: 0.005 },
  { key: "cellH", label: "Tinggi foto", min: 0.1, max: 0.5, step: 0.005 },
  { key: "gap", label: "Gap", min: 0, max: 0.1, step: 0.002 },
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

type Props = {
  layouts: StoredLayouts;
  onChange: (next: StoredLayouts) => void;
};

export function BrightspotTamanIgLayoutSettings({ layouts, onChange }: Props) {
  const [open, setOpen] = useState(false);
  /** Draft text for number inputs while typing */
  const [drafts, setDrafts] = useState<Partial<Record<keyof SlotLayout, string>>>(
    {},
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const current = layouts.preview;

  const patchField = (key: keyof SlotLayout, value: number) => {
    const next: StoredLayouts = {
      preview: { ...layouts.preview, [key]: value },
    };
    onChange(next);
    saveLayouts(next);
  };

  const commitNumber = (
    key: keyof SlotLayout,
    raw: string,
    min: number,
    max: number,
  ) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      setDrafts((d) => {
        const next = { ...d };
        delete next[key];
        return next;
      });
      return;
    }
    const value = clamp(parsed, min, max);
    patchField(key, value);
    setDrafts((d) => {
      const next = { ...d };
      delete next[key];
      return next;
    });
  };

  const reset = () => {
    const next = defaultLayouts();
    onChange(next);
    saveLayouts(next);
    setDrafts({});
  };

  return (
    <>
      <button
        type="button"
        aria-label="Pengaturan jarak foto"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="absolute right-0 top-0 z-40 h-[200px] w-[200px] opacity-40 backdrop-blur-[2px] transition-opacity hover:opacity-80 active:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
      />

      {open && (
        <div
          className="absolute inset-0 z-50 flex items-start justify-end bg-black/45 p-6 pt-[230px]"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Pengaturan jarak foto"
            className="bt-layout-settings w-[92%] max-h-[calc(100%-250px)] overflow-y-auto rounded-3xl border-2 border-white/20 bg-[#1a080c]/95 p-8 text-white shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-8 flex items-center justify-between gap-4">
              <p className="text-[42px] font-semibold uppercase leading-tight tracking-[0.08em]">
                Jarak foto
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[32px] text-white/70 underline underline-offset-4"
              >
                Tutup
              </button>
            </div>

            <div className="flex flex-col gap-10">
              {FIELDS.map((f) => {
                const value = current[f.key];
                const draft = drafts[f.key];
                return (
                  <div key={f.key} className="block">
                    <div className="mb-4 flex items-center justify-between gap-4 text-[32px]">
                      <span className="uppercase tracking-[0.06em] text-white/75">
                        {f.label}
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={f.min}
                        max={f.max}
                        step={f.step}
                        value={draft ?? value.toFixed(3)}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setDrafts((d) => ({ ...d, [f.key]: raw }));
                          const parsed = Number(raw);
                          if (Number.isFinite(parsed)) {
                            patchField(f.key, clamp(parsed, f.min, f.max));
                          }
                        }}
                        onBlur={(e) =>
                          commitNumber(f.key, e.target.value, f.min, f.max)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            (e.target as HTMLInputElement).blur();
                          }
                          e.stopPropagation();
                        }}
                        className="w-[220px] rounded-xl border-2 border-white/30 bg-black/40 px-4 py-3 text-right text-[36px] tabular-nums text-white outline-none focus:border-white/70"
                      />
                    </div>
                    <input
                      type="range"
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      value={value}
                      onChange={(e) => {
                        setDrafts((d) => {
                          const next = { ...d };
                          delete next[f.key];
                          return next;
                        });
                        patchField(f.key, Number(e.target.value));
                      }}
                      className="bt-layout-range w-full"
                    />
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={reset}
              className="mt-10 w-full rounded-2xl border-2 border-white/25 py-6 text-[32px] font-semibold uppercase tracking-[0.08em] text-white/85"
            >
              Reset default
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Hook: load persisted layouts once on the client. */
export function useSlotLayouts() {
  const [layouts, setLayouts] = useState<StoredLayouts>(defaultLayouts);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLayouts(loadLayouts());
    setReady(true);
  }, []);

  return { layouts, setLayouts, ready };
}
