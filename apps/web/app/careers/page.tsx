import { Metadata } from 'next';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Carrieres',
  description: 'Rejoignez l equipe Festival Platform',
};

export default function CareersPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        <h1 className="text-4xl font-bold text-white mb-4">Carrieres</h1>
        <p className="text-white/70 text-lg mb-8">
          Rejoignez notre equipe passionnee et contribuez a revolutionner l experience festival.
        </p>

        <div className="grid gap-6">
          <Card variant="solid" padding="lg">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Developpeur Full Stack</h2>
                <p className="text-white/60 mb-2">Paris, France - CDI</p>
                <p className="text-white/70">
                  Nous recherchons un developpeur Full Stack pour rejoindre notre equipe technique.
                </p>
              </div>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                Ouvert
              </span>
            </div>
          </Card>

          <Card variant="solid" padding="lg">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">UX Designer</h2>
                <p className="text-white/60 mb-2">Remote - CDI</p>
                <p className="text-white/70">
                  Concevez des experiences utilisateur exceptionnelles pour nos applications.
                </p>
              </div>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                Ouvert
              </span>
            </div>
          </Card>

          <Card variant="solid" padding="lg">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Community Manager</h2>
                <p className="text-white/60 mb-2">Paris, France - CDI</p>
                <p className="text-white/70">
                  Gerez notre presence sur les reseaux sociaux et notre communaute.
                </p>
              </div>
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                Bientot
              </span>
            </div>
          </Card>
        </div>

        <Card variant="gradient" padding="lg" className="mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Candidature spontanee</h2>
          <p className="text-white/70 mb-4">
            Vous ne trouvez pas le poste ideal ? Envoyez-nous votre candidature spontanee.
          </p>
          <a
            href="mailto:careers@festival-platform.com"
            className="inline-block px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Envoyer ma candidature
          </a>
        </Card>
      </div>
    </div>
  );
}
