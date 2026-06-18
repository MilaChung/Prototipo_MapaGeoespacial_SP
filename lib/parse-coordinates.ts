import type { Feature, Polygon } from "geojson";

export type CoordFormat = "lat,lng" | "lng,lat";

export type ParseSuccess = {
  ok: true;
  coordinates: [number, number][]; // sempre [lng, lat] normalizado
  feature: Feature<Polygon>; // GeoJSON pronto
};

export type ParseError = {
  ok: false;
  errors: string[]; // ex: ["Linha 3: par inválido 'abc,xyz'"]
};

export type ParseResult = ParseSuccess | ParseError;

const LAT_RANGE: [number, number] = [-90, 90];
const LNG_RANGE: [number, number] = [-180, 180];

function inRange(value: number, [min, max]: [number, number]): boolean {
  return value >= min && value <= max;
}

export function parseCoordinates(
  rawText: string,
  format: CoordFormat
): ParseResult {
  const errors: string[] = [];
  const coordinates: [number, number][] = [];

  const lines = rawText.split("\n").map((line) => line.trim());

  lines.forEach((line, index) => {
    if (line === "" || line.startsWith("#")) return;

    const lineNumber = index + 1;
    const tokens = line.split(/[,\s\t]+/).filter((token) => token !== "");

    if (tokens.length !== 2) {
      errors.push(`Linha ${lineNumber}: par inválido '${line}'`);
      return;
    }

    const values: number[] = [];
    let hasInvalidNumber = false;

    for (const token of tokens) {
      const value = parseFloat(token);
      if (Number.isNaN(value)) {
        errors.push(`Linha ${lineNumber}: valor não numérico '${token}'`);
        hasInvalidNumber = true;
        break;
      }
      values.push(value);
    }

    if (hasInvalidNumber) return;

    const [first, second] = values;
    let lng: number;
    let lat: number;

    if (format === "lat,lng") {
      if (!inRange(first, LAT_RANGE)) {
        errors.push(`Linha ${lineNumber}: latitude fora da faixa [-90,90] '${first}'`);
        return;
      }
      if (!inRange(second, LNG_RANGE)) {
        errors.push(`Linha ${lineNumber}: longitude fora da faixa [-180,180] '${second}'`);
        return;
      }
      lat = first;
      lng = second;
    } else {
      if (!inRange(first, LNG_RANGE)) {
        errors.push(`Linha ${lineNumber}: longitude fora da faixa [-180,180] '${first}'`);
        return;
      }
      if (!inRange(second, LAT_RANGE)) {
        errors.push(`Linha ${lineNumber}: latitude fora da faixa [-90,90] '${second}'`);
        return;
      }
      lng = first;
      lat = second;
    }

    coordinates.push([lng, lat]);
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  if (coordinates.length < 3) {
    return {
      ok: false,
      errors: [`Mínimo de 3 pontos válidos para formar um polígono, encontrado(s) ${coordinates.length}`],
    };
  }

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  const ring =
    last[0] === first[0] && last[1] === first[1]
      ? coordinates
      : [...coordinates, first];

  const feature: Feature<Polygon> = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };

  return { ok: true, coordinates: ring, feature };
}

// parseCoordinates("-22.76, -43.60\n-22.73, -43.56", 'lat,lng')
// → ok: true, coordinates[0] = [-43.60, -22.76]
// parseCoordinates("-43.60, -22.76\n-43.56, -22.73", 'lng,lat')
// → ok: true, coordinates[0] = [-43.60, -22.76]
// parseCoordinates("abc, xyz", 'lat,lng')
// → ok: false, errors: ["Linha 1: valor não numérico 'abc'"]