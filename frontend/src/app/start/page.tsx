import Link from 'next/link';

export default function StartPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-red">Extraplus Delivery</h1>
        <p className="mt-1 text-sm text-gray-600">
          Escolha como deseja entrar
        </p>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        <Link
          href="/home"
          className="h-12 rounded-lg bg-brand-red text-white text-sm font-semibold flex items-center justify-center"
        >
          Quero comprar
        </Link>
        <Link
          href="/admin"
          className="h-12 rounded-lg bg-gray-900 text-white text-sm font-semibold flex items-center justify-center"
        >
          Sou lojista
        </Link>
      </div>
    </main>
  );
}

