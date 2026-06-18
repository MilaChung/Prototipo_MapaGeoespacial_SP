"use client";

import { useEffect, useRef, useState } from "react";
import type { Feature, Polygon } from "geojson";
import { parseCoordinates } from "@/lib/parse-coordinates";
import type { CoordFormat, ParseResult } from "@/lib/parse-coordinates";

const DEBOUNCE_MS = 300;
const VISUALIZED_FEEDBACK_MS = 2000;

const PLACEHOLDER_BY_FORMAT: Record<CoordFormat, string> = {
  "lat,lng": "-22.760076, -43.605523\n-22.734067, -43.569626",
  "lng,lat": "-43.605523, -22.760076\n-43.569626, -22.734067",
};

interface CoordinatePanelProps {
  onAddFeature: (feature: Feature<Polygon>) => void;
  onSyncToMap: (feature: Feature<Polygon>) => void;
  onClose: () => void;
}

export default function CoordinatePanel({
  onAddFeature,
  onSyncToMap,
  onClose,
}: CoordinatePanelProps) {
  const [coordFormat, setCoordFormat] = useState<CoordFormat>("lat,lng");
  const [rawText, setRawText] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isVisualized, setIsVisualized] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visualizedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (visualizedTimeoutRef.current) clearTimeout(visualizedTimeoutRef.current);
    };
  }, []);

  const runParse = (text: string, format: CoordFormat) => {
    if (text.trim() === "") {
      setParseResult(null);
      return;
    }
    setParseResult(parseCoordinates(text, format));
  };

  const handleTextChange = (text: string) => {
    setRawText(text);
    setIsVisualized(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runParse(text, coordFormat);
    }, DEBOUNCE_MS);
  };

  const handleFormatChange = (format: CoordFormat) => {
    setCoordFormat(format);
    setIsVisualized(false);
    if (rawText.trim() !== "") {
      runParse(rawText, format);
    }
  };

  const handleVisualize = () => {
    if (!parseResult?.ok) return;
    onSyncToMap(parseResult.feature);
    setIsVisualized(true);

    if (visualizedTimeoutRef.current) clearTimeout(visualizedTimeoutRef.current);
    visualizedTimeoutRef.current = setTimeout(() => {
      setIsVisualized(false);
    }, VISUALIZED_FEEDBACK_MS);
  };

  const handleAddAsNewRegion = () => {
    if (!parseResult?.ok) return;
    onAddFeature(parseResult.feature);
    onClose();
  };

  const isEmpty = rawText.trim() === "";
  const hasError = parseResult?.ok === false;

  return (
    <div className="absolute right-0 top-12 z-10 flex w-80 flex-col gap-3 border-l border-zinc-300 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Inserir por Coordenadas
        </h2>
        <button
          type="button"
          aria-label="Fechar painel de coordenadas"
          onClick={onClose}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          ×
        </button>
      </div>

      <div className="flex rounded-md border border-zinc-300 dark:border-zinc-700">
        <button
          type="button"
          aria-label="Formato latitude, longitude"
          aria-pressed={coordFormat === "lat,lng"}
          onClick={() => handleFormatChange("lat,lng")}
          className={`flex-1 rounded-l-md px-3 py-1.5 text-sm font-medium ${
            coordFormat === "lat,lng"
              ? "bg-blue-600 text-white"
              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          }`}
        >
          Lat, Lon
        </button>
        <button
          type="button"
          aria-label="Formato lon, latitude"
          aria-pressed={coordFormat === "lng,lat"}
          onClick={() => handleFormatChange("lng,lat")}
          className={`flex-1 rounded-r-md border-l border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700 ${
            coordFormat === "lng,lat"
              ? "bg-blue-600 text-white"
              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          }`}
        >
          Lon, Lat
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="coordinate-panel-textarea"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
        >
          Coordenadas (uma por linha)
        </label>
        <textarea
          id="coordinate-panel-textarea"
          rows={10}
          value={rawText}
          onChange={(event) => handleTextChange(event.target.value)}
          placeholder={PLACEHOLDER_BY_FORMAT[coordFormat]}
          aria-describedby="coordinate-panel-feedback"
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 font-mono text-sm text-zinc-900 outline-offset-2 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>

      <div id="coordinate-panel-feedback">
        {hasError && (
          <ul role="alert" className="list-inside list-disc text-sm text-red-600 dark:text-red-400">
            {parseResult.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        )}
        {parseResult?.ok && (
          <p className="text-sm text-green-600 dark:text-green-400">
            ✓ {parseResult.coordinates.length} pontos válidos
          </p>
        )}
      </div>

      <button
        type="button"
        disabled={isEmpty || hasError}
        onClick={handleVisualize}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isVisualized ? "✓ Visualizado" : "Visualizar no Mapa"}
      </button>

      <button
        type="button"
        disabled={hasError || isEmpty}
        onClick={handleAddAsNewRegion}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Adicionar como Nova Região
      </button>
    </div>
  );
}