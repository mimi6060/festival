import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
          Festival Platform
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          La plateforme tout-en-un pour gérer votre festival
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Link href="/festivals" className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/20 transition cursor-pointer">
            <h2 className="text-2xl font-semibold mb-3 text-festival-accent">🎫 Billetterie</h2>
            <p className="text-gray-300">Vente de billets en ligne avec QR codes sécurisés</p>
          </Link>

          <Link href="/account" className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/20 transition cursor-pointer">
            <h2 className="text-2xl font-semibold mb-3 text-festival-accent">💳 Cashless</h2>
            <p className="text-gray-300">Paiements NFC rapides et sans contact</p>
          </Link>

          <Link href="/festivals" className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/20 transition cursor-pointer">
            <h2 className="text-2xl font-semibold mb-3 text-festival-accent">📅 Programme</h2>
            <p className="text-gray-300">Gestion des artistes et des scènes</p>
          </Link>
        </div>

        <div className="mt-16 flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="px-8 py-3 bg-festival-accent hover:bg-pink-600 rounded-full font-semibold transition"
          >
            Se connecter
          </Link>
          <Link
            href="/auth/register"
            className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full font-semibold transition"
          >
            Créer un compte
          </Link>
        </div>
      </div>
    </main>
  );
}
