"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { DrawnFeatureProperties } from "@/lib/regions";

interface RegionFormProps {
  initialValues?: Partial<DrawnFeatureProperties>;
  onCancel: () => void;
  onConfirm: (values: {
    code: string;
    descr: string;
    obs: string;
    area_km2: number | undefined;
  }) => void;
}

interface FormErrors {
  code?: string;
  descr?: string;
}

export default function RegionForm({
  initialValues,
  onCancel,
  onConfirm,
}: RegionFormProps) {
  const [code, setCode] = useState(initialValues?.code ?? "");
  const [descr, setDescr] = useState(initialValues?.descr ?? "");
  const [obs, setObs] = useState(initialValues?.obs ?? "");
  const [areaKm2, setAreaKm2] = useState(
    initialValues?.area_km2 !== undefined ? String(initialValues.area_km2) : ""
  );
  const [errors, setErrors] = useState<FormErrors>({});

  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    if (!code.trim()) nextErrors.code = "Código da região é obrigatório.";
    if (!descr.trim()) nextErrors.descr = "Nome/Descrição é obrigatório.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onConfirm({
      code: code.trim(),
      descr: descr.trim(),
      obs: obs.trim(),
      area_km2: areaKm2.trim() === "" ? undefined : Number(areaKm2),
    });
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="region-form-title"
        className="w-96 rounded-md border border-zinc-300 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h2
          id="region-form-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Informações da Região
        </h2>

        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="region-form-code"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
            >
              Código da Região
            </label>
            <input
              ref={firstFieldRef}
              id="region-form-code"
              type="text"
              required
              maxLength={50}
              placeholder="ex: R-09"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              aria-invalid={errors.code ? true : undefined}
              aria-describedby={errors.code ? "region-form-code-error" : undefined}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-offset-2 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            {errors.code && (
              <span
                id="region-form-code-error"
                role="alert"
                className="text-sm text-red-600 dark:text-red-400"
              >
                {errors.code}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="region-form-descr"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
            >
              Nome/Descrição
            </label>
            <input
              id="region-form-descr"
              type="text"
              required
              maxLength={255}
              placeholder="ex: Micro Região - Rio X"
              value={descr}
              onChange={(event) => setDescr(event.target.value)}
              aria-invalid={errors.descr ? true : undefined}
              aria-describedby={errors.descr ? "region-form-descr-error" : undefined}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-offset-2 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            {errors.descr && (
              <span
                id="region-form-descr-error"
                role="alert"
                className="text-sm text-red-600 dark:text-red-400"
              >
                {errors.descr}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="region-form-obs"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
            >
              Observações
            </label>
            <textarea
              id="region-form-obs"
              rows={3}
              value={obs}
              onChange={(event) => setObs(event.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-offset-2 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="region-form-area"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
            >
              Área (km²)
            </label>
            <input
              id="region-form-area"
              type="number"
              step={0.01}
              min={0}
              value={areaKm2}
              onChange={(event) => setAreaKm2(event.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-offset-2 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}