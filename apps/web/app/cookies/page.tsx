import { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Politique de Cookies',
  description: 'Politique de gestion des cookies de Festival Platform',
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-4">Politique de Cookies</h1>
          <p className="text-white/60 mb-8">Derniere mise a jour : Janvier 2026</p>

          <Card variant="solid" padding="lg" className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                1. Qu&apos;est-ce qu&apos;un cookie ?
              </h2>
              <p className="text-white/70 leading-relaxed">
                Un cookie est un petit fichier texte stocke sur votre appareil lors de votre visite
                sur notre site. Les cookies nous permettent de reconnaitre votre navigateur et de
                memoriser certaines informations pour ameliorer votre experience.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                2. Types de cookies utilises
              </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5">
                  <h3 className="font-semibold text-primary-400 mb-2">Cookies essentiels</h3>
                  <p className="text-white/70 text-sm">
                    Necessaires au fonctionnement du site. Ils permettent la navigation et
                    l&apos;utilisation des fonctionnalites de base (authentification, panier,
                    securite).
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <h3 className="font-semibold text-primary-400 mb-2">Cookies de performance</h3>
                  <p className="text-white/70 text-sm">
                    Collectent des informations anonymes sur l&apos;utilisation du site pour nous
                    aider a ameliorer nos services.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <h3 className="font-semibold text-primary-400 mb-2">Cookies de fonctionnalite</h3>
                  <p className="text-white/70 text-sm">
                    Memorisent vos preferences (langue, region) pour personnaliser votre experience.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <h3 className="font-semibold text-primary-400 mb-2">Cookies publicitaires</h3>
                  <p className="text-white/70 text-sm">
                    Utilises pour afficher des publicites pertinentes. Ces cookies peuvent suivre
                    votre navigation sur differents sites.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. Gestion des cookies</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Vous pouvez controler et/ou supprimer les cookies comme vous le souhaitez. Vous
                pouvez supprimer tous les cookies deja stockes sur votre ordinateur et configurer la
                plupart des navigateurs pour qu&apos;ils les bloquent.
              </p>
              <p className="text-white/70 leading-relaxed">
                Pour gerer vos preferences de cookies, utilisez les parametres de votre navigateur
                ou notre bandeau de consentement lors de votre premiere visite.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Duree de conservation</h2>
              <p className="text-white/70 leading-relaxed">
                Les cookies essentiels sont conserves pour la duree de votre session. Les autres
                cookies sont conserves pour une duree maximale de 13 mois conformement aux
                recommandations de la CNIL.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Contact</h2>
              <p className="text-white/70 leading-relaxed">
                Pour toute question concernant notre politique de cookies, contactez-nous a{' '}
                <Link href="/contact" className="text-primary-400 hover:text-primary-300">
                  notre page de contact
                </Link>
                .
              </p>
            </section>
          </Card>

          <div className="mt-8 flex gap-4">
            <Link
              href="/privacy"
              className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Politique de confidentialite
            </Link>
            <Link
              href="/terms"
              className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-2"
            >
              CGV
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
