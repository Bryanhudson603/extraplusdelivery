'use client';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ reset }: Props) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="bg-white rounded-xl shadow-md px-6 py-5 text-center max-w-sm mx-auto">
            <h1 className="text-lg font-semibold text-red-600 mb-2">
              Ocorreu um erro inesperado
            </h1>
            <p className="text-sm text-gray-600 mb-4">
              Já estamos recarregando o aplicativo para você.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Recarregar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
