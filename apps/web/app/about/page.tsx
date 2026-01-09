import { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'A propos - FestivalHub',
  description: 'Decouvrez FestivalHub, la plateforme de gestion de festivals la plus complete.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              A propos de <span className="text-primary-400">FestivalHub</span>
            </h1>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              La plateforme tout-en-un pour organiser, gerer et vivre les meilleurs festivals.
            </p>
          </div>

          {/* Mission */}
          <Card variant="glow" padding="lg" className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Notre Mission</h2>
            <p className="text-white/70 mb-4">
              FestivalHub est ne de la passion pour la musique et les evenements live. Notre mission
              est de simplifier l&apos;organisation de festivals tout en offrant une experience
              inoubliable aux festivaliers.
            </p>
            <p className="text-white/70">
              Nous croyons que chaque festival devrait etre une celebration unique, et notre
              plateforme est concue pour rendre cela possible.
            </p>
          </Card>

          {/* Values */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card variant="solid" padding="lg">
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
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Innovation</h3>
              <p className="text-white/60 text-sm">
                Technologie de pointe pour une gestion simplifiee.
              </p>
            </Card>

            <Card variant="solid" padding="lg">
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Communaute</h3>
              <p className="text-white/60 text-sm">
                Connecter les festivaliers et les organisateurs.
              </p>
            </Card>

            <Card variant="solid" padding="lg">
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
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Securite</h3>
              <p className="text-white/60 text-sm">
                Protection des donnees et paiements securises.
              </p>
            </Card>
          </div>

          {/* CTA */}
          <Card variant="gradient" padding="lg" className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Pret a commencer ?</h2>
            <p className="text-white/60 mb-6">
              Rejoignez des milliers d&apos;organisateurs et de festivaliers.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button as="link" href="/festivals" variant="primary" size="lg">
                Decouvrir les festivals
              </Button>
              <Button as="link" href="/contact" variant="secondary" size="lg">
                Nous contacter
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
