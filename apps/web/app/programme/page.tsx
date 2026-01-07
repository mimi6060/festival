import { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Programme - Artistes et Scènes',
  description: 'Découvrez la programmation des festivals : artistes, horaires et scènes.',
};

// Ce sera remplacé par des données de l'API
const featuredArtists = [
  {
    name: 'DJ Snake',
    genre: 'Electro / EDM',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
  },
  {
    name: 'Christine and the Queens',
    genre: 'Pop / Art Pop',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop',
  },
  {
    name: 'Angèle',
    genre: 'Pop / Chanson',
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&h=400&fit=crop',
  },
  {
    name: 'Orelsan',
    genre: 'Rap / Hip-Hop',
    image: 'https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=400&h=400&fit=crop',
  },
  {
    name: 'Kungs',
    genre: 'House / Deep House',
    image: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=400&h=400&fit=crop',
  },
  {
    name: 'Clara Luciani',
    genre: 'Pop / Chanson Française',
    image: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=400&h=400&fit=crop',
  },
];

export default function ProgrammePage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            <span className="text-primary-400">Programme</span> & Artistes
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Découvrez les artistes qui vont enflammer les scènes de nos festivals. Créez votre
            programme personnalisé et ne manquez aucun concert !
          </p>
        </div>

        {/* Select Festival */}
        <Card variant="solid" padding="lg" className="mb-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Choisissez un festival</h2>
              <p className="text-white/60">
                Sélectionnez un festival pour voir sa programmation complète
              </p>
            </div>
            <Button as="link" href="/festivals" variant="primary">
              Voir les festivals
            </Button>
          </div>
        </Card>

        {/* Featured Artists */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8">Artistes à l&apos;affiche</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {featuredArtists.map((artist) => (
              <Card
                key={artist.name}
                variant="solid"
                padding="none"
                className="overflow-hidden group"
              >
                <div className="aspect-square relative">
                  <img
                    src={artist.image}
                    alt={artist.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="font-semibold text-white text-sm truncate">{artist.name}</h3>
                    <p className="text-white/60 text-xs truncate">{artist.genre}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8">Fonctionnalités du programme</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card variant="glow" padding="lg">
              <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-primary-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Planning jour par jour</h3>
              <p className="text-white/60 text-sm">
                Visualisez le programme complet par jour et par scène
              </p>
            </Card>

            <Card variant="glow" padding="lg">
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-pink-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Favoris personnalisés</h3>
              <p className="text-white/60 text-sm">
                Ajoutez vos artistes favoris pour créer votre programme
              </p>
            </Card>

            <Card variant="glow" padding="lg">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Notifications</h3>
              <p className="text-white/60 text-sm">
                Recevez des rappels avant le début de vos concerts
              </p>
            </Card>

            <Card variant="glow" padding="lg">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Découverte</h3>
              <p className="text-white/60 text-sm">
                Écoutez des extraits et découvrez de nouveaux artistes
              </p>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <Card variant="gradient" padding="lg" className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Prêt à planifier votre festival ?</h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            Connectez-vous pour créer votre programme personnalisé et recevoir des notifications
            avant chaque concert.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button as="link" href="/auth/login" variant="primary" size="lg">
              Se connecter
            </Button>
            <Button as="link" href="/auth/register" variant="secondary" size="lg">
              Créer un compte
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
