'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import DataTable from '@/components/tables/DataTable';
import ExportButton from '@/components/export/ExportButton';
import { Avatar } from '@festival/ui';
import { mockUsers } from '@/lib/mock-data';
import { userExportColumns } from '@/lib/export';
import { formatDateTime, cn } from '@/lib/utils';
import { usersApi } from '@/lib/api';
import type { User, TableColumn } from '@/types';

type UserRole = 'admin' | 'organizer' | 'staff' | 'user';

interface FormFeedback {
  type: 'success' | 'error';
  message: string;
}

export default function UsersPage() {
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<FormFeedback | null>(null);

  // Form refs
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLSelectElement>(null);
  const isActiveRef = useRef<HTMLInputElement>(null);

  // Clear feedback after 5 seconds
  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timer = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Reset form when modal opens/closes or selected user changes
  useEffect(() => {
    if (showModal) {
      // Reset feedback when modal opens
      setFeedback(null);
    }
  }, [showModal, selectedUser]);

  const filteredUsers = roleFilter === 'all' ? users : users.filter((u) => u.role === roleFilter);

  const roleLabels: Record<string, string> = {
    admin: 'Administrateur',
    organizer: 'Organisateur',
    staff: 'Staff',
    user: 'Utilisateur',
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    organizer: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
    staff: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    user: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400',
  };

  const handleSaveUser = useCallback(async () => {
    // Validate required fields
    const firstName = firstNameRef.current?.value.trim();
    const lastName = lastNameRef.current?.value.trim();
    const email = emailRef.current?.value.trim();
    const password = passwordRef.current?.value;
    const role = roleRef.current?.value as UserRole;
    const isActive = isActiveRef.current?.checked ?? true;

    if (!firstName || !lastName || !email) {
      setFeedback({
        type: 'error',
        message: 'Veuillez remplir tous les champs obligatoires (prenom, nom, email).',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFeedback({
        type: 'error',
        message: 'Veuillez entrer une adresse email valide.',
      });
      return;
    }

    // Require password for new users
    if (!selectedUser && !password) {
      setFeedback({
        type: 'error',
        message: 'Le mot de passe est obligatoire pour un nouvel utilisateur.',
      });
      return;
    }

    // Validate password strength for new users
    if (!selectedUser && password && password.length < 8) {
      setFeedback({
        type: 'error',
        message: 'Le mot de passe doit contenir au moins 8 caracteres.',
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      if (selectedUser) {
        // Update existing user
        const updatedUser = await usersApi.update(selectedUser.id, {
          firstName,
          lastName,
          email,
          role,
          isActive,
        });

        // Update local state
        setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? updatedUser : u)));

        setFeedback({
          type: 'success',
          message: 'Utilisateur mis a jour avec succes.',
        });

        // Close modal after short delay to show success message
        setTimeout(() => {
          setShowModal(false);
          setSelectedUser(null);
        }, 1000);
      } else {
        // Create new user
        const newUser = await usersApi.create({
          firstName,
          lastName,
          email,
          password: password!,
          role,
          isActive,
        });

        // Add to local state
        setUsers((prev) => [newUser, ...prev]);

        setFeedback({
          type: 'success',
          message: 'Utilisateur cree avec succes.',
        });

        // Close modal after short delay to show success message
        setTimeout(() => {
          setShowModal(false);
          setSelectedUser(null);
        }, 1000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue.';
      setFeedback({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedUser]);

  const handleCloseModal = useCallback(() => {
    if (!isSaving) {
      setShowModal(false);
      setSelectedUser(null);
      setFeedback(null);
    }
  }, [isSaving]);

  const columns: TableColumn<User>[] = [
    {
      key: 'name',
      label: 'Utilisateur',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <Avatar src={row.avatar} name={`${row.firstName} ${row.lastName}`} size="md" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {row.firstName} {row.lastName}
            </p>
            <p className="text-sm text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (value) => (
        <span className={cn('badge', roleColors[value as string])}>
          {roleLabels[value as string]}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: 'Statut',
      sortable: true,
      render: (value) => (
        <span className={cn('badge', value ? 'badge-success' : 'badge-neutral')}>
          {value ? 'Actif' : 'Inactif'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Inscription',
      sortable: true,
      render: (value) => (
        <span className="text-gray-600 dark:text-gray-300">{formatDateTime(value as string)}</span>
      ),
    },
    {
      key: 'lastLogin',
      label: 'Derniere connexion',
      sortable: true,
      render: (value) => (
        <span className="text-gray-600 dark:text-gray-300">
          {value ? formatDateTime(value as string) : '-'}
        </span>
      ),
    },
  ];

  const roleOptions = [
    { value: 'all', label: 'Tous les roles' },
    { value: 'admin', label: 'Administrateurs' },
    { value: 'organizer', label: 'Organisateurs' },
    { value: 'staff', label: 'Staff' },
    { value: 'user', label: 'Utilisateurs' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Utilisateurs</h1>
          <p className="text-gray-500 mt-1">Gerez les utilisateurs et leurs permissions.</p>
        </div>
        <button
          onClick={() => {
            setSelectedUser(null);
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2 w-fit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un utilisateur
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Total utilisateurs</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{users.length}</p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Administrateurs</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {users.filter((u) => u.role === 'admin').length}
          </p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Organisateurs</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {users.filter((u) => u.role === 'organizer').length}
          </p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Actifs</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {users.filter((u) => u.isActive).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-300">Role:</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1" />
        <ExportButton
          data={filteredUsers as unknown as Record<string, unknown>[]}
          columns={userExportColumns}
          filename="utilisateurs"
          formats={['csv', 'excel']}
        />
      </div>

      {/* Table */}
      <DataTable
        data={filteredUsers}
        columns={columns}
        searchPlaceholder="Rechercher un utilisateur..."
        selectable
        onRowClick={(user) => {
          setSelectedUser(user);
          setShowModal(true);
        }}
        actions={(user) => (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(user);
                setShowModal(true);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Toggle active status
              }}
              className={cn(
                'p-2 rounded-lg transition-colors',
                user.isActive ? 'hover:bg-orange-50' : 'hover:bg-green-50'
              )}
            >
              {user.isActive ? (
                <svg
                  className="w-4 h-4 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </button>
          </div>
        )}
      />

      {/* User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="dark:bg-gray-900 bg-white border dark:border-white/10 border-gray-200 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b dark:border-white/10 border-gray-200">
              <h2 className="text-lg font-semibold dark:text-white text-gray-900">
                {selectedUser ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
              </h2>
              <button
                onClick={handleCloseModal}
                disabled={isSaving}
                className="p-2 dark:text-white/50 text-gray-400 hover:dark:text-white hover:text-gray-600 hover:dark:bg-white/5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Feedback Message */}
            {feedback && (
              <div
                className={cn(
                  'mx-6 mt-4 p-3 rounded-lg text-sm',
                  feedback.type === 'success'
                    ? 'bg-green-50 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                )}
              >
                {feedback.message}
              </div>
            )}

            <form className="p-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">
                    Prenom <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={firstNameRef}
                    type="text"
                    className="input-field"
                    placeholder="Jean"
                    defaultValue={selectedUser?.firstName}
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="form-label">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={lastNameRef}
                    type="text"
                    className="input-field"
                    placeholder="Dupont"
                    defaultValue={selectedUser?.lastName}
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div>
                <label className="form-label">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  ref={emailRef}
                  type="email"
                  className="input-field"
                  placeholder="jean@example.com"
                  defaultValue={selectedUser?.email}
                  disabled={isSaving}
                />
              </div>
              {!selectedUser && (
                <div>
                  <label className="form-label">
                    Mot de passe <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={passwordRef}
                    type="password"
                    className="input-field"
                    placeholder="********"
                    disabled={isSaving}
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 8 caracteres</p>
                </div>
              )}
              <div>
                <label className="form-label">Role</label>
                <select
                  ref={roleRef}
                  className="input-field"
                  defaultValue={selectedUser?.role || 'user'}
                  disabled={isSaving}
                >
                  <option value="user">Utilisateur</option>
                  <option value="staff">Staff</option>
                  <option value="organizer">Organisateur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={isActiveRef}
                  type="checkbox"
                  id="isActive"
                  className="w-4 h-4 rounded dark:border-white/20 border-gray-300 text-primary-600 focus:ring-primary-500"
                  defaultChecked={selectedUser?.isActive ?? true}
                  disabled={isSaving}
                />
                <label htmlFor="isActive" className="text-sm dark:text-white/70 text-gray-700">
                  Compte actif
                </label>
              </div>
            </form>
            <div className="flex items-center justify-end gap-3 px-6 py-4 dark:bg-white/5 bg-gray-50 border-t dark:border-white/10 border-gray-200 rounded-b-xl">
              <button
                onClick={handleCloseModal}
                disabled={isSaving}
                className="btn-secondary disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveUser}
                disabled={isSaving}
                className="btn-primary disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && (
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
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
                {isSaving ? 'Enregistrement...' : selectedUser ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
