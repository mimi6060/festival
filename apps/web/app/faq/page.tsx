'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const faqs = [
  {
    category: 'Billetterie',
    questions: [
      {
        q: 'Comment acheter des billets ?',
        a: 'Selectionnez le festival de votre choix, choisissez le type de billet souhaite et procedez au paiement securise par carte bancaire.',
      },
      {
        q: 'Puis-je annuler ou modifier ma commande ?',
        a: "Les billets peuvent etre rembourses jusqu'a 14 jours avant l'evenement, selon les conditions du festival. Contactez notre support pour toute demande.",
      },
      {
        q: 'Comment recevoir mes billets ?',
        a: 'Vos billets sont envoyes par email et disponibles dans votre espace "Mes Billets". Presentez le QR code a l\'entree du festival.',
      },
    ],
  },
  {
    category: 'Paiement Cashless',
    questions: [
      {
        q: "Qu'est-ce que le paiement cashless ?",
        a: "Le cashless est un systeme de paiement sans especes. Rechargez votre compte via l'application et payez vos consommations directement sur le festival.",
      },
      {
        q: 'Comment recharger mon compte ?',
        a: "Depuis votre espace personnel ou l'application mobile, vous pouvez recharger par carte bancaire. Le solde est disponible instantanement.",
      },
      {
        q: "Que se passe-t-il si je n'utilise pas tout mon solde ?",
        a: 'Apres le festival, vous pouvez demander un remboursement de votre solde restant depuis votre espace personnel.',
      },
    ],
  },
  {
    category: 'Compte & Securite',
    questions: [
      {
        q: 'Comment creer un compte ?',
        a: 'Cliquez sur "Creer un compte" et remplissez le formulaire avec votre email. Vous pouvez aussi vous connecter avec Google ou GitHub.',
      },
      {
        q: "J'ai oublie mon mot de passe",
        a: 'Cliquez sur "Mot de passe oublie" sur la page de connexion. Un lien de reinitialisation vous sera envoye par email.',
      },
      {
        q: 'Mes donnees sont-elles securisees ?',
        a: 'Oui, nous utilisons le chiffrement SSL et sommes conformes au RGPD. Vos donnees de paiement sont gerees par Stripe, certifie PCI-DSS.',
      },
    ],
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex items-center justify-between text-left"
      >
        <span className="text-white font-medium pr-4">{question}</span>
        <svg
          className={`w-5 h-5 text-white/60 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="pb-4 text-white/60 text-sm">{answer}</div>}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Questions <span className="text-primary-400">Frequentes</span>
            </h1>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Trouvez rapidement des reponses a vos questions les plus courantes.
            </p>
          </div>

          {/* FAQ Categories */}
          <div className="space-y-8">
            {faqs.map((category) => (
              <Card key={category.category} variant="solid" padding="lg">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-primary-400"
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
                  {category.category}
                </h2>
                <div>
                  {category.questions.map((faq, index) => (
                    <FAQItem key={index} question={faq.q} answer={faq.a} />
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* CTA */}
          <Card variant="gradient" padding="lg" className="mt-8 text-center">
            <h2 className="text-xl font-bold text-white mb-4">
              Vous n&apos;avez pas trouve votre reponse ?
            </h2>
            <p className="text-white/60 mb-6">
              Notre equipe de support est disponible pour vous aider.
            </p>
            <Button as="link" href="/contact" variant="primary">
              Contactez-nous
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
