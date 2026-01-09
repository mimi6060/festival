import { Metadata } from 'next';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Conditions Generales - FestivalHub',
  description: "Conditions generales d'utilisation de FestivalHub.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              Conditions Generales d&apos;Utilisation
            </h1>
            <p className="text-white/60">Derniere mise a jour : Janvier 2026</p>
          </div>

          <Card variant="solid" padding="lg" className="prose prose-invert max-w-none">
            <div className="space-y-8 text-white/70">
              <section>
                <h2 className="text-xl font-bold text-white mb-4">1. Objet</h2>
                <p>
                  Les presentes conditions generales d&apos;utilisation (CGU) regissent l&apos;acces
                  et l&apos;utilisation de la plateforme FestivalHub. En utilisant nos services,
                  vous acceptez d&apos;etre lie par ces conditions.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-4">2. Services proposes</h2>
                <p>FestivalHub propose les services suivants :</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Achat de billets pour des festivals et evenements</li>
                  <li>Gestion de compte cashless</li>
                  <li>Consultation des programmes et artistes</li>
                  <li>Acces a des fonctionnalites personnalisees</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-4">3. Inscription et compte</h2>
                <p>
                  Pour acceder a certains services, vous devez creer un compte en fournissant des
                  informations exactes et a jour. Vous etes responsable de la confidentialite de vos
                  identifiants de connexion.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-4">4. Achats et paiements</h2>
                <p>
                  Tous les prix sont indiques en euros TTC. Le paiement est effectue de maniere
                  securisee via notre prestataire Stripe. Les billets sont nominatifs et non
                  remboursables sauf conditions speciales mentionnees par l&apos;organisateur.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-4">5. Propriete intellectuelle</h2>
                <p>
                  L&apos;ensemble du contenu de la plateforme (textes, images, logos, etc.) est
                  protege par le droit d&apos;auteur. Toute reproduction non autorisee est
                  strictement interdite.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-4">6. Responsabilite</h2>
                <p>
                  FestivalHub agit en tant qu&apos;intermediaire entre les organisateurs et les
                  participants. Nous ne sommes pas responsables des evenements organises par des
                  tiers.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-4">7. Modification des CGU</h2>
                <p>
                  Nous nous reservons le droit de modifier ces conditions a tout moment. Les
                  utilisateurs seront informes de tout changement significatif.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-4">8. Contact</h2>
                <p>
                  Pour toute question concernant ces conditions, contactez-nous a{' '}
                  <a
                    href="mailto:legal@festivalhub.com"
                    className="text-primary-400 hover:text-primary-300"
                  >
                    legal@festivalhub.com
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
