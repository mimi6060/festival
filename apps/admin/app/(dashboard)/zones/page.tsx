'use client';

import { useState } from 'react';
import DataTable from '@/components/tables/DataTable';
import ConfirmModal from '@/components/modals/ConfirmModal';
import { cn } from '@/lib/utils';
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
    description: 'Point d\'entree principal du festival',
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
    currentOccupancy: 4200,
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

  const filteredZones = typeFilter === 'all'
    ? mockZones
    : mockZones.filter((z) => z.type === typeFilter);

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
      label: 'Niveau d\'acces',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {accessLevelLabels[value as string]}
        </span>
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
                  percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
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
      render: (value) => (
        <span className="text-gray-600">{value as number}</span>
      ),
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
        <span className={cn(
          'badge',
          value === 'entry' ? 'badge-success' : 'badge-info'
        )}>
          {value === 'entry' ? 'Entree' : 'Sortie'}
        </span>
      ),
    },
  ];

  const handleDeleteZone = (zone: Zone) => {
    setZoneToDelete(zone);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    // Handle delete logic here
    console.log('Deleting zone:', zoneToDelete?.id);
    setShowDeleteModal(false);
    setZoneToDelete(null);
  };

  // Stats
  const totalCapacity = mockZones.reduce((sum, z) => sum + z.capacity, 0);
  const totalOccupancy = mockZones.reduce((sum, z) => sum + z.currentOccupancy, 0);
  const activeZones = mockZones.filter((z) => z.status === 'active').length;
  const fullZones = mockZones.filter((z) => z.status === 'full').length;

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
          onClick={() => {
            setSelectedZone(null);
            setShowZoneModal(true);
          }}
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Occupation totale</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {Math.round((totalOccupancy / totalCapacity) * 100)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {totalOccupancy.toLocaleString()} / {totalCapacity.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Zones actives</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{activeZones}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Zones pleines</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{fullZones}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Total checkpoints</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {mockZones.reduce((sum, z) => sum + z.checkpoints, 0)}
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
            Zones ({mockZones.length})
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
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Zones Table */}
          <DataTable
            data={filteredZones}
            columns={zoneColumns}
            searchPlaceholder="Rechercher une zone..."
            onRowClick={(zone) => {
              setSelectedZone(zone);
              setShowZoneModal(true);
            }}
            actions={(zone) => (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedZone(zone);
                    setShowZoneModal(true);
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
                    handleDeleteZone(zone);
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedZone ? 'Modifier la zone' : 'Nouvelle zone'}
              </h2>
              <button
                onClick={() => setShowZoneModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form className="p-6 space-y-4">
              <div>
                <label className="form-label">Nom de la zone</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Entree Principale"
                  defaultValue={selectedZone?.name}
                />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Description de la zone..."
                  defaultValue={selectedZone?.description}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Type</label>
                  <select className="input-field" defaultValue={selectedZone?.type || 'entrance'}>
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Niveau d'acces</label>
                  <select className="input-field" defaultValue={selectedZone?.accessLevel || 'ticket'}>
                    {Object.entries(accessLevelLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
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
                    defaultValue={selectedZone?.capacity}
                  />
                </div>
                <div>
                  <label className="form-label">Nombre de checkpoints</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="4"
                    defaultValue={selectedZone?.checkpoints}
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Statut</label>
                <select className="input-field" defaultValue={selectedZone?.status || 'active'}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </form>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowZoneModal(false)}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button className="btn-primary">
                {selectedZone ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Supprimer la zone"
        message={`Etes-vous sur de vouloir supprimer la zone "${zoneToDelete?.name}" ? Cette action est irreversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
      />
    </div>
  );
}
