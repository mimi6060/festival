import { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Mentions Legales',
  description: 'Mentions legales de Festival Platform',
};

export default function LegalPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-4">Mentions Legales</h1>
          <p className="text-white/60 mb-8">Informations legales concernant Festival Platform</p>

          <Card variant="solid" padding="lg" className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Editeur du site</h2>
              <div className="text-white/70 space-y-2">
                <p>
                  <strong className="text-white">Raison sociale :</strong> Festival Platform SAS
                </p>
                <p>
                  <strong className="text-white">Capital social :</strong> 10 000 euros
                </p>
                <p>
                  <strong className="text-white">Siege social :</strong> 123 Avenue des Festivals,
                  75001 Paris, France
                </p>
                <p>
                  <strong className="text-white">RCS :</strong> Paris B 123 456 789
                </p>
                <p>
                  <strong className="text-white">Numero de TVA :</strong> FR 12 345678901
                </p>
                <p>
                  <strong className="text-white">Directeur de la publication :</strong> Jean Dupont
                </p>
                <p>
                  <strong className="text-white">Contact :</strong>{' '}
                  <Link href="/contact" className="text-primary-400 hover:text-primary-300">
                    contact@festivalhub.com
                  </Link>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Hebergement</h2>
              <div className="text-white/70 space-y-2">
                <p>
                  <strong className="text-white">Hebergeur :</strong> Vercel Inc.
                </p>
                <p>
                  <strong className="text-white">Adresse :</strong> 440 N Barranca Ave #4133,
                  Covina, CA 91723, USA
                </p>
                <p>
                  <strong className="text-white">Site web :</strong>{' '}
                  <a
                    href="https://vercel.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-400 hover:text-primary-300"
                  >
                    vercel.com
                  </a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Propriete intellectuelle</h2>
              <p className="text-white/70 leading-relaxed">
                L&apos;ensemble du contenu de ce site (textes, images, videos, logos, graphismes)
                est protege par le droit d&apos;auteur et appartient a Festival Platform ou a ses
                partenaires. Toute reproduction, meme partielle, est interdite sans autorisation
                prealable.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Donnees personnelles</h2>
              <p className="text-white/70 leading-relaxed">
                Conformement au Reglement General sur la Protection des Donnees (RGPD), vous
                disposez d&apos;un droit d&apos;acces, de rectification et de suppression de vos
                donnees personnelles. Pour en savoir plus, consultez notre{' '}
                <Link href="/privacy" className="text-primary-400 hover:text-primary-300">
                  politique de confidentialite
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Cookies</h2>
              <p className="text-white/70 leading-relaxed">
                Ce site utilise des cookies pour ameliorer votre experience. Pour en savoir plus sur
                l&apos;utilisation des cookies, consultez notre{' '}
                <Link href="/cookies" className="text-primary-400 hover:text-primary-300">
                  politique de cookies
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Mediateur</h2>
              <p className="text-white/70 leading-relaxed">
                En cas de litige, vous pouvez recourir gratuitement au service de mediation FEVAD
                (Federation du e-commerce et de la vente a distance) dont nous sommes membres. Le
                mediateur peut etre saisi pour tout litige de consommation dont le reglement
                n&apos;aurait pas abouti.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Credits</h2>
              <div className="text-white/70 space-y-2">
                <p>
                  <strong className="text-white">Design & Developpement :</strong> Equipe Festival
                  Platform
                </p>
                <p>
                  <strong className="text-white">Photos :</strong> Unsplash, Pexels
                </p>
                <p>
                  <strong className="text-white">Icones :</strong> Heroicons
                </p>
              </div>
            </section>
          </Card>

          <div className="mt-8 flex gap-4">
            <Link
              href="/terms"
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
              CGV
            </Link>
            <Link
              href="/privacy"
              className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-2"
            >
              Confidentialite
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
