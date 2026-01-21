import { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Politique de Remboursement - FestivalHub',
  description: 'Politique de remboursement et conditions de retour pour vos billets de festival.',
};

export default function RefundsPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Politique de <span className="text-primary-400">Remboursement</span>
            </h1>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Decouvrez nos conditions de remboursement et comment effectuer une demande.
            </p>
          </div>

          {/* Key Info Cards */}
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            <Card variant="solid" padding="md">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary-500/20 flex items-center justify-center">
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
                <h3 className="font-semibold text-white mb-1">30 jours</h3>
                <p className="text-white/50 text-sm">Delai de remboursement</p>
              </div>
            </Card>

            <Card variant="solid" padding="md">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-green-500/20 flex items-center justify-center">
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-white mb-1">100%</h3>
                <p className="text-white/50 text-sm">Remboursement integral</p>
              </div>
            </Card>

            <Card variant="solid" padding="md">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-pink-500/20 flex items-center justify-center">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-white mb-1">5-10 jours</h3>
                <p className="text-white/50 text-sm">Traitement de la demande</p>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <Card variant="solid" padding="lg" className="mb-8">
            <div className="space-y-8 text-white/70">
              <section>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <span className="text-primary-400 font-bold text-sm">1</span>
                  </div>
                  Conditions de remboursement
                </h2>
                <p className="mb-4">
                  Les billets achetes sur FestivalHub peuvent etre rembourses sous les conditions
                  suivantes :
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    <strong className="text-white">Demande anticipee :</strong> La demande doit etre
                    effectuee au moins 14 jours avant la date de l&apos;evenement.
                  </li>
                  <li>
                    <strong className="text-white">Billet non utilise :</strong> Le billet ne doit
                    pas avoir ete scanne ou valide.
                  </li>
                  <li>
                    <strong className="text-white">Billet original :</strong> Le billet ne doit pas
                    avoir ete transfere a une autre personne.
                  </li>
                  <li>
                    <strong className="text-white">Evenement non annule :</strong> En cas
                    d&apos;annulation par l&apos;organisateur, le remboursement est automatique et
                    integral.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <span className="text-primary-400 font-bold text-sm">2</span>
                  </div>
                  Delais de remboursement
                </h2>
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/50 text-left">
                        <th className="pb-3">Delai avant l&apos;evenement</th>
                        <th className="pb-3">Montant rembourse</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/70">
                      <tr className="border-t border-white/10">
                        <td className="py-3">Plus de 30 jours</td>
                        <td className="py-3">
                          <span className="text-green-400 font-semibold">100%</span>
                        </td>
                      </tr>
                      <tr className="border-t border-white/10">
                        <td className="py-3">Entre 14 et 30 jours</td>
                        <td className="py-3">
                          <span className="text-yellow-400 font-semibold">
                            80% (frais de service retenus)
                          </span>
                        </td>
                      </tr>
                      <tr className="border-t border-white/10">
                        <td className="py-3">Moins de 14 jours</td>
                        <td className="py-3">
                          <span className="text-red-400 font-semibold">Non remboursable</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-white/50">
                  Note : Ces delais peuvent varier selon les conditions specifiques de chaque
                  festival. Consultez les conditions de vente au moment de l&apos;achat.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <span className="text-primary-400 font-bold text-sm">3</span>
                  </div>
                  Comment demander un remboursement
                </h2>
                <ol className="space-y-4">
                  <li className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0 text-primary-400 font-semibold text-sm">
                      1
                    </div>
                    <div>
                      <p className="text-white font-medium">Connectez-vous a votre compte</p>
                      <p className="text-white/60 text-sm">
                        Accedez a votre espace personnel sur FestivalHub.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0 text-primary-400 font-semibold text-sm">
                      2
                    </div>
                    <div>
                      <p className="text-white font-medium">Accedez a &quot;Mes Commandes&quot;</p>
                      <p className="text-white/60 text-sm">
                        Retrouvez la commande contenant le billet a rembourser.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0 text-primary-400 font-semibold text-sm">
                      3
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        Cliquez sur &quot;Demander un remboursement&quot;
                      </p>
                      <p className="text-white/60 text-sm">
                        Selectionnez le ou les billets concernes et confirmez votre demande.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0 text-primary-400 font-semibold text-sm">
                      4
                    </div>
                    <div>
                      <p className="text-white font-medium">Recevez votre remboursement</p>
                      <p className="text-white/60 text-sm">
                        Le remboursement sera credite sur votre moyen de paiement original sous 5 a
                        10 jours ouvrables.
                      </p>
                    </div>
                  </li>
                </ol>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <span className="text-primary-400 font-bold text-sm">4</span>
                  </div>
                  Cas particuliers
                </h2>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>
                      <strong className="text-white">Annulation de l&apos;evenement :</strong>{' '}
                      Remboursement automatique a 100% sous 14 jours.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>
                      <strong className="text-white">Report de l&apos;evenement :</strong> Choix
                      entre conservation du billet ou remboursement integral.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>
                      <strong className="text-white">Solde cashless :</strong> Remboursable sous 30
                      jours apres la fin du festival.
                    </span>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <span className="text-primary-400 font-bold text-sm">5</span>
                  </div>
                  Exclusions
                </h2>
                <p className="mb-3">
                  Les elements suivants ne sont pas eligibles au remboursement :
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Billets achetes sur le marche secondaire (non officiels)</li>
                  <li>Frais de service pour les billets rembourses partiellement</li>
                  <li>
                    Options supplementaires (camping, parking) sauf si incluses dans le billet
                  </li>
                  <li>Billets utilises ou scannes, meme partiellement</li>
                </ul>
              </section>
            </div>
          </Card>

          {/* Contact CTA */}
          <Card variant="gradient" padding="lg" className="text-center">
            <h2 className="text-xl font-bold text-white mb-4">
              Besoin d&apos;aide pour votre remboursement ?
            </h2>
            <p className="text-white/60 mb-6">
              Notre equipe de support est disponible pour vous accompagner dans vos demarches.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button as="link" href="/contact" variant="primary">
                Contacter le support
              </Button>
              <Button as="link" href="/account/orders" variant="secondary">
                Voir mes commandes
              </Button>
            </div>
          </Card>

          {/* Related Links */}
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/terms" className="text-white/50 hover:text-primary-400 transition-colors">
              Conditions generales de vente
            </Link>
            <span className="text-white/30">|</span>
            <Link href="/faq" className="text-white/50 hover:text-primary-400 transition-colors">
              Questions frequentes
            </Link>
            <span className="text-white/30">|</span>
            <Link href="/help" className="text-white/50 hover:text-primary-400 transition-colors">
              Centre d&apos;aide
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
