import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as nodemailer from 'nodemailer';

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

// Email transporter (lazy initialization)
let transporter: nodemailer.Transporter | null = null;

function getEmailTransporter(): nodemailer.Transporter | null {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 1025;

  if (!host) {
    console.warn('SMTP not configured. Email sending will be disabled.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
  });

  return transporter;
}

function getSizeLabel(size: string): string {
  const labels: Record<string, string> = {
    small: 'Petit (<5K)',
    medium: 'Moyen (5K-20K)',
    large: 'Grand (20K-100K)',
    xlarge: 'Tres grand (>100K)',
  };
  return labels[size] || size;
}

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
  const emailTransporter = getEmailTransporter();

  if (!emailTransporter) {
    console.warn(
      `[Beta Signup] Email disabled - would send welcome to ${email} for ${festivalName}`
    );
    return;
  }

  const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@festival-platform.com';
  const fromName = process.env.SMTP_FROM_NAME || 'Festival Platform';

  try {
    await emailTransporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: 'Bienvenue dans le programme Beta de Festival Platform !',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f7;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f7;">
            <tr>
              <td align="center" style="padding: 40px 10px;">
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                  <tr>
                    <td style="padding: 40px;">
                      <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: #1a1a2e;">
                        Bienvenue dans le programme Beta !
                      </h1>
                      <p style="margin: 0 0 20px 0; font-size: 16px; color: #4a4a4a; line-height: 26px;">
                        Felicitations ! Votre festival <strong>${festivalName}</strong> a ete inscrit avec succes au programme Beta de Festival Platform.
                      </p>
                      <div style="margin: 25px 0; padding: 20px; background-color: #e8f5e9; border-radius: 8px; border-left: 4px solid #4caf50;">
                        <p style="margin: 0; font-size: 16px; color: #2e7d32; font-weight: 600;">
                          Vous faites partie des premiers adopteurs !
                        </p>
                      </div>
                      <p style="margin: 0 0 15px 0; font-size: 16px; color: #4a4a4a; line-height: 26px;">
                        En tant que membre du programme Beta, vous beneficiez de :
                      </p>
                      <ul style="margin: 0 0 25px 0; padding-left: 20px; font-size: 15px; color: #4a4a4a; line-height: 28px;">
                        <li><strong>Acces anticipe</strong> a toutes les nouvelles fonctionnalites</li>
                        <li><strong>Support prioritaire</strong> avec un contact dedie</li>
                        <li><strong>Tarifs preferentiels</strong> pendant toute la duree du programme Beta</li>
                        <li><strong>Influence directe</strong> sur le developpement de la plateforme</li>
                      </ul>
                      <h3 style="margin: 25px 0 15px 0; font-size: 18px; font-weight: 600; color: #1a1a2e;">
                        Prochaines etapes
                      </h3>
                      <p style="margin: 0 0 15px 0; font-size: 16px; color: #4a4a4a; line-height: 26px;">
                        Un membre de notre equipe vous contactera dans les <strong>48 heures</strong> pour planifier un appel de decouverte et configurer votre espace.
                      </p>
                      <p style="margin: 30px 0 0 0; font-size: 16px; color: #4a4a4a;">
                        A tres bientot !
                      </p>
                      <p style="margin: 5px 0 0 0; font-size: 16px; color: #1a1a2e; font-weight: 600;">
                        L'equipe Festival Platform
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `Bienvenue dans le programme Beta de Festival Platform !

Felicitations ! Votre festival "${festivalName}" a ete inscrit avec succes au programme Beta.

En tant que membre du programme Beta, vous beneficiez de :
- Acces anticipe a toutes les nouvelles fonctionnalites
- Support prioritaire avec un contact dedie
- Tarifs preferentiels pendant toute la duree du programme Beta
- Influence directe sur le developpement de la plateforme

Prochaines etapes:
Un membre de notre equipe vous contactera dans les 48 heures pour planifier un appel de decouverte et configurer votre espace.

A tres bientot !
L'equipe Festival Platform`,
    });

    console.warn(`[Beta Signup] Welcome email sent to ${email}`);
  } catch (error) {
    console.error(
      `[Beta Signup] Failed to send welcome email: ${error instanceof Error ? error.message : String(error)}`
    );
    // Don't throw - we don't want to fail the signup if email fails
  }
}

// Fonction pour notifier l'équipe
async function notifyTeam(record: BetaSignupRecord) {
  const notifications: Promise<void>[] = [];

  // Slack notification
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (slackWebhookUrl) {
    notifications.push(sendSlackNotification(slackWebhookUrl, record));
  }

  // Discord notification
  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (discordWebhookUrl) {
    notifications.push(sendDiscordNotification(discordWebhookUrl, record));
  }

  // Email notification to team
  const teamEmail = process.env.TEAM_NOTIFICATION_EMAIL || process.env.SUPPORT_EMAIL;
  if (teamEmail) {
    notifications.push(sendTeamEmailNotification(teamEmail, record));
  }

  // If no notification channels configured, just log
  if (notifications.length === 0) {
    console.warn(
      `[Beta Signup] Team notification disabled - new signup: ${record.festivalName} (${record.email})`
    );
    return;
  }

  await Promise.allSettled(notifications);
}

async function sendSlackNotification(webhookUrl: string, record: BetaSignupRecord): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `New beta signup: ${record.festivalName}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: 'New Beta Program Signup!',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${record.festivalName}* just signed up for the beta program!`,
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Email:*\n${record.email}` },
              { type: 'mrkdwn', text: `*Size:*\n${getSizeLabel(record.estimatedSize)}` },
            ],
          },
          ...(record.message
            ? [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*Message:*\n${record.message}`,
                  },
                },
              ]
            : []),
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `ID: \`${record.id}\` | Signed up: ${new Date(record.createdAt).toLocaleString()}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status}`);
    }

    console.warn(`[Beta Signup] Slack notification sent for ${record.festivalName}`);
  } catch (error) {
    console.error(
      `[Beta Signup] Slack notification failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function sendDiscordNotification(
  webhookUrl: string,
  record: BetaSignupRecord
): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: 'New Beta Program Signup!',
            color: 0x8b5cf6, // Purple color
            fields: [
              { name: 'Festival', value: record.festivalName, inline: true },
              { name: 'Email', value: record.email, inline: true },
              { name: 'Size', value: getSizeLabel(record.estimatedSize), inline: true },
              ...(record.message ? [{ name: 'Message', value: record.message }] : []),
            ],
            footer: {
              text: `ID: ${record.id}`,
            },
            timestamp: record.createdAt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status}`);
    }

    console.warn(`[Beta Signup] Discord notification sent for ${record.festivalName}`);
  } catch (error) {
    console.error(
      `[Beta Signup] Discord notification failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function sendTeamEmailNotification(
  teamEmail: string,
  record: BetaSignupRecord
): Promise<void> {
  const emailTransporter = getEmailTransporter();

  if (!emailTransporter) {
    console.warn(`[Beta Signup] Email disabled - would notify team about ${record.festivalName}`);
    return;
  }

  const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@festival-platform.com';
  const fromName = process.env.SMTP_FROM_NAME || 'Festival Platform';

  try {
    await emailTransporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: teamEmail,
      subject: `[Beta Signup] New festival: ${record.festivalName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
          <h1 style="color: #1a1a2e;">New Beta Program Signup</h1>
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border: 1px solid #ffc107; margin: 20px 0;">
            <strong>ID:</strong> ${record.id}
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Festival:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${record.festivalName}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;"><a href="mailto:${record.email}">${record.email}</a></td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Size:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${getSizeLabel(record.estimatedSize)}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Signed up:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date(record.createdAt).toLocaleString()}</td></tr>
            ${record.message ? `<tr><td style="padding: 10px;"><strong>Message:</strong></td><td style="padding: 10px;">${record.message}</td></tr>` : ''}
          </table>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">This is an automated notification from the Festival Platform beta signup system.</p>
        </body>
        </html>
      `,
      text: `New Beta Program Signup

Festival: ${record.festivalName}
Email: ${record.email}
Size: ${getSizeLabel(record.estimatedSize)}
Signed up: ${new Date(record.createdAt).toLocaleString()}
${record.message ? `Message: ${record.message}` : ''}

ID: ${record.id}`,
    });

    console.warn(`[Beta Signup] Team email notification sent to ${teamEmail}`);
  } catch (error) {
    console.error(
      `[Beta Signup] Team email notification failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
