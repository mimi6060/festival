'use client';

import { useState, useCallback } from 'react';
import DataTable from '@/components/tables/DataTable';
import ExportButton from '@/components/export/ExportButton';
import { Avatar } from '@/components/ui';
import { mockStaff, mockUsers, mockFestivals, getUserById, getFestivalById } from '@/lib/mock-data';
import { staffExportColumns } from '@/lib/export';
import { formatDateTime, cn } from '@/lib/utils';
import { staffApi } from '@/lib/api';
import type { Staff, TableColumn } from '@/types';

type StaffRole = Staff['role'];

interface StaffFormData {
  userId: string;
  festivalId: string;
  role: StaffRole;
  permissions: string[];
  isActive: boolean;
}

export default function StaffPage() {
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>(mockStaff);
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState<StaffFormData>({
    userId: '',
    festivalId: '',
    role: 'volunteer',
    permissions: [],
    isActive: true,
  });

  // Reset form when modal opens/closes or when selectedStaff changes
  const resetForm = useCallback((staff: Staff | null) => {
    if (staff) {
      setFormData({
        userId: staff.userId,
        festivalId: staff.festivalId,
        role: staff.role,
        permissions: staff.permissions,
        isActive: staff.isActive,
      });
    } else {
      setFormData({
        userId: '',
        festivalId: '',
        role: 'volunteer',
        permissions: [],
        isActive: true,
      });
    }
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  const handleOpenModal = useCallback(
    (staff: Staff | null) => {
      setSelectedStaff(staff);
      resetForm(staff);
      setShowModal(true);
    },
    [resetForm]
  );

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSelectedStaff(null);
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  const handlePermissionChange = useCallback((permission: string, checked: boolean) => {
    setFormData((prev) => {
      if (permission === 'all') {
        // If "all" is selected, clear other permissions and just use "all"
        return {
          ...prev,
          permissions: checked ? ['all'] : [],
        };
      }

      // Remove "all" if it was selected and we're adding specific permissions
      let newPermissions = prev.permissions.filter((p) => p !== 'all');

      if (checked) {
        newPermissions = [...newPermissions, permission];
      } else {
        newPermissions = newPermissions.filter((p) => p !== permission);
      }

      return {
        ...prev,
        permissions: newPermissions,
      };
    });
  }, []);

  const handleSave = useCallback(async () => {
    // Validate form
    if (!formData.userId) {
      setSaveError('Veuillez selectionner un utilisateur');
      return;
    }
    if (!formData.festivalId) {
      setSaveError('Veuillez selectionner un festival');
      return;
    }
    if (formData.permissions.length === 0) {
      setSaveError('Veuillez selectionner au moins une permission');
      return;
    }

    setIsLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const staffData = {
        userId: formData.userId,
        role: formData.role,
        permissions: formData.permissions,
        isActive: formData.isActive,
      };

      if (selectedStaff) {
        // Update existing staff
        const updatedStaff = await staffApi.update(
          formData.festivalId,
          selectedStaff.id,
          staffData
        );
        // Update in local state
        setStaffList((prev) =>
          prev.map((s) => (s.id === selectedStaff.id ? { ...s, ...updatedStaff } : s))
        );
      } else {
        // Create new staff
        const newStaff = await staffApi.assign(formData.festivalId, {
          userId: formData.userId,
          role: formData.role,
          permissions: formData.permissions,
        });
        // Add to local state
        setStaffList((prev) => [...prev, newStaff]);
      }

      setSaveSuccess(true);
      // Close modal after short delay to show success
      setTimeout(() => {
        handleCloseModal();
      }, 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      setSaveError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [formData, selectedStaff, handleCloseModal]);

  const enrichedStaff = staffList.map((s) => ({
    ...s,
    user: getUserById(s.userId),
    festival: getFestivalById(s.festivalId),
  }));

  const filteredStaff =
    roleFilter === 'all' ? enrichedStaff : enrichedStaff.filter((s) => s.role === roleFilter);

  const roleLabels: Record<string, string> = {
    manager: 'Manager',
    security: 'Securite',
    ticket_scanner: 'Scanner billets',
    info_desk: 'Accueil',
    volunteer: 'Benevole',
  };

  const roleColors: Record<string, string> = {
    manager: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
    security: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    ticket_scanner: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    info_desk: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
    volunteer: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  };

  const columns: TableColumn<Staff>[] = [
    {
      key: 'user',
      label: 'Membre',
      sortable: true,
      render: (_, row) => {
        const user = row.user;
        if (!user) {
          return '-';
        }
        return (
          <div className="flex items-center gap-3">
            <Avatar src={user.avatar} name={`${user.firstName} ${user.lastName}`} size="md" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {user.firstName} {user.lastName}
              </p>
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
        <span className="text-gray-900 dark:text-white">{row.festival?.name || '-'}</span>
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
          return <span className="text-sm text-gray-600 dark:text-gray-300">Toutes</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {perms.slice(0, 2).map((p) => (
              <span
                key={p}
                className="text-xs bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded"
              >
                {p}
              </span>
            ))}
            {perms.length > 2 && <span className="text-xs text-gray-500">+{perms.length - 2}</span>}
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
        <span className="text-gray-600 dark:text-gray-300">{formatDateTime(value as string)}</span>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion du Staff</h1>
          <p className="text-gray-500 mt-1">
            Assignez et gerez les membres du staff pour vos festivals.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal(null)}
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
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Total staff</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {enrichedStaff.length}
          </p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Managers</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {enrichedStaff.filter((s) => s.role === 'manager').length}
          </p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Scanners</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {enrichedStaff.filter((s) => s.role === 'ticket_scanner').length}
          </p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Actifs</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {enrichedStaff.filter((s) => s.isActive).length}
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
          data={filteredStaff as unknown as Record<string, unknown>[]}
          columns={staffExportColumns}
          filename="staff"
          formats={['csv', 'excel']}
        />
      </div>

      {/* Table */}
      <DataTable
        data={filteredStaff}
        columns={columns}
        searchPlaceholder="Rechercher un membre..."
        onRowClick={(staff) => handleOpenModal(staff)}
        actions={(staff) => (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenModal(staff);
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
                // Remove staff
              }}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg
                className="w-4 h-4 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        )}
      />

      {/* Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="dark:bg-gray-900 bg-white border dark:border-white/10 border-gray-200 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b dark:border-white/10 border-gray-200">
              <h2 className="text-lg font-semibold dark:text-white text-gray-900">
                {selectedStaff ? "Modifier l'assignation" : 'Assigner un membre'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 dark:text-white/50 text-gray-400 hover:dark:text-white hover:text-gray-600 hover:dark:bg-white/5 hover:bg-gray-100 rounded-lg transition-colors"
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
            <form className="p-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
              {/* Error message */}
              {saveError && (
                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
                </div>
              )}

              {/* Success message */}
              {saveSuccess && (
                <div className="p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {selectedStaff
                      ? 'Membre mis a jour avec succes!'
                      : 'Membre assigne avec succes!'}
                  </p>
                </div>
              )}

              <div>
                <label className="form-label">Utilisateur</label>
                <select
                  className="input-field"
                  value={formData.userId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, userId: e.target.value }))}
                  disabled={isLoading || !!selectedStaff}
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
                  value={formData.festivalId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, festivalId: e.target.value }))}
                  disabled={isLoading || !!selectedStaff}
                >
                  <option value="">Selectionner un festival</option>
                  {mockFestivals
                    .filter((f) => f.status !== 'completed')
                    .map((festival) => (
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
                  value={formData.role}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, role: e.target.value as StaffRole }))
                  }
                  disabled={isLoading}
                >
                  {roleOptions
                    .filter((r) => r.value !== 'all')
                    .map((option) => (
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
                        className="w-4 h-4 rounded dark:border-white/20 border-gray-300 text-primary-600 focus:ring-primary-500"
                        checked={formData.permissions.includes(perm.value)}
                        onChange={(e) => handlePermissionChange(perm.value, e.target.checked)}
                        disabled={isLoading}
                      />
                      <span className="text-sm dark:text-white/70 text-gray-700">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  className="w-4 h-4 rounded dark:border-white/20 border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                  disabled={isLoading}
                />
                <label htmlFor="isActive" className="text-sm dark:text-white/70 text-gray-700">
                  Assignation active
                </label>
              </div>
            </form>
            <div className="flex items-center justify-end gap-3 px-6 py-4 dark:bg-white/5 bg-gray-50 border-t dark:border-white/10 border-gray-200 rounded-b-xl">
              <button onClick={handleCloseModal} className="btn-secondary" disabled={isLoading}>
                Annuler
              </button>
              <button
                type="submit"
                onClick={handleSave}
                className="btn-primary flex items-center gap-2"
                disabled={isLoading || saveSuccess}
              >
                {isLoading && (
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
                {isLoading
                  ? 'Enregistrement...'
                  : saveSuccess
                    ? 'Enregistre!'
                    : selectedStaff
                      ? 'Enregistrer'
                      : 'Assigner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
