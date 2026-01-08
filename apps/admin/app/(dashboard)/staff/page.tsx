'use client';

import { useState } from 'react';
import DataTable from '@/components/tables/DataTable';
import { mockStaff, mockUsers, mockFestivals, getUserById, getFestivalById } from '@/lib/mock-data';
import { formatDateTime, getInitials, cn } from '@/lib/utils';
import type { Staff, TableColumn } from '@/types';

export default function StaffPage() {
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  const enrichedStaff = mockStaff.map((s) => ({
    ...s,
    user: getUserById(s.userId),
    festival: getFestivalById(s.festivalId),
  }));

  const filteredStaff = roleFilter === 'all'
    ? enrichedStaff
    : enrichedStaff.filter((s) => s.role === roleFilter);

  const roleLabels: Record<string, string> = {
    manager: 'Manager',
    security: 'Securite',
    ticket_scanner: 'Scanner billets',
    info_desk: 'Accueil',
    volunteer: 'Benevole',
  };

  const roleColors: Record<string, string> = {
    manager: 'bg-purple-100 text-purple-700',
    security: 'bg-red-100 text-red-700',
    ticket_scanner: 'bg-blue-100 text-blue-700',
    info_desk: 'bg-green-100 text-green-700',
    volunteer: 'bg-orange-100 text-orange-700',
  };

  const columns: TableColumn<Staff>[] = [
    {
      key: 'user',
      label: 'Membre',
      sortable: true,
      render: (_, row) => {
        const user = row.user;
        if (!user) return '-';
        return (
          <div className="flex items-center gap-3">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-medium">
                {getInitials(user.firstName, user.lastName)}
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'festival',
      label: 'Festival',
      sortable: true,
      render: (_, row) => (
        <span className="text-gray-900">{row.festival?.name || '-'}</span>
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
      key: 'permissions',
      label: 'Permissions',
      render: (value) => {
        const perms = value as string[];
        if (perms.includes('all')) {
          return <span className="text-sm text-gray-600">Toutes</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {perms.slice(0, 2).map((p) => (
              <span key={p} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {p}
              </span>
            ))}
            {perms.length > 2 && (
              <span className="text-xs text-gray-500">+{perms.length - 2}</span>
            )}
          </div>
        );
      },
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
      key: 'assignedAt',
      label: 'Assigne le',
      sortable: true,
      render: (value) => (
        <span className="text-gray-600">{formatDateTime(value as string)}</span>
      ),
    },
  ];

  const roleOptions = [
    { value: 'all', label: 'Tous les roles' },
    { value: 'manager', label: 'Managers' },
    { value: 'security', label: 'Securite' },
    { value: 'ticket_scanner', label: 'Scanners' },
    { value: 'info_desk', label: 'Accueil' },
    { value: 'volunteer', label: 'Benevoles' },
  ];

  const allPermissions = [
    { value: 'all', label: 'Toutes les permissions' },
    { value: 'scan_tickets', label: 'Scanner les billets' },
    { value: 'view_attendees', label: 'Voir les participants' },
    { value: 'manage_staff', label: 'Gerer le staff' },
    { value: 'manage_tickets', label: 'Gerer les billets' },
    { value: 'view_stats', label: 'Voir les statistiques' },
    { value: 'edit_festival', label: 'Modifier le festival' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion du Staff</h1>
          <p className="text-gray-500 mt-1">
            Assignez et gerez les membres du staff pour vos festivals.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedStaff(null);
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2 w-fit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Assigner un membre
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Total staff</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{enrichedStaff.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Managers</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {enrichedStaff.filter((s) => s.role === 'manager').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Scanners</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {enrichedStaff.filter((s) => s.role === 'ticket_scanner').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Actifs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {enrichedStaff.filter((s) => s.isActive).length}
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
        data={filteredStaff}
        columns={columns}
        searchPlaceholder="Rechercher un membre..."
        onRowClick={(staff) => {
          setSelectedStaff(staff);
          setShowModal(true);
        }}
        actions={(staff) => (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStaff(staff);
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
                // Remove staff
              }}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      />

      {/* Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedStaff ? 'Modifier l\'assignation' : 'Assigner un membre'}
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
              <div>
                <label className="form-label">Utilisateur</label>
                <select
                  className="input-field"
                  defaultValue={selectedStaff?.userId || ''}
                >
                  <option value="">Selectionner un utilisateur</option>
                  {mockUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Festival</label>
                <select
                  className="input-field"
                  defaultValue={selectedStaff?.festivalId || ''}
                >
                  <option value="">Selectionner un festival</option>
                  {mockFestivals.filter((f) => f.status !== 'completed').map((festival) => (
                    <option key={festival.id} value={festival.id}>
                      {festival.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Role</label>
                <select
                  className="input-field"
                  defaultValue={selectedStaff?.role || 'volunteer'}
                >
                  {roleOptions.filter((r) => r.value !== 'all').map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Permissions</label>
                <div className="space-y-2 mt-2">
                  {allPermissions.map((perm) => (
                    <label key={perm.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        defaultChecked={selectedStaff?.permissions.includes(perm.value)}
                      />
                      <span className="text-sm text-gray-700">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  defaultChecked={selectedStaff?.isActive ?? true}
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Assignation active
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
                {selectedStaff ? 'Enregistrer' : 'Assigner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
