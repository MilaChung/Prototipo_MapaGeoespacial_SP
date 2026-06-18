"use client";

import { useEffect, useMemo, useRef } from "react";
import type { KeyboardEvent } from "react";
import type { Feature, Polygon } from "geojson";
import type { RegionFeatureCollection, DrawnFeatureProperties } from "@/lib/regions";
import { getRegionColor } from "@/lib/region-colors";

const DRAWN_FEATURE_COLOR = "#6366f1";

type DrawnFeature = Feature<Polygon, Partial<DrawnFeatureProperties>>;

interface RegionListProps {
  regions: RegionFeatureCollection | null;
  selectedId: number | null;
  onSelect: (id: number) => void;
  isEditMode: boolean;
  drawnFeatures?: DrawnFeature[];
  selectedDrawnId?: string | number | null;
  onSelectDrawn?: (id: string | number | null) => void;
  onEditDrawn?: (id: string | number) => void;
  onDeleteDrawn?: (id: string | number) => void;
}

function downloadGeoJson(features: DrawnFeature[]) {
  const featureCollection = {
    type: "FeatureCollection" as const,
    features,
  };

  const blob = new Blob([JSON.stringify(featureCollection, null, 2)], {
    type: "application/geo+json",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "regioes-novas.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export default function RegionList({
  regions,
  selectedId,
  onSelect,
  isEditMode,
  drawnFeatures = [],
  selectedDrawnId = null,
  onSelectDrawn,
  onEditDrawn,
  onDeleteDrawn,
}: RegionListProps) {
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  useEffect(() => {
    if (selectedId === null) return;
    const item = itemRefs.current.get(selectedId);
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  const sortedFeatures = useMemo(
    () =>
      regions
        ? [...regions.features].sort((a, b) =>
            a.properties.code.localeCompare(b.properties.code)
          )
        : [],
    [regions]
  );

  const exportableFeatures = useMemo(
    () =>
      drawnFeatures.filter(
        (feature) => feature.properties?.code && feature.properties?.descr
      ),
    [drawnFeatures]
  );

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();

    const nextIndex =
      event.key === "ArrowDown"
        ? Math.min(index + 1, sortedFeatures.length - 1)
        : Math.max(index - 1, 0);

    const nextId = sortedFeatures[nextIndex]?.properties.id;
    if (nextId !== undefined) {
      itemRefs.current.get(nextId)?.focus();
    }
  };

  return (
    <nav
      aria-label="Lista de regiões"
      className="h-full overflow-y-auto border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900 md:w-70 md:shrink-0 md:border-r"
    >
      <ul
        role="listbox"
        aria-label="Regiões"
        className="divide-y divide-zinc-200 dark:divide-zinc-800"
      >
        {sortedFeatures.map((feature, index) => {
          const { id, code, descr } = feature.properties;
          const isSelected = id === selectedId;
          const isDimmed = selectedId !== null && !isSelected;
          const color = getRegionColor(code);

          return (
            <li key={id} role="presentation">
              <button
                ref={(node) => {
                  if (node) itemRefs.current.set(id, node);
                  else itemRefs.current.delete(id);
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                aria-current={isSelected ? "true" : undefined}
                onClick={() => onSelect(id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                style={{
                  borderLeft: isSelected ? `3px solid ${color}` : "3px solid transparent",
                  opacity: isDimmed ? 0.5 : 1,
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm outline-offset-2 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:bg-zinc-800 ${
                  isSelected
                    ? "bg-blue-50 dark:bg-blue-950"
                    : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  style={{ backgroundColor: color }}
                  className="h-3 w-3 shrink-0 rounded-[3px]"
                />
                <span>
                  <span
                    className={`font-bold ${
                      isDimmed
                        ? "text-slate-400"
                        : "text-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {code}
                  </span>{" "}
                  <span
                    className={
                      isDimmed
                        ? "text-slate-400"
                        : "text-zinc-700 dark:text-zinc-300"
                    }
                  >
                    {descr}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {drawnFeatures.length > 0 && (
        <div className="border-t border-zinc-300 dark:border-zinc-700">
          <h2 className="px-3 pt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Regiões Adicionadas
          </h2>

          <ul
            role="listbox"
            aria-label="Regiões adicionadas"
            className="divide-y divide-zinc-200 dark:divide-zinc-800"
          >
            {drawnFeatures.map((feature) => {
              const id = feature.id;
              if (id === undefined) return null;

              const code = feature.properties?.code ?? "(sem código)";
              const descr = feature.properties?.descr ?? "(sem descrição)";
              const isSelected = id === selectedDrawnId;

              return (
                <li key={id} role="presentation">
                  <div
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    onClick={() => onSelectDrawn?.(id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectDrawn?.(id);
                      }
                    }}
                    style={{
                      borderLeft: isSelected
                        ? `3px solid ${DRAWN_FEATURE_COLOR}`
                        : "3px solid transparent",
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm outline-offset-2 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:bg-zinc-800 ${
                      isSelected ? "bg-blue-50 dark:bg-blue-950" : ""
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      style={{ backgroundColor: DRAWN_FEATURE_COLOR }}
                      className="h-3 w-3 shrink-0 rounded-[3px]"
                    />
                    <span className="flex-1">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {code}
                      </span>{" "}
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {descr}
                      </span>
                    </span>

                    <button
                      type="button"
                      aria-label={`Editar região ${code}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditDrawn?.(id);
                      }}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      aria-label={`Excluir região ${code}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteDrawn?.(id);
                      }}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="p-3">
            <button
              type="button"
              aria-label="Exportar regiões desenhadas como GeoJSON"
              disabled={exportableFeatures.length === 0}
              onClick={() => downloadGeoJson(exportableFeatures)}
              className="w-full rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ⬇️ Exportar GeoJSON
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}