import { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Cashless - Paiements sans contact',
  description: 'Rechargez votre compte cashless et payez sans contact sur le festival.',
};

export default function CashlessPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Paiement <span className="text-primary-400">Cashless</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Payez rapidement et en toute sécurité sur le festival grâce à votre bracelet NFC. Plus
            de file d&apos;attente, plus de monnaie, juste du plaisir !
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card variant="solid" padding="lg" className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/20 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-primary-400"
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
            <h3 className="text-xl font-semibold text-white mb-3">Rapide</h3>
            <p className="text-white/60">
              Paiement en moins de 2 secondes avec votre bracelet NFC. Fini les files d&apos;attente
              !
            </p>
          </Card>

          <Card variant="solid" padding="lg" className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-green-400"
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
            <h3 className="text-xl font-semibold text-white mb-3">Sécurisé</h3>
            <p className="text-white/60">
              Votre bracelet est personnel et sécurisé. En cas de perte, bloquez-le depuis
              l&apos;app.
            </p>
          </Card>

          <Card variant="solid" padding="lg" className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-pink-500/20 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-pink-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Remboursable</h3>
            <p className="text-white/60">
              Solde non utilisé ? Demandez un remboursement après le festival en quelques clics.
            </p>
          </Card>
        </div>

        {/* How it works */}
        <Card variant="gradient" padding="lg" className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Comment ça marche ?</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-400">
                1
              </div>
              <h4 className="font-semibold text-white mb-2">Achetez votre billet</h4>
              <p className="text-white/60 text-sm">
                Votre bracelet NFC est inclus avec chaque billet
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-400">
                2
              </div>
              <h4 className="font-semibold text-white mb-2">Rechargez en ligne</h4>
              <p className="text-white/60 text-sm">Via l&apos;app ou sur les bornes du festival</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-400">
                3
              </div>
              <h4 className="font-semibold text-white mb-2">Payez sans contact</h4>
              <p className="text-white/60 text-sm">Scannez votre bracelet chez tous les vendeurs</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-400">
                4
              </div>
              <h4 className="font-semibold text-white mb-2">Suivez vos dépenses</h4>
              <p className="text-white/60 text-sm">Consultez votre historique dans l&apos;app</p>
            </div>
          </div>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Prêt à profiter du cashless ?</h2>
          <p className="text-white/60 mb-8">
            Connectez-vous pour recharger votre compte ou consulter votre solde.
          </p>
          <div className="flex gap-4 justify-center">
            <Button as="link" href="/auth/login" variant="primary" size="lg">
              Se connecter
            </Button>
            <Button as="link" href="/festivals" variant="secondary" size="lg">
              Voir les festivals
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
