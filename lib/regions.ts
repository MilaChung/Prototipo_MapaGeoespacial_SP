export type Position = [longitude: number, latitude: number];

export interface RegionPolygonGeometry {
  type: "Polygon";
  coordinates: Position[][];
}

export interface RegionMultiPolygonGeometry {
  type: "MultiPolygon";
  coordinates: Position[][][];
}

export type RegionGeometry = RegionPolygonGeometry | RegionMultiPolygonGeometry;

export interface RegionProperties {
  id: number;
  code: string;
  descr: string;
  area_km2: number;
  latitude: number;
  longitude: number;
}

export interface RegionFeature {
  type: "Feature";
  geometry: RegionGeometry;
  properties: RegionProperties;
}

export interface RegionFeatureCollection {
  type: "FeatureCollection";
  features: RegionFeature[];
}

export interface DrawnFeatureProperties {
  id: string;
  code: string;
  descr: string;
  obs?: string;
  area_km2?: number;
}

function isPosition(value: unknown): value is Position {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}

function isRegionGeometry(value: unknown): value is RegionGeometry {
  if (typeof value !== "object" || value === null) return false;
  const geometry = value as { type?: unknown; coordinates?: unknown };

  if (geometry.type === "Polygon") {
    return (
      Array.isArray(geometry.coordinates) &&
      geometry.coordinates.every(
        (ring) => Array.isArray(ring) && ring.every(isPosition)
      )
    );
  }

  if (geometry.type === "MultiPolygon") {
    return (
      Array.isArray(geometry.coordinates) &&
      geometry.coordinates.every(
        (polygon) =>
          Array.isArray(polygon) &&
          polygon.every(
            (ring) => Array.isArray(ring) && ring.every(isPosition)
          )
      )
    );
  }

  return false;
}

function isRegionProperties(value: unknown): value is RegionProperties {
  if (typeof value !== "object" || value === null) return false;
  const props = value as Record<string, unknown>;

  return (
    typeof props.id === "number" &&
    typeof props.code === "string" &&
    typeof props.descr === "string" &&
    typeof props.area_km2 === "number" &&
    typeof props.latitude === "number" &&
    typeof props.longitude === "number"
  );
}

function isRegionFeature(value: unknown): value is RegionFeature {
  if (typeof value !== "object" || value === null) return false;
  const feature = value as { type?: unknown; geometry?: unknown; properties?: unknown };

  return (
    feature.type === "Feature" &&
    isRegionGeometry(feature.geometry) &&
    isRegionProperties(feature.properties)
  );
}

export function isRegionFeatureCollection(
  data: unknown
): data is RegionFeatureCollection {
  if (typeof data !== "object" || data === null) return false;
  const collection = data as { type?: unknown; features?: unknown };

  return (
    collection.type === "FeatureCollection" &&
    Array.isArray(collection.features) &&
    collection.features.every(isRegionFeature)
  );
}

export async function loadRegions(): Promise<RegionFeatureCollection> {
  // Captura o basePath configurado no next.config.ts dinamicamente
  const basePath = process.env.__NEXT_ROUTER_BASEPATH || "";
  
  const response = await fetch(`${basePath}/regions.json`);

  if (!response.ok) {
    throw new Error(
      `Falha ao carregar ${basePath}/regions.json: ${response.status} ${response.statusText}`
    );
  }

  const data: unknown = await response.json();

  if (!isRegionFeatureCollection(data)) {
    throw new Error(
      "Conteúdo de /regions.json não corresponde ao formato esperado de RegionFeatureCollection"
    );
  }

  return data;
}
