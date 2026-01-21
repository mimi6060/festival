'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  useAuthStore,
  selectUser,
  selectIsAuthenticated,
  selectIsLoading,
} from '@/stores/auth.store';

interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
}

interface PrivacySettings {
  shareProfile: boolean;
  showActivity: boolean;
  marketingEmails: boolean;
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const user = useAuthStore(selectUser);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isAuthLoading = useAuthStore(selectIsLoading);
  const initialize = useAuthStore((state) => state.initialize);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Profile form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Notification settings
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: true,
    push: true,
    sms: false,
  });

  // Language
  const [language, setLanguage] = useState('fr');

  // Privacy settings
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    shareProfile: false,
    showActivity: true,
    marketingEmails: false,
  });

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/account/settings');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  // Load user data
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ firstName, lastName, phone }),
      });

      if (response.ok) {
        setSaveMessage({ type: 'success', text: 'Profil mis a jour avec succes.' });
        initialize(); // Refresh user data
      } else {
        throw new Error('Failed to update profile');
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Erreur lors de la mise a jour du profil.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // In a real app, this would call an API endpoint
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSaveMessage({ type: 'success', text: 'Preferences de notifications mises a jour.' });
    } catch {
      setSaveMessage({ type: 'error', text: 'Erreur lors de la mise a jour des notifications.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/gdpr/delete-account', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        router.push('/auth/login?deleted=true');
      } else {
        throw new Error('Failed to delete account');
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Erreur lors de la suppression du compte.' });
      setShowDeleteConfirm(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading while checking auth
  if (isAuthLoading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-white/50 text-sm mb-4">
              <Link href="/account" className="hover:text-white transition-colors">
                Mon compte
              </Link>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="text-white">Parametres</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Parametres du compte</h1>
          </div>

          {/* Status Message */}
          {saveMessage && (
            <div
              className={`mb-6 p-4 rounded-xl border ${
                saveMessage.type === 'success'
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              {saveMessage.text}
            </div>
          )}

          <div className="space-y-6">
            {/* Profile Section */}
            <Card variant="solid" padding="lg">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-primary-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                Informations personnelles
              </h2>

              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Prenom</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Nom</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 text-sm mb-2">Email</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/50 cursor-not-allowed"
                  />
                  <p className="text-white/40 text-xs mt-1">
                    L&apos;email ne peut pas etre modifie.
                  </p>
                </div>

                <div>
                  <label className="block text-white/70 text-sm mb-2">Telephone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                  />
                </div>

                <div className="pt-4">
                  <Button variant="primary" onClick={handleSaveProfile} isLoading={isSaving}>
                    Enregistrer les modifications
                  </Button>
                </div>
              </div>
            </Card>

            {/* Notifications Section */}
            <Card variant="solid" padding="lg">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-pink-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                Notifications
              </h2>

              <div className="space-y-4">
                <ToggleSwitch
                  label="Notifications par email"
                  description="Recevez des mises a jour sur vos billets et festivals"
                  checked={notifications.email}
                  onChange={(checked) => setNotifications({ ...notifications, email: checked })}
                />

                <ToggleSwitch
                  label="Notifications push"
                  description="Recevez des alertes en temps reel sur votre appareil"
                  checked={notifications.push}
                  onChange={(checked) => setNotifications({ ...notifications, push: checked })}
                />

                <ToggleSwitch
                  label="Notifications SMS"
                  description="Recevez des rappels importants par SMS"
                  checked={notifications.sms}
                  onChange={(checked) => setNotifications({ ...notifications, sms: checked })}
                />

                <div className="pt-4">
                  <Button
                    variant="secondary"
                    onClick={handleSaveNotifications}
                    isLoading={isSaving}
                  >
                    Enregistrer les preferences
                  </Button>
                </div>
              </div>
            </Card>

            {/* Language Section */}
            <Card variant="solid" padding="lg">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                    />
                  </svg>
                </div>
                Langue
              </h2>

              <div>
                <label className="block text-white/70 text-sm mb-2">
                  Langue de l&apos;interface
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                >
                  <option value="fr">Francais</option>
                  <option value="en">English</option>
                  <option value="es">Espanol</option>
                  <option value="de">Deutsch</option>
                  <option value="it">Italiano</option>
                  <option value="pt">Portugues</option>
                </select>
              </div>
            </Card>

            {/* Privacy Section */}
            <Card variant="solid" padding="lg">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                Confidentialite
              </h2>

              <div className="space-y-4">
                <ToggleSwitch
                  label="Profil public"
                  description="Permettre aux autres utilisateurs de voir votre profil"
                  checked={privacy.shareProfile}
                  onChange={(checked) => setPrivacy({ ...privacy, shareProfile: checked })}
                />

                <ToggleSwitch
                  label="Afficher mon activite"
                  description="Montrer les festivals auxquels vous participez"
                  checked={privacy.showActivity}
                  onChange={(checked) => setPrivacy({ ...privacy, showActivity: checked })}
                />

                <ToggleSwitch
                  label="Emails marketing"
                  description="Recevoir des offres et promotions par email"
                  checked={privacy.marketingEmails}
                  onChange={(checked) => setPrivacy({ ...privacy, marketingEmails: checked })}
                />

                <div className="pt-4 flex items-center gap-4">
                  <Link
                    href="/privacy"
                    className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
                  >
                    Voir la politique de confidentialite
                  </Link>
                </div>
              </div>
            </Card>

            {/* Danger Zone */}
            <Card variant="solid" padding="lg" className="border-red-500/20">
              <h2 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                Zone de danger
              </h2>

              <p className="text-white/60 mb-4">
                La suppression de votre compte est irreversible. Toutes vos donnees seront
                definitivement effacees conformement au RGPD.
              </p>

              {!showDeleteConfirm ? (
                <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                  Supprimer mon compte
                </Button>
              ) : (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 font-medium mb-4">
                    Etes-vous certain de vouloir supprimer votre compte ? Cette action est
                    irreversible.
                  </p>
                  <div className="flex gap-3">
                    <Button variant="danger" onClick={handleDeleteAccount} isLoading={isSaving}>
                      Oui, supprimer
                    </Button>
                    <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Toggle Switch Component
function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/10 last:border-0">
      <div>
        <p className="text-white font-medium">{label}</p>
        <p className="text-white/50 text-sm">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-7 rounded-full transition-colors ${
          checked ? 'bg-primary-500' : 'bg-white/20'
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
