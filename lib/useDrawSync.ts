import { useCallback, useRef } from "react";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import type { Feature, Polygon } from "geojson";
import type { Map as MapLibreMapInstance } from "maplibre-gl";
import { MAPLIBRE_DRAW_STYLES } from "@/lib/draw-theme";
import type { DrawnFeatureProperties } from "@/lib/regions";

type DrawnFeature = Feature<Polygon, Partial<DrawnFeatureProperties>>;

interface UseDrawSyncOptions {
  onFeaturesChange: (updater: (previous: DrawnFeature[]) => DrawnFeature[]) => void;
}

export function useDrawSync({ onFeaturesChange }: UseDrawSyncOptions) {
  const drawRef = useRef<MapboxDraw | null>(null);
  const isUpdatingFromCode = useRef(false);
  const isUpdatingFromDraw = useRef(false);

  const consumeIsUpdatingFromDraw = useCallback(() => {
    const wasUpdatingFromDraw = isUpdatingFromDraw.current;
    isUpdatingFromDraw.current = false;
    return wasUpdatingFromDraw;
  }, []);

  const syncToMap = useCallback((features: DrawnFeature[]) => {
    const draw = drawRef.current;
    if (!draw) return;

    isUpdatingFromCode.current = true;
    draw.set({
      type: "FeatureCollection",
      features,
    });
    setTimeout(() => {
      isUpdatingFromCode.current = false;
    }, 0);
  }, []);

  const initDraw = useCallback(
    (
      map: MapLibreMapInstance,
      handlers?: {
        onCreate?: (event: MapboxDraw.DrawCreateEvent) => void;
        onModeChange?: (event: MapboxDraw.DrawModeChangeEvent) => void;
        onSelectionChange?: (event: MapboxDraw.DrawSelectionChangeEvent) => void;
      }
    ) => {
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        defaultMode: "simple_select",
        styles: MAPLIBRE_DRAW_STYLES,
      });
      drawRef.current = draw;
      // react-map-gl typings target maplibre's IControl; MapboxDraw implements the
      // structurally compatible mapbox-gl IControl, so the cast is safe at runtime.
      map.addControl(draw as unknown as Parameters<typeof map.addControl>[0]);

      const handleCreate = (event: MapboxDraw.DrawCreateEvent) => {
        if (isUpdatingFromCode.current) return;
        const created = event.features as unknown as DrawnFeature[];
        isUpdatingFromDraw.current = true;
        onFeaturesChange((previous) => [...previous, ...created]);
        handlers?.onCreate?.(event);
      };

      const handleUpdate = (event: MapboxDraw.DrawUpdateEvent) => {
        if (isUpdatingFromCode.current) return;
        const updated = event.features as unknown as DrawnFeature[];
        isUpdatingFromDraw.current = true;
        onFeaturesChange((previous) =>
          previous.map((feature) => {
            const match = updated.find((candidate) => candidate.id === feature.id);
            return match ?? feature;
          })
        );
      };

      const handleDelete = (event: MapboxDraw.DrawDeleteEvent) => {
        if (isUpdatingFromCode.current) return;
        const deletedIds = new Set(event.features.map((feature) => feature.id));
        isUpdatingFromDraw.current = true;
        onFeaturesChange((previous) =>
          previous.filter((feature) => !deletedIds.has(feature.id))
        );
      };

      map.on("draw.create", handleCreate);
      map.on("draw.update", handleUpdate);
      map.on("draw.delete", handleDelete);

      if (handlers?.onModeChange) {
        map.on("draw.modechange", handlers.onModeChange);
      }
      if (handlers?.onSelectionChange) {
        map.on("draw.selectionchange", handlers.onSelectionChange);
      }

      const destroy = () => {
        map.off("draw.create", handleCreate);
        map.off("draw.update", handleUpdate);
        map.off("draw.delete", handleDelete);
        if (handlers?.onModeChange) {
          map.off("draw.modechange", handlers.onModeChange);
        }
        if (handlers?.onSelectionChange) {
          map.off("draw.selectionchange", handlers.onSelectionChange);
        }
        map.removeControl(draw as unknown as Parameters<typeof map.addControl>[0]);
        drawRef.current = null;
      };

      return { draw, destroy };
    },
    [onFeaturesChange]
  );

  return { drawRef, syncToMap, initDraw, consumeIsUpdatingFromDraw };
}