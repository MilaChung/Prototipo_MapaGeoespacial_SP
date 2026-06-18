interface DrawToolbarProps {
  isDrawing: boolean;
  onStartDraw: () => void;
  onCancelDraw: () => void;
  isCoordinatePanelOpen: boolean;
  onToggleCoordinatePanel: () => void;
}

export default function DrawToolbar({
  isDrawing,
  onStartDraw,
  onCancelDraw,
  isCoordinatePanelOpen,
  onToggleCoordinatePanel,
}: DrawToolbarProps) {
  return (
    <div className="absolute left-1/2 top-12 z-10 flex -translate-x-1/2 gap-2 rounded-md border border-zinc-300 bg-white p-1.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <button
        type="button"
        aria-label="Iniciar desenho de polígono"
        aria-pressed={isDrawing}
        onClick={onStartDraw}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
          isDrawing
            ? "bg-blue-600 text-white"
            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M10 2 L18 8 L15 17 L5 17 L2 8 Z" strokeLinejoin="round" />
        </svg>
        Desenhar Região
      </button>

      {isDrawing && (
        <button
          type="button"
          aria-label="Cancelar desenho atual"
          onClick={onCancelDraw}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Cancelar Desenho
        </button>
      )}

      <button
        type="button"
        aria-label="Inserir coordenadas manualmente"
        aria-pressed={isCoordinatePanelOpen}
        onClick={onToggleCoordinatePanel}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
          isCoordinatePanelOpen
            ? "bg-blue-600 text-white"
            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
        }`}
      >
        📋 Inserir Coordenadas
      </button>
    </div>
  );
}