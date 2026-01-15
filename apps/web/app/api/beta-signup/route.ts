import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema
const betaSignupSchema = z.object({
  email: z.string().email('Email invalide'),
  festivalName: z.string().min(2, 'Nom du festival requis'),
  estimatedSize: z.enum(['small', 'medium', 'large', 'xlarge']),
  message: z.string().optional(),
});

type BetaSignup = z.infer<typeof betaSignupSchema>;

// Interface pour stocker les inscriptions
interface BetaSignupRecord extends BetaSignup {
  createdAt: string;
  id: string;
}

// Stockage temporaire en mémoire (à remplacer par une vraie DB plus tard)
const signups: BetaSignupRecord[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    const result = betaSignupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: result.error.issues,
        },
        { status: 400 }
      );
    }

    const data = result.data;

    // Vérifier si l'email existe déjà
    const existingSignup = signups.find((s) => s.email === data.email);
    if (existingSignup) {
      return NextResponse.json(
        {
          error: 'Cet email est déjà inscrit au programme beta',
        },
        { status: 409 }
      );
    }

    // Créer l'enregistrement
    const record: BetaSignupRecord = {
      ...data,
      id: `beta-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    // Sauvegarder
    signups.push(record);

    // Log pour le développement (à remplacer par envoi email/webhook en production)
    // TODO: Replace with proper logging service in production

    // TODO: En production, ajouter ici:
    // 1. Sauvegarde en base de données (Prisma)
    // 2. Envoi d'email de confirmation
    // 3. Notification Slack/Discord pour l'équipe
    // 4. Ajout à la mailing list

    // Simulation d'envoi d'email (à implémenter)
    await sendWelcomeEmail(data.email, data.festivalName);

    // Notification interne (à implémenter)
    await notifyTeam(record);

    return NextResponse.json(
      {
        success: true,
        message: 'Inscription enregistrée avec succès',
        data: {
          id: record.id,
          email: record.email,
          festivalName: record.festivalName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing beta signup:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Une erreur est survenue lors du traitement de votre demande',
      },
      { status: 500 }
    );
  }
}

// GET endpoint pour récupérer les statistiques (admin only - à sécuriser)
export async function GET() {
  return NextResponse.json({
    total: signups.length,
    bySize: {
      small: signups.filter((s) => s.estimatedSize === 'small').length,
      medium: signups.filter((s) => s.estimatedSize === 'medium').length,
      large: signups.filter((s) => s.estimatedSize === 'large').length,
      xlarge: signups.filter((s) => s.estimatedSize === 'xlarge').length,
    },
    recent: signups.slice(-5).map((s) => ({
      festivalName: s.festivalName,
      estimatedSize: s.estimatedSize,
      createdAt: s.createdAt,
    })),
  });
}

// Fonction pour envoyer l'email de bienvenue
async function sendWelcomeEmail(email: string, festivalName: string) {
  // TODO: Implémenter l'envoi d'email avec votre service (SendGrid, Mailgun, etc.)
  void email;
  void festivalName;

  // Exemple de contenu d'email:
  // Sujet: "Bienvenue dans le programme Beta de Festival Platform !"
  // Corps:
  // - Remerciement
  // - Prochaines étapes
  // - Contact de l'équipe
  // - Lien vers la documentation

  return Promise.resolve();
}

// Fonction pour notifier l'équipe
async function notifyTeam(record: BetaSignupRecord) {
  // TODO: Implémenter la notification (Slack webhook, Discord, email, etc.)
  void record;

  // Exemple d'intégration Slack:
  // const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  // if (slackWebhookUrl) {
  //   await fetch(slackWebhookUrl, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       text: `🎉 Nouveau festival beta: *${record.festivalName}*`,
  //       blocks: [
  //         {
  //           type: 'section',
  //           text: {
  //             type: 'mrkdwn',
  //             text: `*${record.festivalName}* vient de s'inscrire au programme beta!`
  //           }
  //         },
  //         {
  //           type: 'section',
  //           fields: [
  //             { type: 'mrkdwn', text: `*Email:*\n${record.email}` },
  //             { type: 'mrkdwn', text: `*Taille:*\n${getSizeLabel(record.estimatedSize)}` },
  //           ]
  //         }
  //       ]
  //     }),
  //   });
  // }

  return Promise.resolve();
}

// _getSizeLabel intentionally unused - kept for future Slack webhook integration
// function _getSizeLabel(size: string): string {
//   const labels: Record<string, string> = {
//     small: 'Petit (<5K)',
//     medium: 'Moyen (5K-20K)',
//     large: 'Grand (20K-100K)',
//     xlarge: 'Très grand (>100K)',
//   };
//   return labels[size] || size;
// }
