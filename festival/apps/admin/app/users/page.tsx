'use client';

import { useState } from 'react';
import Link from 'next/link';
import DataTable from '../../components/tables/DataTable';
import { formatDateTime, getInitials, cn } from '../../lib/utils';
import { useUsers, useCreateUser, useUpdateUser, useBanUser, useUnbanUser, useDeleteUser } from '../../hooks';
import type { User, TableColumn } from '../../types';

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'admin' | 'organizer' | 'staff' | 'user';
  isActive: boolean;
}

export default function UsersPage() {
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'user',
    isActive: true,
  });

  // API hooks
  const { data: usersData, isLoading, error } = useUsers({
    role: roleFilter === 'all' ? undefined : roleFilter,
  });
  const users = usersData?.data ?? [];

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const banMutation = useBanUser();
  const unbanMutation = useUnbanUser();
  const deleteMutation = useDeleteUser();

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'user',
      isActive: true,
    });
  };

  const openCreateModal = () => {
    setSelectedUser(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (selectedUser) {
        // Update existing user
        await updateMutation.mutateAsync({
          id: selectedUser.id,
          data: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            role: formData.role,
            isActive: formData.isActive,
          },
        });
      } else {
        // Create new user
        await createMutation.mutateAsync({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          role: formData.role as 'admin' | 'organizer' | 'staff' | 'user',
          isActive: formData.isActive,
        });
      }

      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error('Error saving user:', err);
      // Error is handled by the mutation
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      if (user.isActive) {
        await banMutation.mutateAsync(user.id);
      } else {
        await unbanMutation.mutateAsync(user.id);
      }
    } catch (err) {
      console.error('Error toggling user status:', err);
    }
  };

  const deleteUser = async (userId: string) => {
    if (confirm('Etes-vous sur de vouloir supprimer cet utilisateur ?')) {
      try {
        await deleteMutation.mutateAsync(userId);
      } catch (err) {
        console.error('Error deleting user:', err);
      }
    }
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrateur',
    organizer: 'Organisateur',
    staff: 'Staff',
    user: 'Utilisateur',
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    organizer: 'bg-purple-100 text-purple-700',
    staff: 'bg-blue-100 text-blue-700',
    user: 'bg-gray-100 text-gray-700',
  };

  const columns: TableColumn<User>[] = [
    {
      key: 'name',
      label: 'Utilisateur',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          {row.avatar ? (
            <img
              src={row.avatar}
              alt={`${row.firstName} ${row.lastName}`}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-medium">
              {getInitials(row.firstName, row.lastName)}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{row.firstName} {row.lastName}</p>
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
        <span className="text-gray-600">{formatDateTime(value as string)}</span>
      ),
    },
    {
      key: 'lastLogin',
      label: 'Derniere connexion',
      sortable: true,
      render: (value) => (
        <span className="text-gray-600">{value ? formatDateTime(value as string) : '-'}</span>
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

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
            <p className="text-gray-500 mt-1">Chargement...</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
            <p className="text-gray-500 mt-1">Gerez les utilisateurs et leurs permissions.</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-red-800">Erreur de chargement</p>
              <p className="text-sm text-red-600">{error instanceof Error ? error.message : 'Une erreur est survenue'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isMutating = createMutation.isPending || updateMutation.isPending || banMutation.isPending || unbanMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-gray-500 mt-1">
            Gerez les utilisateurs et leurs permissions.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary flex items-center gap-2 w-fit"
          disabled={isMutating}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un utilisateur
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Total utilisateurs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{users.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Administrateurs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {users.filter((u) => u.role === 'admin').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Organisateurs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {users.filter((u) => u.role === 'organizer').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Actifs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {users.filter((u) => u.isActive).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Role:</label>
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
        <Link href="/exports" className="btn-secondary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exporter
        </Link>
      </div>

      {/* Table */}
      <DataTable
        data={users}
        columns={columns}
        searchPlaceholder="Rechercher un utilisateur..."
        selectable
        onRowClick={(user) => openEditModal(user)}
        actions={(user) => (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(user);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Modifier"
              disabled={isMutating}
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleUserStatus(user);
              }}
              className={cn(
                'p-2 rounded-lg transition-colors',
                user.isActive ? 'hover:bg-orange-50' : 'hover:bg-green-50'
              )}
              title={user.isActive ? 'Desactiver' : 'Activer'}
              disabled={isMutating}
            >
              {user.isActive ? (
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteUser(user.id);
              }}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
              title="Supprimer"
              disabled={isMutating}
            >
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      />

      {/* User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Error message */}
              {(createMutation.error || updateMutation.error) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">
                    {createMutation.error instanceof Error ? createMutation.error.message : ''}
                    {updateMutation.error instanceof Error ? updateMutation.error.message : ''}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Prenom *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Jean"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>
                <div>
                  <label className="form-label">Nom *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Dupont"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="jean@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>
              {!selectedUser && (
                <div>
                  <label className="form-label">Mot de passe *</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="********"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={8}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>
              )}
              <div>
                <label className="form-label">Role *</label>
                <select
                  className="input-field"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserFormData['role'] })}
                  required
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <option value="user">Utilisateur</option>
                  <option value="staff">Staff</option>
                  <option value="organizer">Organisateur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Compte actif
                </label>
              </div>
            </form>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-secondary"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Annuler
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="btn-primary flex items-center gap-2"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {selectedUser ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
