import { Metadata } from 'next';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Contact - FestivalHub',
  description: 'Contactez-nous pour toute question sur FestivalHub.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              <span className="text-primary-400">Contactez</span>-nous
            </h1>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Une question ? Un probleme ? Notre equipe est la pour vous aider.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Info */}
            <div className="space-y-6">
              <Card variant="solid" padding="lg">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
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
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Email</h3>
                    <p className="text-white/60 text-sm mb-2">Pour les questions generales</p>
                    <a
                      href="mailto:contact@festivalhub.com"
                      className="text-primary-400 hover:text-primary-300"
                    >
                      contact@festivalhub.com
                    </a>
                  </div>
                </div>
              </Card>

              <Card variant="solid" padding="lg">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center flex-shrink-0">
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
                        d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Support</h3>
                    <p className="text-white/60 text-sm mb-2">Aide technique et billetterie</p>
                    <a
                      href="mailto:support@festivalhub.com"
                      className="text-primary-400 hover:text-primary-300"
                    >
                      support@festivalhub.com
                    </a>
                  </div>
                </div>
              </Card>

              <Card variant="solid" padding="lg">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
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
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Adresse</h3>
                    <p className="text-white/60 text-sm">
                      123 Avenue des Festivals
                      <br />
                      75001 Paris, France
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Contact Form */}
            <Card variant="glow" padding="lg">
              <h2 className="text-xl font-bold text-white mb-6">Envoyez-nous un message</h2>
              <form className="space-y-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Nom</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                    placeholder="Votre nom"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                    placeholder="votre@email.com"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">Sujet</label>
                  <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors">
                    <option value="">Selectionnez un sujet</option>
                    <option value="general">Question generale</option>
                    <option value="billing">Facturation</option>
                    <option value="technical">Support technique</option>
                    <option value="partnership">Partenariat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">Message</label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors resize-none"
                    placeholder="Votre message..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-pink-500 text-white font-semibold hover:from-primary-600 hover:to-pink-600 transition-all"
                >
                  Envoyer
                </button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
