"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  AttributionControl,
  Source,
  Layer,
} from "react-map-gl/maplibre";
import type { MapLayerMouseEvent, MapRef } from "react-map-gl/maplibre";
import type { LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type MapboxDraw from "@mapbox/mapbox-gl-draw";
import type { Feature, Polygon } from "geojson";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import type { RegionFeatureCollection, DrawnFeatureProperties } from "@/lib/regions";
import { getRegionColor } from "@/lib/region-colors";
import { useDrawSync } from "@/lib/useDrawSync";
import DrawToolbar from "@/components/DrawToolbar";
import SelectedFeaturePanel from "@/components/SelectedFeaturePanel";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import RegionForm from "@/components/RegionForm";
import CoordinatePanel from "@/components/CoordinatePanel";
import VertexTable from "@/components/VertexTable";

const AREA_FORMATTER = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

const DRAWN_FEATURE_COLOR = "#6366f1";

type DrawnFeature = Feature<Polygon, Partial<DrawnFeatureProperties>>;

const INITIAL_VIEW_STATE = {
  longitude: -43.58,
  latitude: -22.72,
  zoom: 10,
};

function getGeometriesBounds(
  geometries: Array<RegionFeatureCollection["features"][number]["geometry"] | Polygon>
): LngLatBoundsLike | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const geometry of geometries) {
    const polygons =
      geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

    for (const polygon of polygons) {
      for (const ring of polygon) {
        for (const [lng, lat] of ring) {
          if (lng < minLng) minLng = lng;
          if (lat < minLat) minLat = lat;
          if (lng > maxLng) maxLng = lng;
          if (lat > maxLat) maxLat = lat;
        }
      }
    }
  }

  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return null;

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

function getRegionsBounds(
  regions: RegionFeatureCollection
): LngLatBoundsLike | null {
  return getGeometriesBounds(regions.features.map((feature) => feature.geometry));
}

interface MapProps {
  regions: RegionFeatureCollection | null;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  drawnFeatures: DrawnFeature[];
  onDrawnFeaturesChange: (
    updater: (previous: DrawnFeature[]) => DrawnFeature[]
  ) => void;
  selectedDrawnId: string | number | null;
  onSelectDrawn: (id: string | number | null) => void;
  editRequestId?: string | number | null;
  deleteRequestId?: string | number | null;
}

export default function Map({
  regions,
  selectedId,
  onSelect,
  isEditMode,
  onToggleEditMode,
  drawnFeatures,
  onDrawnFeaturesChange,
  selectedDrawnId,
  onSelectDrawn,
  editRequestId,
  deleteRequestId,
}: MapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const { drawRef, syncToMap, initDraw, consumeIsUpdatingFromDraw } = useDrawSync({
    onFeaturesChange: onDrawnFeaturesChange,
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredRegionId, setHoveredRegionId] = useState<number | null>(null);
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [drawToast, setDrawToast] = useState<string | null>(null);
  const [selectedDrawnFeatureId, setSelectedDrawnFeatureId] = useState<
    string | number | null
  >(null);
  const [isEditingVertices, setIsEditingVertices] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [isCoordinatePanelOpen, setIsCoordinatePanelOpen] = useState(false);

  useEffect(() => {
    if (selectedId === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSelect(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, onSelect]);

  const selectedRegion =
    regions?.features.find(
      (candidate) => candidate.properties.id === selectedId
    ) ?? null;

  const regionsWithColor = regions
    ? {
        ...regions,
        features: regions.features.map((feature) => ({
          ...feature,
          properties: {
            ...feature.properties,
            color: getRegionColor(feature.properties.code),
          },
        })),
      }
    : null;

  useEffect(() => {
    if (selectedRegion) {
      closeButtonRef.current?.focus();
    }
  }, [selectedRegion]);

  useEffect(() => {
    if (!isLoaded || !regions) return;

    const bounds = getRegionsBounds(regions);
    if (bounds) {
      mapRef.current?.fitBounds(bounds, { padding: 40, duration: 0 });
    }
  }, [isLoaded, regions]);

  const previousSelectedIdRef = useRef<number | null>(null);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const previousId = previousSelectedIdRef.current;
    if (previousId !== null && previousId !== selectedId) {
      map.setFeatureState({ source: "regions", id: previousId }, { selected: false });
    }

    if (selectedId !== null) {
      map.setFeatureState({ source: "regions", id: selectedId }, { selected: true });

      if (selectedRegion) {
        const [longitude, latitude] = [
          selectedRegion.properties.longitude,
          selectedRegion.properties.latitude,
        ];
        map.flyTo({ center: [longitude, latitude], offset: [-150, 0] });
      }
    } else if (previousId !== null && regions) {
      const bounds = getRegionsBounds(regions);
      if (bounds) {
        map.fitBounds(bounds, { padding: 40 });
      }
    }

    previousSelectedIdRef.current = selectedId;
  }, [selectedId, selectedRegion, isLoaded, regions]);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  const setHover = useCallback(
    (id: number | null) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      if (hoveredRegionId !== null) {
        map.setFeatureState(
          { source: "regions", id: hoveredRegionId },
          { hover: false }
        );
      }

      if (id !== null) {
        map.setFeatureState({ source: "regions", id }, { hover: true });
      }

      setHoveredRegionId(id);
    },
    [hoveredRegionId]
  );

  const handleMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      if (isEditMode) return;

      const feature = event.features?.[0];
      const map = mapRef.current?.getMap();
      if (map) map.getCanvas().style.cursor = feature ? "pointer" : "";

      setHover(typeof feature?.id === "number" ? feature.id : null);
    },
    [isEditMode, setHover]
  );

  const handleMouseLeave = useCallback(() => {
    if (isEditMode) return;

    const map = mapRef.current?.getMap();
    if (map) map.getCanvas().style.cursor = "";
    setHover(null);
  }, [isEditMode, setHover]);

  const handleMapClick = useCallback(
    (event: MapLayerMouseEvent) => {
      if (isEditMode) return;

      const feature = event.features?.[0];
      if (!feature) return;

      const region = regions?.features.find(
        (candidate) => candidate.properties.id === feature.id
      );
      if (!region) return;

      onSelect(region.properties.id);
    },
    [isEditMode, regions, onSelect]
  );

  useEffect(() => {
    if (!isEditMode) {
      setSelectedDrawnFeatureId(null);
      setIsConfirmingDelete(false);
      return;
    }

    onSelect(null);
    setHover(null);

    const map = mapRef.current?.getMap();
    if (map) map.getCanvas().style.cursor = "";
  }, [isEditMode, onSelect, setHover]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!isLoaded || !map) return;

    const handleModeChange = (event: MapboxDraw.DrawModeChangeEvent) => {
      setIsDrawingPolygon(event.mode === "draw_polygon");
      setIsEditingVertices(event.mode === "direct_select");
    };

    const handleSelectionChange = (event: MapboxDraw.DrawSelectionChangeEvent) => {
      const selected = event.features[0];
      const id =
        selected && typeof selected.id !== "undefined" ? selected.id : null;
      setSelectedDrawnFeatureId(id);
      onSelectDrawn(id);
    };

    const handleCreate = () => {
      setIsDrawingPolygon(false);
      setDrawToast("Polígono criado! Adicione as informações da região.");
    };

    const { destroy } = initDraw(map, {
      onCreate: handleCreate,
      onModeChange: handleModeChange,
      onSelectionChange: handleSelectionChange,
    });

    return destroy;
  }, [isLoaded, initDraw, onSelectDrawn]);

  useEffect(() => {
    if (consumeIsUpdatingFromDraw()) return;
    syncToMap(drawnFeatures);
  }, [drawnFeatures, consumeIsUpdatingFromDraw, syncToMap]);

  useEffect(() => {
    if (!drawToast) return;
    const timeout = setTimeout(() => setDrawToast(null), 3000);
    return () => clearTimeout(timeout);
  }, [drawToast]);

  useEffect(() => {
    if (selectedDrawnId === null || selectedDrawnId === selectedDrawnFeatureId) {
      return;
    }

    const draw = drawRef.current;
    const map = mapRef.current?.getMap();
    if (!draw || !map) return;

    draw.changeMode("simple_select", { featureIds: [String(selectedDrawnId)] });
    setSelectedDrawnFeatureId(selectedDrawnId);

    const feature = drawnFeatures.find(
      (candidate) => candidate.id === selectedDrawnId
    );
    if (feature) {
      const bounds = getGeometriesBounds([feature.geometry]);
      if (bounds) map.fitBounds(bounds, { padding: 80 });
    }
  }, [selectedDrawnId, selectedDrawnFeatureId, drawnFeatures]);

  useEffect(() => {
    if (editRequestId === null || editRequestId === undefined) return;
    setIsSavingInfo(true);
  }, [editRequestId]);

  useEffect(() => {
    if (deleteRequestId === null || deleteRequestId === undefined) return;
    setIsConfirmingDelete(true);
  }, [deleteRequestId]);

  const handleStartDraw = useCallback(() => {
    drawRef.current?.changeMode("draw_polygon");
    setIsDrawingPolygon(true);
  }, []);

  const handleCancelDraw = useCallback(() => {
    drawRef.current?.changeMode("simple_select");
    setIsDrawingPolygon(false);
  }, []);

  const handleToggleCoordinatePanel = useCallback(() => {
    setIsCoordinatePanelOpen((previous) => !previous);
  }, []);

  const handleCloseCoordinatePanel = useCallback(() => {
    setIsCoordinatePanelOpen(false);
  }, []);

  const handleAddCoordinateFeature = useCallback(
    (feature: Feature<Polygon>) => {
      onDrawnFeaturesChange((previous) => [
        ...previous,
        { ...feature, id: crypto.randomUUID(), properties: {} },
      ]);
    },
    [onDrawnFeaturesChange]
  );

  const handleSyncCoordinateToMap = useCallback((feature: Feature<Polygon>) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const bounds = getGeometriesBounds([feature.geometry]);
    if (bounds) map.fitBounds(bounds, { padding: 80 });
  }, []);

  const handleVertexTableSync = useCallback(
    (feature: Feature<Polygon>) => {
      if (selectedDrawnFeatureId === null) return;

      onDrawnFeaturesChange((previous) =>
        previous.map((candidate) =>
          candidate.id === selectedDrawnFeatureId
            ? { ...candidate, geometry: feature.geometry }
            : candidate
        )
      );
    },
    [selectedDrawnFeatureId, onDrawnFeaturesChange]
  );

  const handleEditVertices = useCallback(() => {
    if (selectedDrawnFeatureId === null) return;
    const draw = drawRef.current;
    if (!draw) return;
    draw.changeMode("direct_select", {
      featureId: String(selectedDrawnFeatureId),
    });
    setIsEditingVertices(true);
  }, [selectedDrawnFeatureId]);

  const handleRequestDelete = useCallback(() => {
    setIsConfirmingDelete(true);
  }, []);

  const handleCancelDeleteRequest = useCallback(() => {
    setIsConfirmingDelete(false);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (selectedDrawnFeatureId === null) return;
    onDrawnFeaturesChange((previous) =>
      previous.filter((feature) => feature.id !== selectedDrawnFeatureId)
    );
    setSelectedDrawnFeatureId(null);
    setIsConfirmingDelete(false);
    setDrawToast("Polígono removido.");
  }, [selectedDrawnFeatureId, onDrawnFeaturesChange]);

  const handleSaveInfo = useCallback(() => {
    setIsSavingInfo(true);
  }, []);

  const handleCancelSaveInfo = useCallback(() => {
    setIsSavingInfo(false);
  }, []);

  const handleConfirmSaveInfo = useCallback(
    (values: {
      code: string;
      descr: string;
      obs: string;
      area_km2: number | undefined;
    }) => {
      if (selectedDrawnFeatureId === null) return;

      onDrawnFeaturesChange((previous) =>
        previous.map((feature) => {
          if (feature.id !== selectedDrawnFeatureId) return feature;

          return {
            ...feature,
            properties: {
              id: feature.properties?.id ?? crypto.randomUUID(),
              code: values.code,
              descr: values.descr,
              obs: values.obs,
              area_km2: values.area_km2,
            },
          };
        })
      );

      setIsSavingInfo(false);
      setDrawToast("Região salva com sucesso!");
    },
    [selectedDrawnFeatureId, onDrawnFeaturesChange]
  );

  const selectedDrawnFeature = drawnFeatures.find(
    (feature) => feature.id === selectedDrawnFeatureId
  );

  const savedDrawnFeatures = {
    type: "FeatureCollection" as const,
    features: drawnFeatures.filter(
      (feature) => feature.properties?.code && feature.properties?.descr
    ),
  };

  const handleClosePanel = useCallback(() => {
    const map = mapRef.current?.getMap();
    onSelect(null);
    map?.getCanvas().focus();
  }, [onSelect]);

  return (
    <div
      role="application"
      aria-label="Mapa de regiões hidrográficas"
      className="relative h-full w-full"
    >
      {!isLoaded && (
        <div
          aria-busy="true"
          aria-label="Carregando mapa"
          className="absolute inset-0 z-10 animate-pulse bg-zinc-200 dark:bg-zinc-800"
        />
      )}

      <MapLibreMap
        ref={mapRef}
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle={MAP_STYLE}
        attributionControl={false}
        interactiveLayerIds={["regions-fill"]}
        onLoad={() => setIsLoaded(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleMapClick}
        cursor={isDrawingPolygon ? "crosshair" : undefined}
        style={{ width: "100%", height: "100%" }}
      >
        <AttributionControl
          position="bottom-right"
          customAttribution="© OpenStreetMap contributors"
        />

        {isEditMode && (
          <div
            role="status"
            className="absolute left-1/2 top-3 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 shadow-sm"
          >
            {isEditingVertices
              ? "Arraste os vértices para ajustar o polígono"
              : "Modo de Edição Ativo — clique no mapa para desenhar"}
          </div>
        )}

        {isEditMode && (
          <DrawToolbar
            isDrawing={isDrawingPolygon}
            onStartDraw={handleStartDraw}
            onCancelDraw={handleCancelDraw}
            isCoordinatePanelOpen={isCoordinatePanelOpen}
            onToggleCoordinatePanel={handleToggleCoordinatePanel}
          />
        )}

        {isEditMode && isCoordinatePanelOpen && (
          <CoordinatePanel
            onAddFeature={handleAddCoordinateFeature}
            onSyncToMap={handleSyncCoordinateToMap}
            onClose={handleCloseCoordinatePanel}
          />
        )}

        {isEditMode && selectedDrawnFeatureId !== null && !isEditingVertices && (
          <SelectedFeaturePanel
            onEditVertices={handleEditVertices}
            onDelete={handleRequestDelete}
            onSaveInfo={handleSaveInfo}
          />
        )}

        {isEditMode && selectedDrawnFeatureId !== null && selectedDrawnFeature && (
          <VertexTable
            feature={selectedDrawnFeature}
            onSyncToMap={handleVertexTableSync}
          />
        )}

        {isConfirmingDelete && (
          <ConfirmDeleteModal
            onCancel={handleCancelDeleteRequest}
            onConfirm={handleConfirmDelete}
          />
        )}

        {isSavingInfo && (
          <RegionForm
            initialValues={selectedDrawnFeature?.properties}
            onCancel={handleCancelSaveInfo}
            onConfirm={handleConfirmSaveInfo}
          />
        )}

        {drawToast && (
          <div
            role="status"
            className="absolute left-1/2 top-3 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 shadow-sm"
          >
            {drawToast}
          </div>
        )}

        {savedDrawnFeatures.features.length > 0 && (
          <Source id="drawn-regions" type="geojson" data={savedDrawnFeatures}>
            <Layer
              id="drawn-regions-fill"
              type="fill"
              paint={{
                "fill-color": DRAWN_FEATURE_COLOR,
                "fill-opacity": 0.25,
              }}
            />
            <Layer
              id="drawn-regions-outline"
              type="line"
              paint={{
                "line-color": DRAWN_FEATURE_COLOR,
                "line-width": 2,
              }}
            />
          </Source>
        )}

        {regionsWithColor && (
          <Source
            id="regions"
            type="geojson"
            data={regionsWithColor}
            promoteId="id"
          >
            <Layer
              id="regions-fill"
              type="fill"
              paint={{
                "fill-color":
                  selectedId === null
                    ? ["get", "color"]
                    : [
                        "case",
                        ["==", ["get", "id"], selectedId],
                        ["get", "color"],
                        "#94a3b8",
                      ],
                "fill-opacity":
                  selectedId === null
                    ? [
                        "case",
                        ["boolean", ["feature-state", "hover"], false],
                        0.5,
                        0.2,
                      ]
                    : [
                        "case",
                        ["==", ["get", "id"], selectedId],
                        0.45,
                        0.12,
                      ],
                "fill-opacity-transition": { duration: 300 },
              }}
            />
            <Layer
              id="regions-outline"
              type="line"
              paint={{
                "line-color":
                  selectedId === null
                    ? ["get", "color"]
                    : [
                        "case",
                        ["==", ["get", "id"], selectedId],
                        ["get", "color"],
                        "#94a3b8",
                      ],
                "line-width":
                  selectedId === null
                    ? 1.5
                    : [
                        "case",
                        ["==", ["get", "id"], selectedId],
                        1.5,
                        1,
                      ],
                "line-opacity":
                  selectedId === null
                    ? 0.7
                    : [
                        "case",
                        ["==", ["get", "id"], selectedId],
                        0.7,
                        0.4,
                      ],
                "line-opacity-transition": { duration: 300 },
                "line-width-transition": { duration: 200 },
              }}
            />
            <Layer
              id="regions-selected-outline"
              type="line"
              filter={["==", ["get", "id"], selectedId ?? -1]}
              paint={{
                "line-color": ["get", "color"],
                "line-width": 4,
                "line-opacity": 1,
                "line-opacity-transition": { duration: 300 },
                "line-width-transition": { duration: 200 },
              }}
            />
          </Source>
        )}

        <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-md border border-zinc-300 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <button
            type="button"
            aria-label="Aumentar zoom"
            onClick={handleZoomIn}
            className="flex h-8 w-8 items-center justify-center text-lg leading-none text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            +
          </button>
          <div className="h-px bg-zinc-300 dark:bg-zinc-700" />
          <button
            type="button"
            aria-label="Diminuir zoom"
            onClick={handleZoomOut}
            className="flex h-8 w-8 items-center justify-center text-lg leading-none text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            −
          </button>
        </div>
      </MapLibreMap>

      <button
        type="button"
        aria-label={isEditMode ? "Sair do modo de edição" : "Ativar modo de edição"}
        onClick={onToggleEditMode}
        className={`absolute bottom-9 right-3 z-10 rounded-md px-3 py-1.5 text-sm font-medium text-white shadow-sm ${
          isEditMode
            ? "bg-amber-600 hover:bg-amber-700"
            : "bg-slate-700 hover:bg-slate-800"
        }`}
      >
        {isEditMode ? "✕ Sair da Edição" : "✏️ Modo Edição"}
      </button>

      {selectedRegion && (
        <article
          role="complementary"
          aria-label={`Região ${selectedRegion.properties.descr}`}
          style={{
            borderTop: `4px solid ${getRegionColor(selectedRegion.properties.code)}`,
          }}
          className="absolute right-3 bottom-3 top-3 z-10 w-72 overflow-y-auto rounded-md border border-zinc-300 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1.5">
              <span
                style={{
                  backgroundColor: getRegionColor(selectedRegion.properties.code),
                }}
                className="inline-flex w-fit items-center rounded px-2 py-0.5 text-xs font-semibold text-white"
              >
                {selectedRegion.properties.code}
              </span>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {selectedRegion.properties.descr}
              </h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Fechar painel de região"
              onClick={handleClosePanel}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              ×
            </button>
          </div>

          <dl className="space-y-2 text-sm">
            <div>
              <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                Código
              </dt>
              <dd className="text-zinc-900 dark:text-zinc-100">
                {selectedRegion.properties.code}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                Descrição
              </dt>
              <dd className="text-zinc-900 dark:text-zinc-100">
                {selectedRegion.properties.descr}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                Área
              </dt>
              <dd className="text-zinc-900 dark:text-zinc-100">
                {AREA_FORMATTER.format(selectedRegion.properties.area_km2)} km²
              </dd>
            </div>
          </dl>

          <button
            type="button"
            aria-label="Voltar para visão geral do mapa"
            onClick={handleClosePanel}
            className="mt-4 w-full border-t border-slate-200 pt-3 text-left text-sm font-medium text-slate-500 hover:text-slate-700 dark:border-zinc-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ← Ver todas as regiões
          </button>
        </article>
      )}
    </div>
  );
}