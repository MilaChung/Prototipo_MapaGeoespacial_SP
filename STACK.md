# Stack do Projeto — Prototipo_Maps

Resumo das bibliotecas, ferramentas e tecnologias utilizadas neste projeto, com base no [package.json](package.json) e na estrutura de código em [app/](app/), [components/](components/) e [lib/](lib/).

## Visão geral

Aplicação web (Next.js + React) para visualização e edição de regiões geográficas (polígonos hidrográficos) sobre um mapa interativo, com ferramentas de desenho/edição de geometrias e um painel manual de coordenadas.

## Framework e linguagem

- **[Next.js 16](node_modules/next/package.json)** — framework React (App Router), usado em modo client-heavy (`"use client"` na página principal e no mapa). Ver [app/layout.tsx](app/layout.tsx) e [app/page.tsx](app/page.tsx).
- **React 19** / **React DOM 19** — biblioteca de UI.
- **TypeScript 5** — tipagem estática em todo o código (`strict: true` no [tsconfig.json](tsconfig.json)).

## Mapas e geoespacial

- **[MapLibre GL JS](https://maplibre.org/)** (`maplibre-gl`) — motor de renderização do mapa (fork open-source do Mapbox GL JS), baseado em WebGL.
- **[react-map-gl](https://visgl.github.io/react-map-gl/)** (variante `/maplibre`) — wrapper React para o MapLibre, usado em [components/Map.tsx](components/Map.tsx) (`Map`, `Source`, `Layer`, `AttributionControl`).
- **[@mapbox/mapbox-gl-draw](https://github.com/mapbox/mapbox-gl-draw)** — plugin de desenho/edição de geometrias (polígonos) diretamente no mapa; integrado via hook customizado em [lib/useDrawSync.ts](lib/useDrawSync.ts) e estilizado em [lib/draw-theme.ts](lib/draw-theme.ts).
- **GeoJSON** (tipos `geojson`) — formato de dados para todas as geometrias (`Feature`, `Polygon`, `MultiPolygon`), validado manualmente em [lib/regions.ts](lib/regions.ts).
- Estilo de mapa configurável via env var `NEXT_PUBLIC_MAP_STYLE` (estilo MapLibre externo).

## Estilização

- **[Tailwind CSS 4](https://tailwindcss.com/)** (`@tailwindcss/postcss`) — utilitário CSS, aplicado via classes diretamente no JSX (dark mode incluso).
- **PostCSS** ([postcss.config.mjs](postcss.config.mjs)) — pipeline de transformação CSS usado pelo Tailwind.

## Qualidade de código

- **ESLint 9** + **eslint-config-next** — linting com regras específicas do Next.js.
- **@typescript-eslint** — regras de lint para TypeScript.

## Dados e scripts auxiliares

- **[clean-geojson.js](clean-geojson.js)** — script Node.js (sem dependências externas, usa `fs`/`path`) que extrai e normaliza um GeoJSON a partir de [raw_export.json](raw_export.json) (provavelmente exportado de uma ferramenta GIS/banco de dados) para [public/regions.json](public/regions.json), consumido em runtime por [lib/regions.ts](lib/regions.ts).

## Estrutura funcional dos componentes

| Componente | Responsabilidade |
|---|---|
| [Map.tsx](components/Map.tsx) | Orquestra o mapa, camadas GeoJSON, modo de edição e todos os subpainéis |
| [DrawToolbar.tsx](components/DrawToolbar.tsx) | Barra de ferramentas para iniciar/cancelar desenho |
| [CoordinatePanel.tsx](components/CoordinatePanel.tsx) | Entrada manual de coordenadas para criar polígonos |
| [VertexTable.tsx](components/VertexTable.tsx) | Tabela de vértices do polígono selecionado |
| [SelectedFeaturePanel.tsx](components/SelectedFeaturePanel.tsx) | Ações sobre a feição desenhada selecionada (editar/excluir/salvar) |
| [RegionForm.tsx](components/RegionForm.tsx) | Formulário de metadados da região (código, descrição, área) |
| [RegionList.tsx](components/RegionList.tsx) | Lista lateral de regiões (carregadas + desenhadas) |
| [ConfirmDeleteModal.tsx](components/ConfirmDeleteModal.tsx) | Modal de confirmação de exclusão |
| [lib/useDrawSync.ts](lib/useDrawSync.ts) | Hook que sincroniza o estado do MapboxDraw com o estado React |
| [lib/region-colors.ts](lib/region-colors.ts) | Mapeamento de cores por código de região |

## Diagrama de arquitetura

```mermaid
graph TD
    subgraph Browser["Navegador (Client-Side)"]
        Page["app/page.tsx<br/>(estado global: regions, drawnFeatures, seleção)"]
        Map["components/Map.tsx<br/>(orquestra MapLibre + Draw)"]
        RegionList["RegionList.tsx"]
        DrawToolbar["DrawToolbar.tsx"]
        CoordPanel["CoordinatePanel.tsx"]
        VertexTable["VertexTable.tsx"]
        SelPanel["SelectedFeaturePanel.tsx"]
        RegionForm["RegionForm.tsx"]
        ConfirmModal["ConfirmDeleteModal.tsx"]
        UseDrawSync["lib/useDrawSync.ts<br/>(hook)"]
    end

    subgraph Libs["Bibliotecas de Mapa"]
        ReactMapGL["react-map-gl/maplibre"]
        MapLibreGL["maplibre-gl<br/>(motor WebGL)"]
        MapboxDraw["@mapbox/mapbox-gl-draw<br/>(desenho de polígonos)"]
    end

    subgraph NextApp["Next.js 16 + React 19"]
        Layout["app/layout.tsx"]
        Tailwind["Tailwind CSS 4"]
    end

    subgraph DataPipeline["Pipeline de Dados"]
        RawExport["raw_export.json<br/>(export GIS bruto)"]
        CleanScript["clean-geojson.js<br/>(script Node)"]
        RegionsJSON["public/regions.json<br/>(GeoJSON normalizado)"]
        RegionsLib["lib/regions.ts<br/>(fetch + validação de tipos)"]
    end

    RawExport --> CleanScript --> RegionsJSON
    RegionsJSON -->|fetch /regions.json| RegionsLib --> Page

    Page --> Map
    Page --> RegionList
    Map --> DrawToolbar
    Map --> CoordPanel
    Map --> VertexTable
    Map --> SelPanel
    Map --> RegionForm
    Map --> ConfirmModal
    Map --> UseDrawSync

    Map --> ReactMapGL --> MapLibreGL
    UseDrawSync --> MapboxDraw
    MapboxDraw -.eventos draw.create/update/delete.-> UseDrawSync

    Layout --> Page
    Tailwind -.estiliza.-> Map
    Tailwind -.estiliza.-> RegionList

    style RawExport fill:#fef3c7
    style RegionsJSON fill:#d1fae5
    style MapLibreGL fill:#dbeafe
    style MapboxDraw fill:#dbeafe
    style ReactMapGL fill:#dbeafe
```

## Fluxo de dados resumido

1. `raw_export.json` (export bruto, ex: de um GIS/banco) é processado por `clean-geojson.js` e gravado em `public/regions.json`.
2. `lib/regions.ts` busca esse arquivo via `fetch` e valida o formato em runtime (type guards manuais, sem biblioteca de schema).
3. `app/page.tsx` mantém o estado central (regiões carregadas, feições desenhadas, seleção, modo de edição) e repassa para `components/Map.tsx`.
4. `components/Map.tsx` renderiza o mapa com `react-map-gl/maplibre`, desenha as regiões como camadas GeoJSON (`Source`/`Layer`) e integra o `@mapbox/mapbox-gl-draw` via o hook `lib/useDrawSync.ts` para permitir criar/editar/excluir polígonos manualmente.
5. Painéis auxiliares (`CoordinatePanel`, `VertexTable`, `RegionForm`, etc.) permitem refinar a geometria e os metadados de cada região desenhada.