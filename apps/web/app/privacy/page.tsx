import { Metadata } from 'next';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Politique de Confidentialite - FestivalHub',
  description: 'Politique de confidentialite et protection des donnees de FestivalHub.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Politique de Confidentialite</h1>
            <p className="text-white/60">Derniere mise a jour : Janvier 2026</p>
          </div>

          <Card variant="solid" padding="lg" className="prose prose-invert max-w-none">
            <div className="space-y-8 text-white/70">
              <section>
                <h2 className="text-xl font-bold text-white mb-4">1. Collecte des donnees</h2>
                <p>Nous collectons les donnees suivantes :</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Donnees d&apos;identification (nom, prenom, email)</li>
                  <li>Donnees de connexion (adresse IP, navigateur)</li>
                  <li>Donnees de transaction (achats, paiements)</li>
                  <li>Preferences et historique d&apos;utilisation</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-4">2. Utilisation des donnees</h2>
                <p>Vos donnees sont utilisees pour :</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Fournir et ameliorer nos services</li>
                  <li>Traiter vos commandes et paiements</li>
                  <li>Vous envoyer des communications importantes</li>
                  <li>Personnaliser votre experience</li>
                  <li>Assurer la securite de la plateforme</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-4">3. Partage des donnees</h2>
                <p>Nous ne vendons jamais vos donnees. Nous les partageons uniquement avec :</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Les organisateurs de festivals (pour la billetterie)</li>
                  <li>Nos prestataires de paiement (Stripe)</li>
                  <li>Les autorites competentes si requis par la loi</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-4">4. Vos droits (RGPD)</h2>
                <p>Conformement au RGPD, vous disposez des droits suivants :</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>
                    <strong className="text-white">Acces</strong> : obtenir une copie de vos donnees
                  </li>
                  <li>
                    <strong className="text-white">Rectification</strong> : corriger vos donnees
                  </li>
                  <li>
                    <strong className="text-white">Effacement</strong> : demander la suppression
                  </li>
                  <li>
                    <strong className="text-white">Portabilite</strong> : exporter vos donnees
                  </li>
                  <li>
                    <strong className="text-white">Opposition</strong> : vous opposer au traitement
                  </li>
                </ul>
                <p className="mt-4">
                  Pour exercer ces droits, contactez{' '}
                  <a
                    href="mailto:dpo@festivalhub.com"
                    className="text-primary-400 hover:text-primary-300"
                  >
                    dpo@festivalhub.com
                  </a>
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-4">5. Securite</h2>
                <p>
                  Nous utilisons des mesures de securite avancees pour proteger vos donnees :
                  chiffrement SSL/TLS, stockage securise, authentification forte, et audits
                  reguliers de securite.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-4">6. Cookies</h2>
                <p>
                  Nous utilisons des cookies pour ameliorer votre experience. Vous pouvez gerer vos
                  preferences de cookies dans les parametres de votre navigateur ou via notre
                  bandeau de consentement.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-4">7. Conservation</h2>
                <p>
                  Vos donnees sont conservees pendant la duree de votre compte, puis archivees
                  pendant la duree legale requise (generalement 5 ans pour les donnees comptables).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-4">8. Contact DPO</h2>
                <p>
                  Notre Delegue a la Protection des Donnees est joignable a{' '}
                  <a
                    href="mailto:dpo@festivalhub.com"
                    className="text-primary-400 hover:text-primary-300"
                  >
                    dpo@festivalhub.com
                  </a>
                </p>
              </section>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
