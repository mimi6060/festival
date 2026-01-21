import { Metadata } from 'next';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Presse',
  description: 'Espace presse et medias de Festival Platform',
};

export default function PressPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        <h1 className="text-4xl font-bold text-white mb-8">Espace Presse</h1>

        <div className="grid gap-8 md:grid-cols-2">
          <Card variant="solid" padding="lg">
            <h2 className="text-xl font-semibold text-white mb-4">Contact Presse</h2>
            <p className="text-white/70 mb-4">
              Pour toute demande presse, interview ou partenariat media, contactez notre equipe de
              communication.
            </p>
            <a
              href="mailto:presse@festival-platform.com"
              className="text-primary-400 hover:text-primary-300 transition-colors"
            >
              presse@festival-platform.com
            </a>
          </Card>

          <Card variant="solid" padding="lg">
            <h2 className="text-xl font-semibold text-white mb-4">Kit Media</h2>
            <p className="text-white/70 mb-4">
              Telechargez notre kit media comprenant logos, photos et informations sur la
              plateforme.
            </p>
            <button className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors">
              Telecharger le kit media
            </button>
          </Card>

          <Card variant="solid" padding="lg" className="md:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-4">Communiques de presse</h2>
            <p className="text-white/60">Aucun communique de presse disponible pour le moment.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
