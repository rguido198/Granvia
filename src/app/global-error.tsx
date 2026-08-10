"use client";

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es-MX">
      <body className="min-h-screen bg-sand-100 font-sans text-ink flex items-center justify-center p-6 text-center">
        <div className="bg-sand-50 border border-hairline p-8 rounded-sm shadow-md max-w-md space-y-4">
          <h2 className="text-xl font-bold font-display text-terra">Error Global de Aplicación</h2>
          <p className="text-xs text-ink-500 font-sans">
            Ocurrió una interrupción al cargar el layout raíz.
          </p>
          {_error?.message && (
            <div className="p-3 bg-sand-200 border border-hairline rounded text-[11px] font-mono text-ink text-left overflow-auto max-h-36">
              <p className="font-bold mb-1">Detalle técnico:</p>
              <p>{_error.message}</p>
            </div>
          )}
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-dune-900 text-sand-100 font-bold text-xs rounded-xs hover:bg-dune-800 transition-all cursor-pointer"
          >
            Reintentar Carga Global
          </button>
        </div>
      </body>
    </html>
  );
}
