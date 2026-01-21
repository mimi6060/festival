'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const helpCategories = [
  {
    id: 'billetterie',
    title: 'Billetterie',
    description: 'Achat, annulation et modification de billets',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
        />
      </svg>
    ),
    topics: [
      { title: 'Comment acheter des billets ?', href: '/faq#billetterie' },
      { title: 'Modifier ma commande', href: '/faq#billetterie' },
      { title: 'Politique de remboursement', href: '/refunds' },
      { title: 'Transferer un billet', href: '/faq#billetterie' },
    ],
  },
  {
    id: 'paiement',
    title: 'Paiement',
    description: 'Paiements, factures et cashless',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
    topics: [
      { title: 'Modes de paiement acceptes', href: '/faq#paiement' },
      { title: 'Systeme cashless', href: '/cashless' },
      { title: 'Demander un remboursement', href: '/refunds' },
      { title: 'Telecharger une facture', href: '/account/orders' },
    ],
  },
  {
    id: 'compte',
    title: 'Compte',
    description: 'Gestion de compte et securite',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
    topics: [
      { title: 'Creer un compte', href: '/auth/register' },
      { title: 'Mot de passe oublie', href: '/auth/forgot-password' },
      { title: 'Modifier mon profil', href: '/account/settings' },
      { title: 'Supprimer mon compte', href: '/account/settings' },
    ],
  },
  {
    id: 'application',
    title: 'Application',
    description: 'Application mobile et fonctionnalites',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
    topics: [
      { title: "Telecharger l'application", href: '/beta' },
      { title: 'Notifications push', href: '/account/settings' },
      { title: 'Scanner les billets', href: '/faq' },
      { title: 'Mode hors ligne', href: '/faq' },
    ],
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = helpCategories
    .map((category) => ({
      ...category,
      topics: category.topics.filter((topic) =>
        topic.title.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter(
      (category) =>
        category.topics.length > 0 ||
        category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Centre d&apos;<span className="text-primary-400">aide</span>
            </h1>
            <p className="text-white/60 text-lg max-w-2xl mx-auto mb-8">
              Trouvez rapidement des reponses a vos questions ou contactez notre equipe de support.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <svg
                  className="w-5 h-5 text-white/40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une question..."
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors text-lg"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {filteredCategories.map((category) => (
              <Card key={category.id} variant="solid" padding="lg">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-400 flex-shrink-0">
                    {category.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{category.title}</h2>
                    <p className="text-white/60 text-sm">{category.description}</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {category.topics.map((topic, index) => (
                    <li key={index}>
                      <Link
                        href={topic.href}
                        className="flex items-center gap-2 text-white/70 hover:text-primary-400 transition-colors py-1"
                      >
                        <svg
                          className="w-4 h-4 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        {topic.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          {/* Quick Links */}
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            <Card href="/faq" variant="glow" padding="md">
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
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-white mb-1">FAQ</h3>
                <p className="text-white/50 text-sm">Questions frequentes</p>
              </div>
            </Card>

            <Card href="/refunds" variant="glow" padding="md">
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
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-white mb-1">Remboursements</h3>
                <p className="text-white/50 text-sm">Politique et demandes</p>
              </div>
            </Card>

            <Card href="/privacy" variant="glow" padding="md">
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
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-white mb-1">Confidentialite</h3>
                <p className="text-white/50 text-sm">Vos donnees et RGPD</p>
              </div>
            </Card>
          </div>

          {/* Contact Section */}
          <Card variant="gradient" padding="lg" className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-500/20 flex items-center justify-center">
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
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Besoin d&apos;aide supplementaire ?
            </h2>
            <p className="text-white/60 mb-6 max-w-lg mx-auto">
              Notre equipe de support est disponible 7j/7 pour repondre a toutes vos questions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button as="link" href="/contact" variant="primary">
                Contacter le support
              </Button>
              <Button as="link" href="mailto:support@festivalhub.com" variant="secondary">
                support@festivalhub.com
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
