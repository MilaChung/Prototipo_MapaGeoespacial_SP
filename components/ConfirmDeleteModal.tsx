"use client";

import { useEffect, useRef } from "react";

interface ConfirmDeleteModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteModal({
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-description"
        className="w-80 rounded-md border border-zinc-300 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h2
          id="confirm-delete-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Deletar polígono?
        </h2>
        <p
          id="confirm-delete-description"
          className="mt-2 text-sm text-zinc-600 dark:text-zinc-400"
        >
          Esta ação não pode ser desfeita.
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Deletar
          </button>
        </div>
      </div>
    </div>
  );
}