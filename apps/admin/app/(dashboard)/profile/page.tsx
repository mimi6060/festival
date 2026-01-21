'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { usersApi } from '@/lib/api';
import { Avatar } from '@festival/ui';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updatedUser = await usersApi.updateProfile(user.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
      });

      // Update the user in auth context
      updateUser(updatedUser);

      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la mise a jour du profil';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      admin: 'Administrateur',
      organizer: 'Organisateur',
      staff: 'Staff',
      user: 'Utilisateur',
    };
    return roles[role?.toLowerCase()] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      organizer: 'bg-purple-100 text-purple-800',
      staff: 'bg-blue-100 text-blue-800',
      user: 'bg-gray-100 text-gray-800',
    };
    return colors[role?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return 'N/A';
    }
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
        <p className="text-gray-500 mt-1">Gerez vos informations personnelles et preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <Avatar src={user.avatar} name={`${user.firstName} ${user.lastName}`} size="2xl" />

              {/* Name and Role */}
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-gray-500">{user.email}</p>
              <span
                className={`mt-2 px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(user.role)}`}
              >
                {getRoleLabel(user.role)}
              </span>

              {/* Status */}
              <div className="mt-4 flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-400'}`}
                ></span>
                <span className="text-sm text-gray-600">
                  {user.isActive ? 'Compte actif' : 'Compte inactif'}
                </span>
              </div>
            </div>

            {/* Account Info */}
            <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Membre depuis</p>
                <p className="text-sm text-gray-900">{formatDate(user.createdAt)}</p>
              </div>
              {user.lastLogin && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    Derniere connexion
                  </p>
                  <p className="text-sm text-gray-900">{formatDate(user.lastLogin)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">ID Utilisateur</p>
                <p className="text-sm text-gray-900 font-mono">{user.id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Profile Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Informations personnelles</h2>
                <p className="text-sm text-gray-500">Mettez a jour vos informations de profil.</p>
              </div>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="btn-secondary">
                  Modifier
                </button>
              )}
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Prenom</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="input-field"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-900 py-2">{user.firstName || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="form-label">Nom</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="input-field"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-900 py-2">{user.lastName || '-'}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="form-label">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    className="input-field"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-900 py-2">{user.email}</p>
                )}
              </div>

              <div>
                <label className="form-label">Role</label>
                <p className="text-gray-900 py-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}
                  >
                    {getRoleLabel(user.role)}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">(Non modifiable)</span>
                </p>
              </div>

              {isEditing && (
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setError(null);
                      setFormData({
                        firstName: user.firstName || '',
                        lastName: user.lastName || '',
                        email: user.email || '',
                      });
                    }}
                    className="btn-secondary"
                    disabled={saving}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn-primary flex items-center gap-2"
                    disabled={saving}
                  >
                    {saving && (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    )}
                    Enregistrer
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-600 pt-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {error}
                </div>
              )}

              {saved && (
                <div className="flex items-center gap-2 text-green-600 pt-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Profil mis a jour avec succes
                </div>
              )}
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 mt-6">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Securite</h2>
              <p className="text-sm text-gray-500">Gerez la securite de votre compte.</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Mot de passe</p>
                  <p className="text-sm text-gray-500">
                    Derniere modification: il y a plus de 30 jours
                  </p>
                </div>
                <a href="/settings" className="btn-secondary">
                  Modifier
                </a>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Authentification a deux facteurs</p>
                  <p className="text-sm text-gray-500">
                    Ajoutez une couche de securite supplementaire
                  </p>
                </div>
                <a href="/settings" className="btn-secondary">
                  Configurer
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
