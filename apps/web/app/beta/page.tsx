import type { Metadata } from 'next';
import Link from 'next/link';
import { BetaSignupForm } from './components/BetaSignupForm';

export const metadata: Metadata = {
  title: 'Programme Beta | Festival Platform - Solution tout-en-un pour festivals',
  description: 'Rejoignez les 50 premiers festivals à tester gratuitement notre plateforme complète de gestion de festivals. Billetterie, cashless, hébergement, analytics - tout en un.',
  openGraph: {
    title: 'Programme Beta | Festival Platform',
    description: 'Testez gratuitement la plateforme tout-en-un pour festivals. Saison 2026 gratuite + influence sur la roadmap.',
    type: 'website',
    images: [
      {
        url: '/og-beta.png',
        width: 1200,
        height: 630,
        alt: 'Festival Platform - Programme Beta',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Programme Beta | Festival Platform',
    description: 'Testez gratuitement la plateforme tout-en-un pour festivals',
  },
};

export default function BetaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 px-6">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center">
            <div className="inline-block mb-6 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full">
              <span className="text-purple-300 font-medium">🚀 Programme Beta Ouvert</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-purple-200 via-pink-300 to-purple-200 bg-clip-text text-transparent leading-tight">
              Orchestrez l'exceptionnel
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              La plateforme tout-en-un qui transforme la gestion de votre festival.<br />
              <span className="text-purple-300 font-semibold">Gratuit pour la saison 2026.</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="#signup"
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-purple-500/50"
              >
                Rejoindre le programme Beta
              </a>
              <a
                href="#features"
                className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full font-semibold text-lg transition-all backdrop-blur-sm"
              >
                Découvrir la plateforme
              </a>
            </div>
            <div className="mt-8 text-gray-400 text-sm">
              ⭐ Rejoignez les 50 premiers festivals à façonner l'avenir de l'industrie
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-6 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-white">
            Les défis quotidiens des organisateurs de festivals
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 hover:bg-red-500/20 transition">
              <div className="text-4xl mb-4">😰</div>
              <h3 className="text-xl font-semibold mb-3 text-red-300">Outils dispersés et coûteux</h3>
              <p className="text-gray-300">
                Jongler entre 5-7 plateformes différentes : billetterie, cashless, hébergement, communication...
                Des abonnements qui s'accumulent et des coûts qui explosent.
              </p>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-8 hover:bg-orange-500/20 transition">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-3 text-orange-300">Données fragmentées</h3>
              <p className="text-gray-300">
                Impossible d'avoir une vue d'ensemble. Les données sont éparpillées,
                les rapports manuels prennent des heures, et la prise de décision est ralentie.
              </p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-8 hover:bg-yellow-500/20 transition">
              <div className="text-4xl mb-4">💸</div>
              <h3 className="text-xl font-semibold mb-3 text-yellow-300">Commissions exorbitantes</h3>
              <p className="text-gray-300">
                Les plateformes traditionnelles prélèvent 6-12% de commission sur vos ventes.
                Sur 100k€ de CA, vous perdez jusqu'à 12k€ en frais.
              </p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-8 hover:bg-blue-500/20 transition">
              <div className="text-4xl mb-4">⏱️</div>
              <h3 className="text-xl font-semibold mb-3 text-blue-300">Temps perdu en coordination</h3>
              <p className="text-gray-300">
                Des semaines à coordonner les différents prestataires, résoudre les problèmes d'intégration,
                et former votre équipe sur plusieurs systèmes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
              Une seule plateforme.<br />Tout votre festival.
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Centralisez toute la gestion de votre festival sur une interface moderne, intuitive et puissante.
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/30 rounded-2xl p-8 backdrop-blur-sm">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-purple-300 mb-2">1</div>
                <p className="text-gray-300">Plateforme</p>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-pink-300 mb-2">0</div>
                <p className="text-gray-300">Installation complexe</p>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-purple-300 mb-2">∞</div>
                <p className="text-gray-300">Possibilités</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-white">
            Tout ce dont vous avez besoin, et plus encore
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 hover:bg-white/10 transition backdrop-blur-sm">
              <div className="text-5xl mb-6">🎫</div>
              <h3 className="text-xl font-semibold mb-4 text-purple-300">Billetterie intelligente</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Vente en ligne sécurisée</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>QR codes uniques et cryptés</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Gestion des quotas en temps réel</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Codes promo et early bird</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-8 hover:bg-white/10 transition backdrop-blur-sm">
              <div className="text-5xl mb-6">💳</div>
              <h3 className="text-xl font-semibold mb-4 text-pink-300">Cashless NFC</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Paiements sans contact ultra-rapides</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Bracelets NFC personnalisables</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Recharge en ligne ou sur place</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Remboursement automatique</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-8 hover:bg-white/10 transition backdrop-blur-sm">
              <div className="text-5xl mb-6">🏕️</div>
              <h3 className="text-xl font-semibold mb-4 text-purple-300">Hébergement</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Gestion camping et glamping</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Carte interactive des emplacements</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Check-in/out digital</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Réservation de véhicules</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-8 hover:bg-white/10 transition backdrop-blur-sm">
              <div className="text-5xl mb-6">📊</div>
              <h3 className="text-xl font-semibold mb-4 text-pink-300">Analytics en temps réel</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Dashboard KPI temps réel</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Rapports financiers automatisés</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Heatmaps et flux visiteurs</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Export CSV/PDF en un clic</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-8 hover:bg-white/10 transition backdrop-blur-sm">
              <div className="text-5xl mb-6">📅</div>
              <h3 className="text-xl font-semibold mb-4 text-purple-300">Programmation</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Gestion artistes et scènes</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Planning automatique</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>App mobile pour festivaliers</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Notifications push ciblées</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-8 hover:bg-white/10 transition backdrop-blur-sm">
              <div className="text-5xl mb-6">🍔</div>
              <h3 className="text-xl font-semibold mb-4 text-pink-300">Food & Drinks</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Marketplace vendeurs intégré</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Gestion stocks temps réel</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Commission automatique</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Analytics par stand</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-8 hover:bg-white/10 transition backdrop-blur-sm">
              <div className="text-5xl mb-6">👥</div>
              <h3 className="text-xl font-semibold mb-4 text-purple-300">Gestion équipe</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Planning staff automatisé</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Badges digitaux sécurisés</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Contrôle d'accès par zone</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Pointage et shifts</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-8 hover:bg-white/10 transition backdrop-blur-sm">
              <div className="text-5xl mb-6">🗺️</div>
              <h3 className="text-xl font-semibold mb-4 text-pink-300">Carte interactive</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Plan du festival personnalisable</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>POI (toilettes, bars, médical...)</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Itinéraires optimisés</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Mode offline pour visiteurs</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Beta Offer Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-purple-600/30 to-pink-600/30 border-2 border-purple-400/50 rounded-2xl p-10 backdrop-blur-sm shadow-2xl">
            <div className="text-center mb-8">
              <div className="inline-block px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full mb-6">
                <span className="text-yellow-300 font-semibold">🎁 Offre Exclusive Beta</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                Saison 2026 100% gratuite
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-3xl mb-3">🆓</div>
                <h3 className="font-semibold text-lg mb-2 text-purple-300">Accès complet gratuit</h3>
                <p className="text-gray-300 text-sm">
                  Toutes les fonctionnalités premium sans engagement ni carte bancaire pour toute la saison 2026.
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="font-semibold text-lg mb-2 text-pink-300">Influence sur la roadmap</h3>
                <p className="text-gray-300 text-sm">
                  Vos retours façonnent directement le produit. Proposez des features et votez sur les priorités.
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-3xl mb-3">🏆</div>
                <h3 className="font-semibold text-lg mb-2 text-purple-300">Tarif préférentiel à vie</h3>
                <p className="text-gray-300 text-sm">
                  -50% sur votre abonnement à vie une fois le produit lancé officiellement.
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-3xl mb-3">🤝</div>
                <h3 className="font-semibold text-lg mb-2 text-pink-300">Support prioritaire</h3>
                <p className="text-gray-300 text-sm">
                  Ligne directe avec l'équipe technique, onboarding personnalisé et accompagnement dédié.
                </p>
              </div>
            </div>

            <div className="bg-purple-900/30 border border-purple-400/30 rounded-xl p-6">
              <div className="flex items-start">
                <div className="text-2xl mr-4">⏰</div>
                <div>
                  <h4 className="font-semibold mb-2 text-white">Places limitées</h4>
                  <p className="text-gray-300 text-sm">
                    Nous recherchons 50 festivals pionniers pour co-construire la plateforme idéale.
                    Les inscriptions seront closes une fois ce quota atteint.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signup Form Section */}
      <section id="signup" className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Prêt à transformer votre festival ?
            </h2>
            <p className="text-xl text-gray-300">
              Remplissez le formulaire ci-dessous et rejoignez le mouvement.
            </p>
          </div>

          <BetaSignupForm />
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-12 backdrop-blur-sm">
            <div className="text-5xl mb-6">🎪</div>
            <h3 className="text-2xl md:text-3xl font-bold mb-4 text-white">
              Rejoignez les 50 premiers festivals
            </h3>
            <p className="text-xl text-gray-300 mb-8">
              Des organisateurs passionnés qui façonnent l'avenir de l'industrie des festivals.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <div className="text-4xl font-bold text-purple-300 mb-2">10K-500K</div>
                <p className="text-gray-400">Participants supportés</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-pink-300 mb-2">2026</div>
                <p className="text-gray-400">Gratuit toute la saison</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-purple-300 mb-2">24/7</div>
                <p className="text-gray-400">Support prioritaire</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4 text-white">Festival Platform</h4>
              <p className="text-gray-400 text-sm">
                La plateforme tout-en-un pour orchestrer l'exceptionnel.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Produit</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#features" className="text-gray-400 hover:text-purple-300 transition">Fonctionnalités</Link></li>
                <li><Link href="/festivals" className="text-gray-400 hover:text-purple-300 transition">Festivals</Link></li>
                <li><Link href="#signup" className="text-gray-400 hover:text-purple-300 transition">Programme Beta</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:contact@festivalplatform.com" className="text-gray-400 hover:text-purple-300 transition">Contact</a></li>
                <li><a href="mailto:support@festivalplatform.com" className="text-gray-400 hover:text-purple-300 transition">Support</a></li>
                <li><Link href="/faq" className="text-gray-400 hover:text-purple-300 transition">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Légal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="text-gray-400 hover:text-purple-300 transition">Confidentialité</Link></li>
                <li><Link href="/terms" className="text-gray-400 hover:text-purple-300 transition">CGU</Link></li>
                <li><Link href="/cookies" className="text-gray-400 hover:text-purple-300 transition">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2026 Festival Platform. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
