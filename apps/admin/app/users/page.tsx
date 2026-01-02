'use client';

import { useState } from 'react';
import DataTable from '../../components/tables/DataTable';
import { mockUsers } from '../../lib/mock-data';
import { formatDateTime, getInitials, cn } from '../../lib/utils';
import type { User, TableColumn } from '../../types';

export default function UsersPage() {
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const filteredUsers = roleFilter === 'all'
    ? mockUsers
    : mockUsers.filter((u) => u.role === roleFilter);

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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Total utilisateurs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{mockUsers.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Administrateurs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {mockUsers.filter((u) => u.role === 'admin').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Organisateurs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {mockUsers.filter((u) => u.role === 'organizer').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Actifs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {mockUsers.filter((u) => u.isActive).length}
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
        <button className="btn-secondary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exporter
        </button>
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
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(user);
                setShowModal(true);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
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
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Prenom</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Jean"
                    defaultValue={selectedUser?.firstName}
                  />
                </div>
                <div>
                  <label className="form-label">Nom</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Dupont"
                    defaultValue={selectedUser?.lastName}
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="jean@example.com"
                  defaultValue={selectedUser?.email}
                />
              </div>
              {!selectedUser && (
                <div>
                  <label className="form-label">Mot de passe</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="********"
                  />
                </div>
              )}
              <div>
                <label className="form-label">Role</label>
                <select
                  className="input-field"
                  defaultValue={selectedUser?.role || 'user'}
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
                  defaultChecked={selectedUser?.isActive ?? true}
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Compte actif
                </label>
              </div>
            </form>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button className="btn-primary">
                {selectedUser ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
