"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Feature, Polygon } from "geojson";
import RegionList from "@/components/RegionList";
import { loadRegions } from "@/lib/regions";
import type { RegionFeatureCollection, DrawnFeatureProperties } from "@/lib/regions";
import type MapComponent from "@/components/Map";

type DrawnFeature = Feature<Polygon, Partial<DrawnFeatureProperties>>;

const Map = dynamic<React.ComponentProps<typeof MapComponent>>(
  () => import("@/components/Map"),
  { ssr: false }
);

export default function Home() {
  const [regions, setRegions] = useState<RegionFeatureCollection | null>(
    null
  );
  const [regionsError, setRegionsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isListOpen, setIsListOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [drawnFeatures, setDrawnFeatures] = useState<DrawnFeature[]>([]);
  const [selectedDrawnId, setSelectedDrawnId] = useState<string | number | null>(
    null
  );
  const [editRequestId, setEditRequestId] = useState<string | number | null>(
    null
  );
  const [deleteRequestId, setDeleteRequestId] = useState<string | number | null>(
    null
  );

  useEffect(() => {
    loadRegions()
      .then(setRegions)
      .catch((error: unknown) => {
        setRegionsError(
          error instanceof Error ? error.message : "Erro ao carregar regiões"
        );
      });
  }, []);

  const handleSelect = (id: number | null) => {
    setSelectedId(id);
  };

  const handleToggleEditMode = () => {
    setIsEditMode((previous) => !previous);
  };

  const handleEditDrawn = (id: string | number) => {
    setSelectedDrawnId(id);
    setEditRequestId(`${id}-${Date.now()}`);
  };

  const handleDeleteDrawn = (id: string | number) => {
    setSelectedDrawnId(id);
    setDeleteRequestId(`${id}-${Date.now()}`);
  };

  return (
    <div className="relative flex flex-1 flex-col md:flex-row">
      {regionsError && (
        <div
          role="alert"
          className="absolute left-3 top-3 z-20 max-w-xs rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm dark:border-red-700 dark:bg-red-950 dark:text-red-300"
        >
          Erro ao carregar regiões: {regionsError}
        </div>
      )}

      <details
        open={isListOpen}
        onToggle={(event) => setIsListOpen(event.currentTarget.open)}
        className="order-2 border-t border-zinc-300 dark:border-zinc-700 md:hidden"
      >
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Lista de regiões
        </summary>
        <div className="max-h-64">
          <RegionList
            regions={regions}
            selectedId={selectedId}
            onSelect={handleSelect}
            isEditMode={isEditMode}
            drawnFeatures={drawnFeatures}
            selectedDrawnId={selectedDrawnId}
            onSelectDrawn={setSelectedDrawnId}
            onEditDrawn={handleEditDrawn}
            onDeleteDrawn={handleDeleteDrawn}
          />
        </div>
      </details>

      <div className="hidden md:order-1 md:block">
        <RegionList
          regions={regions}
          selectedId={selectedId}
          onSelect={handleSelect}
          isEditMode={isEditMode}
          drawnFeatures={drawnFeatures}
          selectedDrawnId={selectedDrawnId}
          onSelectDrawn={setSelectedDrawnId}
          onEditDrawn={handleEditDrawn}
          onDeleteDrawn={handleDeleteDrawn}
        />
      </div>

      <div className="relative order-1 flex-1 md:order-2">
        <Map
          regions={regions}
          selectedId={selectedId}
          onSelect={handleSelect}
          isEditMode={isEditMode}
          onToggleEditMode={handleToggleEditMode}
          drawnFeatures={drawnFeatures}
          onDrawnFeaturesChange={setDrawnFeatures}
          selectedDrawnId={selectedDrawnId}
          onSelectDrawn={setSelectedDrawnId}
          editRequestId={editRequestId}
          deleteRequestId={deleteRequestId}
        />
      </div>
    </div>
  );
}