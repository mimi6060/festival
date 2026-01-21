import { Metadata } from 'next';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Partenaires',
  description: 'Devenez partenaire de Festival Platform',
};

export default function PartnersPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        <h1 className="text-4xl font-bold text-white mb-4">Nos Partenaires</h1>
        <p className="text-white/70 text-lg mb-8">
          Festival Platform collabore avec les meilleurs acteurs de l industrie evenementielle.
        </p>

        <div className="grid gap-8 md:grid-cols-3 mb-12">
          <Card variant="solid" padding="lg" className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-500/20 flex items-center justify-center">
              <span className="text-2xl">🎵</span>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Labels & Artistes</h2>
            <p className="text-white/60 text-sm">
              Partenariats avec les plus grands labels et artistes internationaux.
            </p>
          </Card>

          <Card variant="solid" padding="lg" className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-500/20 flex items-center justify-center">
              <span className="text-2xl">🎪</span>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Organisateurs</h2>
            <p className="text-white/60 text-sm">
              Solutions sur mesure pour les organisateurs de festivals.
            </p>
          </Card>

          <Card variant="solid" padding="lg" className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-500/20 flex items-center justify-center">
              <span className="text-2xl">💳</span>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Paiement</h2>
            <p className="text-white/60 text-sm">
              Integration avec les leaders du paiement securise.
            </p>
          </Card>
        </div>

        <Card variant="gradient" padding="lg">
          <h2 className="text-xl font-semibold text-white mb-4">Devenir partenaire</h2>
          <p className="text-white/70 mb-4">
            Interessé par un partenariat ? Contactez notre equipe pour discuter des opportunites.
          </p>
          <a
            href="mailto:partners@festival-platform.com"
            className="inline-block px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Nous contacter
          </a>
        </Card>
      </div>
    </div>
  );
}
