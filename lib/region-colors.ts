const REGION_COLORS: Record<string, string> = {
  "R-01": "#E63946", // vermelho
  "R-02": "#F4A261", // laranja
  "R-03": "#2A9D8F", // verde-água
  "R-04": "#457B9D", // azul-aço
  "R-05": "#8338EC", // roxo
  "R-06": "#FB8500", // âmbar
  "R-07": "#06D6A0", // verde-menta
  "R-08": "#3A86FF", // azul-brilhante
};

const FALLBACK_COLOR = "#888888";

export function getRegionColor(code: string): string {
  return REGION_COLORS[code] ?? FALLBACK_COLOR;
}