interface SelectedFeaturePanelProps {
  onEditVertices: () => void;
  onDelete: () => void;
  onSaveInfo: () => void;
}

export default function SelectedFeaturePanel({
  onEditVertices,
  onDelete,
  onSaveInfo,
}: SelectedFeaturePanelProps) {
  return (
    <div className="absolute left-1/2 top-24 z-10 flex w-64 -translate-x-1/2 flex-col gap-2 rounded-md border border-zinc-300 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Polígono selecionado
      </h2>

      <button
        type="button"
        aria-label="Editar vértices do polígono"
        onClick={onEditVertices}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        ✏️ Editar vértices
      </button>

      <button
        type="button"
        aria-label="Adicionar informações a este polígono"
        onClick={onSaveInfo}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        ✓ Salvar informações
      </button>

      <button
        type="button"
        aria-label="Deletar polígono selecionado"
        onClick={onDelete}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
      >
        🗑️ Deletar polígono
      </button>
    </div>
  );
}