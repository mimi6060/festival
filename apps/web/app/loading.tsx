export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        {/* Spinner animé */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-purple-200/30 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-festival-accent rounded-full animate-spin"></div>
        </div>

        <h2 className="text-2xl font-semibold mb-3 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
          Chargement...
        </h2>
        <p className="text-gray-400">Veuillez patienter un instant</p>
      </div>
    </div>
  );
}
