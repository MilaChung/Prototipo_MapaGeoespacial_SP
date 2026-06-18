"use client";

import { useEffect, useRef, useState } from "react";
import type { Feature, Polygon } from "geojson";

const DEBOUNCE_MS = 500;
const LAT_RANGE: [number, number] = [-90, 90];
const LNG_RANGE: [number, number] = [-180, 180];
const MIN_VERTICES = 3;

type VertexFormat = "lat,lng" | "lng,lat";

interface VertexTableProps {
  feature: Feature<Polygon>;
  onSyncToMap: (feature: Feature<Polygon>) => void;
}

function inRange(value: number, [min, max]: [number, number]): boolean {
  return value >= min && value <= max;
}

function getRing(feature: Feature<Polygon>): [number, number][] {
  const ring = feature.geometry.coordinates[0] ?? [];
  return ring.map(([lng, lat]) => [lng, lat]);
}

function getVertices(feature: Feature<Polygon>): [number, number][] {
  const ring = getRing(feature);
  if (ring.length === 0) return [];

  const first = ring[0];
  const last = ring[ring.length - 1];
  const isClosed =
    ring.length > 1 && last[0] === first[0] && last[1] === first[1];

  return isClosed ? ring.slice(0, -1) : ring;
}

function getCentroid(vertices: [number, number][]): [number, number] {
  const total = vertices.reduce(
    (accumulator, [lng, lat]) => [accumulator[0] + lng, accumulator[1] + lat],
    [0, 0]
  );
  return [total[0] / vertices.length, total[1] / vertices.length];
}

function buildFeatureFromVertices(
  feature: Feature<Polygon>,
  vertices: [number, number][]
): Feature<Polygon> {
  const ring = [...vertices, vertices[0]];
  return {
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: [ring],
    },
  };
}

export default function VertexTable({ feature, onSyncToMap }: VertexTableProps) {
  const [format, setFormat] = useState<VertexFormat>("lat,lng");
  const [announcement, setAnnouncement] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const vertices = getVertices(feature);

  const scheduleSync = (updatedVertices: [number, number][]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSyncToMap(buildFeatureFromVertices(feature, updatedVertices));
    }, DEBOUNCE_MS);
  };

  const handleVertexChange = (
    index: number,
    axis: "lat" | "lng",
    rawValue: string
  ) => {
    const value = parseFloat(rawValue);
    if (Number.isNaN(value)) return;

    const updatedVertices = vertices.map((vertex) => [...vertex] as [number, number]);
    if (axis === "lat") {
      updatedVertices[index][1] = value;
    } else {
      updatedVertices[index][0] = value;
    }

    scheduleSync(updatedVertices);
  };

  const handleRemoveVertex = (index: number) => {
    if (vertices.length <= MIN_VERTICES) return;

    const updatedVertices = vertices.filter((_, candidate) => candidate !== index);
    onSyncToMap(buildFeatureFromVertices(feature, updatedVertices));
    setAnnouncement(
      `Vértice ${index + 1} removido. Polígono agora tem ${updatedVertices.length} pontos.`
    );
  };

  const handleAddVertex = () => {
    const centroid = getCentroid(vertices);
    const updatedVertices = [...vertices, centroid];
    onSyncToMap(buildFeatureFromVertices(feature, updatedVertices));
    setAnnouncement(
      `Vértice ${updatedVertices.length} adicionado. Polígono agora tem ${updatedVertices.length} pontos.`
    );
  };

  const canRemove = vertices.length > MIN_VERTICES;

  return (
    <div className="absolute left-1/2 top-[21rem] z-10 flex w-80 -translate-x-1/2 flex-col gap-2 rounded-md border border-zinc-300 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Vértices do Polígono ({vertices.length} pontos)
        </h2>
      </div>

      <div className="flex rounded-md border border-zinc-300 dark:border-zinc-700">
        <button
          type="button"
          aria-label="Formato latitude, longitude"
          aria-pressed={format === "lat,lng"}
          onClick={() => setFormat("lat,lng")}
          className={`flex-1 rounded-l-md px-3 py-1 text-xs font-medium ${
            format === "lat,lng"
              ? "bg-blue-600 text-white"
              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          }`}
        >
          Lat, Lon
        </button>
        <button
          type="button"
          aria-label="Formato lon, latitude"
          aria-pressed={format === "lng,lat"}
          onClick={() => setFormat("lng,lat")}
          className={`flex-1 rounded-r-md border-l border-zinc-300 px-3 py-1 text-xs font-medium dark:border-zinc-700 ${
            format === "lng,lat"
              ? "bg-blue-600 text-white"
              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          }`}
        >
          Lon, Lat
        </button>
      </div>

      <div className="max-h-56 overflow-y-auto">
        <table
          role="grid"
          aria-label="Tabela de vértices editável"
          className="w-full text-xs"
        >
          <thead>
            <tr className="text-left text-zinc-500 dark:text-zinc-400">
              <th className="w-6 py-1">#</th>
              <th className="py-1">Latitude</th>
              <th className="py-1">Lon</th>
              <th className="w-6 py-1">Ação</th>
            </tr>
          </thead>
          <tbody>
            {vertices.map(([lng, lat], index) => {
              const latInvalid = !inRange(lat, LAT_RANGE);
              const lngInvalid = !inRange(lng, LNG_RANGE);
              const columns: Array<{ axis: "lat" | "lng"; value: number; invalid: boolean }> =
                format === "lat,lng"
                  ? [
                      { axis: "lat", value: lat, invalid: latInvalid },
                      { axis: "lng", value: lng, invalid: lngInvalid },
                    ]
                  : [
                      { axis: "lng", value: lng, invalid: lngInvalid },
                      { axis: "lat", value: lat, invalid: latInvalid },
                    ];

              return (
                <tr key={index} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="py-1 text-zinc-500 dark:text-zinc-400">{index + 1}</td>
                  {columns.map(({ axis, value, invalid }) => (
                    <td key={axis} className="py-1 pr-1">
                      <input
                        type="number"
                        step="0.000001"
                        defaultValue={value.toFixed(6)}
                        aria-label={`${axis === "lat" ? "Latitude" : "Lon"} do vértice ${index + 1}`}
                        onChange={(event) =>
                          handleVertexChange(index, axis, event.target.value)
                        }
                        className={`w-full rounded border px-1.5 py-0.5 text-xs text-zinc-900 outline-offset-2 focus-visible:outline-2 focus-visible:outline-blue-500 dark:bg-zinc-800 dark:text-zinc-100 ${
                          invalid
                            ? "border-red-500"
                            : "border-zinc-300 dark:border-zinc-700"
                        }`}
                      />
                    </td>
                  ))}
                  <td className="py-1">
                    <button
                      type="button"
                      aria-label={`Remover vértice ${index + 1}`}
                      disabled={!canRemove}
                      onClick={() => handleRemoveVertex(index)}
                      className="flex h-5 w-5 items-center justify-center rounded text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={handleAddVertex}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        + Adicionar Vértice
      </button>

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}