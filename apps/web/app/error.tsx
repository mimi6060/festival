'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-red-400 to-pink-500 bg-clip-text text-transparent">
            Oups ! Une erreur est survenue
          </h2>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6">
          <p className="text-gray-300 mb-2">
            {error.message || "Une erreur inattendue s'est produite"}
          </p>
          {error.digest && <p className="text-sm text-gray-400">Référence: {error.digest}</p>}
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-8 py-3 bg-festival-accent hover:bg-pink-600 rounded-full font-semibold transition"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full font-semibold transition"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
}
