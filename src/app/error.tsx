"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App boundary error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-sand-100 flex items-center justify-center p-6 text-center font-sans text-ink">
      <div className="bg-sand-50 border border-hairline p-8 rounded-sm shadow-md max-w-md space-y-4">
        <h2 className="text-xl font-bold font-display text-terra">Algo salió mal</h2>
        <p className="text-xs text-ink-500 font-sans">
          Ocurrió un error temporal al cargar este componente. Haz clic en reintentar para actualizar la vista.
        </p>
        {error?.message && (
          <div className="p-3 bg-sand-200 border border-hairline rounded text-[11px] font-mono text-ink text-left overflow-auto max-h-36">
            <p className="font-bold mb-1">Detalle técnico:</p>
            <p>{error.message}</p>
          </div>
        )}
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-dune-900 text-sand-100 font-bold text-xs rounded-xs hover:bg-dune-800 transition-all cursor-pointer"
        >
          Reintentar Carga
        </button>
      </div>
    </div>
  );
}
