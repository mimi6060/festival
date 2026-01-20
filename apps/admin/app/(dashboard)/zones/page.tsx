'use client';

import { useState, useCallback } from 'react';
import DataTable from '@/components/tables/DataTable';
import ConfirmModal from '@/components/modals/ConfirmModal';
import { cn } from '@/lib/utils';
import { zonesApi } from '@/lib/api';
import type { TableColumn } from '@/types';

interface Zone {
  id: string;
  name: string;
  description: string;
  type: 'entrance' | 'stage' | 'vip' | 'backstage' | 'camping' | 'food' | 'parking';
  festivalId: string;
  festivalName: string;
  capacity: number;
  currentOccupancy: number;
  accessLevel: 'public' | 'ticket' | 'vip' | 'staff' | 'artist';
  checkpoints: number;
  status: 'active' | 'inactive' | 'full';
  createdAt: string;
}

interface ZoneFormData {
  name: string;
  description: string;
  type: Zone['type'];
  accessLevel: Zone['accessLevel'];
  capacity: number;
  checkpoints: number;
  status: 'active' | 'inactive';
}

interface AccessLog {
  id: string;
  zoneId: string;
  zoneName: string;
  userId: string;
  userName: string;
  ticketNumber: string;
  action: 'entry' | 'exit';
  timestamp: string;
  checkpointId: string;
  checkpointName: string;
}

// Mock data
const mockZones: Zone[] = [
  {
    id: '1',
    name: 'Entree Principale',
    description: "Point d'entree principal du festival",
    type: 'entrance',
    festivalId: '1',
    festivalName: 'Summer Beats Festival',
    capacity: 50000,
    currentOccupancy: 35420,
    accessLevel: 'ticket',
    checkpoints: 8,
    status: 'active',
    createdAt: '2024-12-01T10:00:00Z',
  },
  {
    id: '2',
    name: 'Scene Principale',
    description: 'Scene principale avec capacite 30000',
    type: 'stage',
    festivalId: '1',
    festivalName: 'Summer Beats Festival',
    capacity: 30000,
    currentOccupancy: 24500,
    accessLevel: 'ticket',
    checkpoints: 4,
    status: 'active',
    createdAt: '2024-12-01T10:00:00Z',
  },
  {
    id: '3',
    name: 'Zone VIP',
    description: 'Acces reserve aux detenteurs de pass VIP',
    type: 'vip',
    festivalId: '1',
    festivalName: 'Summer Beats Festival',
    capacity: 1000,
    currentOccupancy: 750,
    accessLevel: 'vip',
    checkpoints: 2,
    status: 'active',
    createdAt: '2024-12-01T10:00:00Z',
  },
  {
    id: '4',
    name: 'Backstage',
    description: 'Zone artistes et staff technique',
    type: 'backstage',
    festivalId: '1',
    festivalName: 'Summer Beats Festival',
    capacity: 200,
    currentOccupancy: 85,
    accessLevel: 'artist',
    checkpoints: 1,
    status: 'active',
    createdAt: '2024-12-01T10:00:00Z',
  },
  {
    id: '5',
    name: 'Camping',
    description: 'Zone camping pour les festivaliers',
    type: 'camping',
    festivalId: '1',
    festivalName: 'Summer Beats Festival',
    capacity: 5000,
    currentOccupancy: 4201,
    accessLevel: 'ticket',
    checkpoints: 2,
    status: 'active',
    createdAt: '2024-12-01T10:00:00Z',
  },
  {
    id: '6',
    name: 'Food Court',
    description: 'Zone restauration',
    type: 'food',
    festivalId: '1',
    festivalName: 'Summer Beats Festival',
    capacity: 3000,
    currentOccupancy: 3000,
    accessLevel: 'public',
    checkpoints: 0,
    status: 'full',
    createdAt: '2024-12-01T10:00:00Z',
  },
];

const mockAccessLogs: AccessLog[] = [
  {
    id: '1',
    zoneId: '1',
    zoneName: 'Entree Principale',
    userId: '1',
    userName: 'Sophie Petit',
    ticketNumber: 'TKT-ABC123',
    action: 'entry',
    timestamp: '2025-01-02T14:30:00Z',
    checkpointId: 'CP-1',
    checkpointName: 'Checkpoint A',
  },
  {
    id: '2',
    zoneId: '3',
    zoneName: 'Zone VIP',
    userId: '2',
    userName: 'Lucas Moreau',
    ticketNumber: 'TKT-VIP456',
    action: 'entry',
    timestamp: '2025-01-02T14:28:00Z',
    checkpointId: 'CP-5',
    checkpointName: 'VIP Gate',
  },
  {
    id: '3',
    zoneId: '2',
    zoneName: 'Scene Principale',
    userId: '3',
    userName: 'Emma Durand',
    ticketNumber: 'TKT-DEF789',
    action: 'exit',
    timestamp: '2025-01-02T14:25:00Z',
    checkpointId: 'CP-2',
    checkpointName: 'Stage Entry B',
  },
];

export default function ZonesPage() {
  const [activeTab, setActiveTab] = useState<'zones' | 'logs'>('zones');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState<Zone | null>(null);
  const [zones, setZones] = useState<Zone[]>(mockZones);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formData, setFormData] = useState<ZoneFormData>({
    name: '',
    description: '',
    type: 'entrance',
    accessLevel: 'ticket',
    capacity: 0,
    checkpoints: 0,
    status: 'active',
  });

  const filteredZones = typeFilter === 'all' ? zones : zones.filter((z) => z.type === typeFilter);

  const typeLabels: Record<string, string> = {
    entrance: 'Entree',
    stage: 'Scene',
    vip: 'VIP',
    backstage: 'Backstage',
    camping: 'Camping',
    food: 'Restauration',
    parking: 'Parking',
  };

  const typeColors: Record<string, string> = {
    entrance: 'bg-blue-100 text-blue-700',
    stage: 'bg-purple-100 text-purple-700',
    vip: 'bg-yellow-100 text-yellow-700',
    backstage: 'bg-red-100 text-red-700',
    camping: 'bg-green-100 text-green-700',
    food: 'bg-orange-100 text-orange-700',
    parking: 'bg-gray-100 text-gray-700',
  };

  const accessLevelLabels: Record<string, string> = {
    public: 'Public',
    ticket: 'Billet requis',
    vip: 'VIP uniquement',
    staff: 'Staff',
    artist: 'Artistes',
  };

  const statusColors: Record<string, string> = {
    active: 'badge-success',
    inactive: 'badge-neutral',
    full: 'badge-warning',
  };

  const statusLabels: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
    full: 'Pleine',
  };

  const zoneColumns: TableColumn<Zone>[] = [
    {
      key: 'name',
      label: 'Zone',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-sm text-gray-500">{row.description}</p>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (value) => (
        <span className={cn('badge', typeColors[value as string])}>
          {typeLabels[value as string]}
        </span>
      ),
    },
    {
      key: 'accessLevel',
      label: "Niveau d'acces",
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">{accessLevelLabels[value as string]}</span>
      ),
    },
    {
      key: 'capacity',
      label: 'Occupation',
      sortable: true,
      render: (_, row) => {
        const percentage = (row.currentOccupancy / row.capacity) * 100;
        return (
          <div className="w-32">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">{row.currentOccupancy.toLocaleString()}</span>
              <span className="text-gray-400">/ {row.capacity.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={cn(
                  'h-2 rounded-full transition-all',
                  percentage >= 90
                    ? 'bg-red-500'
                    : percentage >= 70
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                )}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'checkpoints',
      label: 'Checkpoints',
      sortable: true,
      render: (value) => <span className="text-gray-600">{value as number}</span>,
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (value) => (
        <span className={cn('badge', statusColors[value as string])}>
          {statusLabels[value as string]}
        </span>
      ),
    },
  ];

  const logColumns: TableColumn<AccessLog>[] = [
    {
      key: 'timestamp',
      label: 'Date/Heure',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {new Date(value as string).toLocaleString('fr-FR')}
        </span>
      ),
    },
    {
      key: 'userName',
      label: 'Utilisateur',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium text-gray-900">{row.userName}</p>
          <p className="text-xs text-gray-500">{row.ticketNumber}</p>
        </div>
      ),
    },
    {
      key: 'zoneName',
      label: 'Zone',
      sortable: true,
    },
    {
      key: 'checkpointName',
      label: 'Checkpoint',
      sortable: true,
    },
    {
      key: 'action',
      label: 'Action',
      sortable: true,
      render: (value) => (
        <span className={cn('badge', value === 'entry' ? 'badge-success' : 'badge-info')}>
          {value === 'entry' ? 'Entree' : 'Sortie'}
        </span>
      ),
    },
  ];

  const handleDeleteZone = (zone: Zone) => {
    setZoneToDelete(zone);
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const confirmDelete = useCallback(async () => {
    if (!zoneToDelete) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      await zonesApi.delete(zoneToDelete.id);
      // Remove the zone from the local state on success
      setZones((currentZones) => currentZones.filter((z) => z.id !== zoneToDelete.id));
      setShowDeleteModal(false);
      setZoneToDelete(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la suppression de la zone';
      setDeleteError(errorMessage);
    } finally {
      setDeleting(false);
    }
  }, [zoneToDelete]);

  const openZoneModal = useCallback((zone: Zone | null) => {
    setSelectedZone(zone);
    setSaveError(null);
    setSaveSuccess(false);
    if (zone) {
      setFormData({
        name: zone.name,
        description: zone.description || '',
        type: zone.type,
        accessLevel: zone.accessLevel,
        capacity: zone.capacity,
        checkpoints: zone.checkpoints,
        status: zone.status === 'full' ? 'active' : zone.status,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'entrance',
        accessLevel: 'ticket',
        capacity: 0,
        checkpoints: 0,
        status: 'active',
      });
    }
    setShowZoneModal(true);
  }, []);

  const handleSaveZone = useCallback(async () => {
    if (!formData.name.trim()) {
      setSaveError('Le nom de la zone est requis');
      return;
    }

    if (formData.capacity <= 0) {
      setSaveError('La capacite doit etre superieure a 0');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const zoneData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        accessLevel: formData.accessLevel,
        capacity: formData.capacity,
        status: formData.status,
      };

      if (selectedZone) {
        // Update existing zone
        const updatedZone = await zonesApi.update(selectedZone.id, zoneData);
        setZones((currentZones) =>
          currentZones.map((z) =>
            z.id === selectedZone.id
              ? {
                  ...z,
                  ...updatedZone,
                  checkpoints: formData.checkpoints,
                  festivalName: z.festivalName,
                }
              : z
          )
        );
      } else {
        // Create new zone - using a default festivalId for now
        // In a real app, this would come from context or a selector
        const defaultFestivalId = '1';
        const newZone = await zonesApi.create(defaultFestivalId, zoneData);
        setZones((currentZones) => [
          ...currentZones,
          {
            ...newZone,
            checkpoints: formData.checkpoints,
            currentOccupancy: 0,
            festivalName: 'Summer Beats Festival',
          } as Zone,
        ]);
      }

      setSaveSuccess(true);
      // Close modal after a brief delay to show success
      setTimeout(() => {
        setShowZoneModal(false);
        setSaveSuccess(false);
      }, 500);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la sauvegarde de la zone';
      setSaveError(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [formData, selectedZone]);

  // Stats
  const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);
  const totalOccupancy = zones.reduce((sum, z) => sum + z.currentOccupancy, 0);
  const activeZones = zones.filter((z) => z.status === 'active').length;
  const fullZones = zones.filter((z) => z.status === 'full').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zones & Acces</h1>
          <p className="text-gray-500 mt-1">
            Gerez les zones et surveillez les acces en temps reel.
          </p>
        </div>
        <button
          onClick={() => openZoneModal(null)}
          className="btn-primary flex items-center gap-2 w-fit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle zone
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Occupation totale</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {Math.round((totalOccupancy / totalCapacity) * 100)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {totalOccupancy.toLocaleString()} / {totalCapacity.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Zones actives</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{activeZones}</p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Zones pleines</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{fullZones}</p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Total checkpoints</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {zones.reduce((sum, z) => sum + z.checkpoints, 0)}
          </p>
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        Donnees en temps reel - Derniere mise a jour: {new Date().toLocaleTimeString('fr-FR')}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('zones')}
            className={cn(
              'py-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'zones'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Zones ({zones.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={cn(
              'py-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'logs'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Journal d'acces
          </button>
        </nav>
      </div>

      {activeTab === 'zones' ? (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Type:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Tous les types</option>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Zones Table */}
          <DataTable
            data={filteredZones}
            columns={zoneColumns}
            searchPlaceholder="Rechercher une zone..."
            onRowClick={(zone) => openZoneModal(zone)}
            actions={(zone) => (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openZoneModal(zone);
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
                    handleDeleteZone(zone);
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
        </>
      ) : (
        /* Access Logs Table */
        <DataTable
          data={mockAccessLogs}
          columns={logColumns}
          searchPlaceholder="Rechercher dans les logs..."
        />
      )}

      {/* Zone Modal */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="dark:bg-gray-900 bg-white border dark:border-white/10 border-gray-200 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b dark:border-white/10 border-gray-200">
              <h2 className="text-lg font-semibold dark:text-white text-gray-900">
                {selectedZone ? 'Modifier la zone' : 'Nouvelle zone'}
              </h2>
              <button
                onClick={() => setShowZoneModal(false)}
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
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
                </div>
              )}
              {/* Success message */}
              {saveSuccess && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Zone {selectedZone ? 'mise a jour' : 'creee'} avec succes!
                  </p>
                </div>
              )}
              <div>
                <label className="form-label">Nom de la zone</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Entree Principale"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={saving}
                />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Description de la zone..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={saving}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Type</label>
                  <select
                    className="input-field"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as Zone['type'] })
                    }
                    disabled={saving}
                  >
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Niveau d'acces</label>
                  <select
                    className="input-field"
                    value={formData.accessLevel}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        accessLevel: e.target.value as Zone['accessLevel'],
                      })
                    }
                    disabled={saving}
                  >
                    {Object.entries(accessLevelLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Capacite</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="5000"
                    value={formData.capacity || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })
                    }
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="form-label">Nombre de checkpoints</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="4"
                    value={formData.checkpoints || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, checkpoints: parseInt(e.target.value) || 0 })
                    }
                    disabled={saving}
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Statut</label>
                <select
                  className="input-field"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })
                  }
                  disabled={saving}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </form>
            <div className="flex items-center justify-end gap-3 px-6 py-4 dark:bg-white/5 bg-gray-50 border-t dark:border-white/10 border-gray-200 rounded-b-xl">
              <button
                onClick={() => setShowZoneModal(false)}
                className="btn-secondary"
                disabled={saving}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveZone}
                className="btn-primary flex items-center gap-2"
                disabled={saving}
              >
                {saving && (
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
                {saving ? 'Sauvegarde...' : selectedZone ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!deleting) {
            setShowDeleteModal(false);
            setDeleteError(null);
          }
        }}
        onConfirm={confirmDelete}
        title="Supprimer la zone"
        message={
          deleteError
            ? `Erreur: ${deleteError}`
            : `Etes-vous sur de vouloir supprimer la zone "${zoneToDelete?.name}" ? Cette action est irreversible.`
        }
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
