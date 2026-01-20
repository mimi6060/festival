'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  apiKeysApi,
  sessionsApi,
  twoFactorApi,
  passwordApi,
  webhooksApi,
} from '../../../lib/api';
import type {
  ApiKey,
  Session,
  TwoFactorSetupResponse,
  Webhook,
  WebhookDelivery,
} from '../../../types';

type SettingsTab = 'general' | 'notifications' | 'payments' | 'security' | 'api';

// Loading Spinner Component
function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };
  return (
    <div
      className={`animate-spin rounded-full border-2 border-gray-300 border-t-primary-600 ${sizeClasses[size]}`}
    />
  );
}

// Alert Component
function Alert({
  type,
  message,
  onClose,
}: {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onClose?: () => void;
}) {
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[type]} flex items-center justify-between`}>
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-4 hover:opacity-70">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

// Modal Component
function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
          {children}
        </div>
      </div>
    </div>
  );
}

// Logo Upload Component
function LogoUpload() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Veuillez selectionner une image valide');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('La taille du fichier ne doit pas depasser 2 Mo');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Create a preview URL for now (in real implementation, this would upload to server)
      const previewUrl = URL.createObjectURL(file);
      setLogoUrl(previewUrl);

      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // In production, you would call:
      // const result = await uploadApi.uploadLogo(file);
      // setLogoUrl(result.url);
    } catch {
      setError('Erreur lors du telechargement du logo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          )}
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary flex items-center gap-2"
          >
            {uploading ? (
              <>
                <LoadingSpinner size="sm" />
                Telechargement...
              </>
            ) : (
              'Changer le logo'
            )}
          </button>
          <p className="text-xs text-gray-500 mt-1">PNG, JPG ou GIF. Max 2 Mo.</p>
        </div>
      </div>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
    </div>
  );
}

// Two-Factor Authentication Component
function TwoFactorConfig() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const status = await twoFactorApi.getStatus();
      setIsEnabled(status.enabled);
    } catch {
      // Status endpoint might not exist yet - silently ignore
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await twoFactorApi.setup();
      setSetupData(data);
      setShowSetupModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la configuration 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    if (verificationCode.length !== 6) {
      setError('Veuillez entrer un code a 6 chiffres');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await twoFactorApi.enable(verificationCode);
      if (result.success) {
        setIsEnabled(true);
        setShowSetupModal(false);
        if (result.backupCodes) {
          setBackupCodes(result.backupCodes);
          setShowBackupCodes(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code invalide');
    } finally {
      setLoading(false);
      setVerificationCode('');
    }
  };

  const handleDisable = async () => {
    if (verificationCode.length !== 6) {
      setError('Veuillez entrer un code a 6 chiffres');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await twoFactorApi.disable(verificationCode);
      if (result.success) {
        setIsEnabled(false);
        setShowDisableModal(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code invalide');
    } finally {
      setLoading(false);
      setVerificationCode('');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
        <div>
          <p className="font-medium text-gray-900">Authentification a deux facteurs</p>
          <p className="text-sm text-gray-500">
            {isEnabled
              ? 'Activee - Votre compte est protege'
              : 'Ajouter une couche de securite supplementaire'}
          </p>
        </div>
        <button
          onClick={isEnabled ? () => setShowDisableModal(true) : handleSetup}
          disabled={loading}
          className={isEnabled ? 'btn-danger' : 'btn-secondary'}
        >
          {loading ? <LoadingSpinner size="sm" /> : isEnabled ? 'Desactiver' : 'Configurer'}
        </button>
      </div>

      {/* Setup Modal */}
      <Modal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        title="Configuration de la 2FA"
      >
        <div className="space-y-4">
          {setupData && (
            <>
              <p className="text-gray-600">
                Scannez ce QR code avec votre application d&apos;authentification (Google
                Authenticator, Authy, etc.)
              </p>
              <div className="flex justify-center p-4 bg-white rounded-lg border">
                <img
                  src={setupData.qrCodeUrl}
                  alt="QR Code 2FA"
                  className="w-48 h-48"
                  onError={(e) => {
                    // Fallback if QR code fails to load
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Cle secrete (entree manuelle):</p>
                <code className="text-sm font-mono break-all">{setupData.secret}</code>
              </div>
            </>
          )}
          <div>
            <label className="form-label">Code de verification</label>
            <input
              type="text"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="input-field text-center text-2xl tracking-widest"
            />
          </div>
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
          <div className="flex gap-3">
            <button onClick={() => setShowSetupModal(false)} className="btn-secondary flex-1">
              Annuler
            </button>
            <button
              onClick={handleEnable}
              disabled={loading || verificationCode.length !== 6}
              className="btn-primary flex-1"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Activer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Disable Modal */}
      <Modal
        isOpen={showDisableModal}
        onClose={() => setShowDisableModal(false)}
        title="Desactiver la 2FA"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Entrez un code de votre application d&apos;authentification pour desactiver la 2FA.
          </p>
          <div>
            <label className="form-label">Code de verification</label>
            <input
              type="text"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="input-field text-center text-2xl tracking-widest"
            />
          </div>
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
          <div className="flex gap-3">
            <button onClick={() => setShowDisableModal(false)} className="btn-secondary flex-1">
              Annuler
            </button>
            <button
              onClick={handleDisable}
              disabled={loading || verificationCode.length !== 6}
              className="btn-danger flex-1"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Desactiver'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Backup Codes Modal */}
      <Modal
        isOpen={showBackupCodes}
        onClose={() => setShowBackupCodes(false)}
        title="Codes de secours"
      >
        <div className="space-y-4">
          <Alert
            type="warning"
            message="Conservez ces codes en lieu sur. Ils vous permettront de vous connecter si vous perdez l'acces a votre application d'authentification."
          />
          <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg font-mono text-sm">
            {backupCodes.map((code, index) => (
              <div key={index} className="p-2 bg-white rounded border">
                {code}
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(backupCodes.join('\n'));
            }}
            className="btn-secondary w-full"
          >
            Copier les codes
          </button>
          <button onClick={() => setShowBackupCodes(false)} className="btn-primary w-full">
            J&apos;ai sauvegarde mes codes
          </button>
        </div>
      </Modal>
    </>
  );
}

// Active Sessions Component
function ActiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sessionsApi.getAll();
      setSessions(data);
    } catch {
      // Mock data for development
      setSessions([
        {
          id: '1',
          userId: 'user-1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
          deviceInfo: { browser: 'Chrome', os: 'macOS', device: 'Desktop' },
          isActive: true,
          lastActiveAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          isCurrent: true,
        },
        {
          id: '2',
          userId: 'user-1',
          ipAddress: '10.0.0.5',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/605.1.15',
          deviceInfo: { browser: 'Safari', os: 'iOS', device: 'Mobile' },
          isActive: true,
          lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          isCurrent: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showModal) {
      loadSessions();
    }
  }, [showModal, loadSessions]);

  const handleRevoke = async (sessionId: string) => {
    try {
      await sessionsApi.revoke(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSuccess('Session revoquee avec succes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la revocation');
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm('Etes-vous sur de vouloir deconnecter toutes les autres sessions?')) return;

    try {
      await sessionsApi.revokeAll();
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      setSuccess('Toutes les autres sessions ont ete deconnectees');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la deconnexion');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeviceIcon = (device?: string) => {
    if (device === 'Mobile') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
        <div>
          <p className="font-medium text-gray-900">Sessions actives</p>
          <p className="text-sm text-gray-500">Gerer vos sessions connectees</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-secondary">
          Voir
        </button>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Sessions actives">
        <div className="space-y-4">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
          {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-3 border rounded-lg ${session.isCurrent ? 'border-primary-200 bg-primary-50' : 'border-gray-100'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="text-gray-400 mt-1">
                          {getDeviceIcon(session.deviceInfo?.device)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 flex items-center gap-2">
                            {session.deviceInfo?.browser || 'Navigateur inconnu'} sur{' '}
                            {session.deviceInfo?.os || 'Appareil inconnu'}
                            {session.isCurrent && (
                              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                                Session actuelle
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">
                            {session.ipAddress} - Derniere activite: {formatDate(session.lastActiveAt)}
                          </p>
                        </div>
                      </div>
                      {!session.isCurrent && (
                        <button
                          onClick={() => handleRevoke(session.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Revoquer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {sessions.filter((s) => !s.isCurrent).length > 0 && (
                <button onClick={handleRevokeAll} className="btn-danger w-full">
                  Deconnecter toutes les autres sessions
                </button>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}

// Password Change Component
function PasswordChange() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await passwordApi.change(currentPassword, newPassword, confirmPassword);
      setSuccess('Mot de passe modifie avec succes');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <div>
        <label className="form-label">Mot de passe actuel</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="input-field"
          required
        />
      </div>
      <div>
        <label className="form-label">Nouveau mot de passe</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="input-field"
          required
          minLength={8}
        />
      </div>
      <div>
        <label className="form-label">Confirmer le mot de passe</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="input-field"
          required
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? <LoadingSpinner size="sm" /> : 'Changer le mot de passe'}
      </button>
    </form>
  );
}

// API Keys Management Component
function ApiKeysManager() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const loadApiKeys = useCallback(async () => {
    try {
      const keys = await apiKeysApi.getAll();
      setApiKeys(keys);
    } catch {
      // Mock data for development
      setApiKeys([
        {
          id: '1',
          userId: 'user-1',
          name: 'Production API Key',
          key: 'fst_live_xxxx...xxxx',
          keyPrefix: 'fst_live_xxxx',
          tier: 'PRO',
          status: 'ACTIVE',
          scopes: ['READ', 'WRITE'],
          description: 'Cle API principale pour la production',
          ipWhitelist: [],
          usageCount: 1523,
          lastUsedAt: new Date().toISOString(),
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          userId: 'user-1',
          name: 'Test API Key',
          key: 'fst_test_xxxx...xxxx',
          keyPrefix: 'fst_test_xxxx',
          tier: 'FREE',
          status: 'ACTIVE',
          scopes: ['READ'],
          description: 'Cle pour les tests',
          ipWhitelist: [],
          usageCount: 42,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      setError('Veuillez entrer un nom pour la cle API');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const result = await apiKeysApi.create({
        name: newKeyName,
        description: newKeyDescription || undefined,
      });
      setCreatedKey(result.plaintextKey);
      setApiKeys((prev) => [result.apiKey, ...prev]);
      setNewKeyName('');
      setNewKeyDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la creation');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Etes-vous sur de vouloir revoquer cette cle API? Cette action est irreversible.'))
      return;

    try {
      await apiKeysApi.revoke(keyId);
      setApiKeys((prev) => prev.map((k) => (k.id === keyId ? { ...k, status: 'REVOKED' as const } : k)));
      setSuccess('Cle API revoquee avec succes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la revocation');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copie dans le presse-papiers');
    setTimeout(() => setSuccess(null), 2000);
  };

  return (
    <div className="space-y-4">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cles API</h3>
          <p className="text-gray-500 text-sm">
            Utilisez ces cles pour integrer votre application avec l&apos;API Festival.
          </p>
        </div>
        <button onClick={() => setShowNewKeyModal(true)} className="btn-primary">
          Nouvelle cle
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-3">
          {apiKeys.map((key) => (
            <div key={key.id} className="p-4 border border-gray-100 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{key.name}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        key.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : key.status === 'REVOKED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {key.status}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {key.tier}
                    </span>
                  </div>
                  {key.description && <p className="text-sm text-gray-500 mt-1">{key.description}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {key.keyPrefix}...
                    </code>
                    <button
                      onClick={() => copyToClipboard(key.key)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Utilisations: {key.usageCount} | Creee le{' '}
                    {new Date(key.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                {key.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleRevokeKey(key.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Revoquer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Key Modal */}
      <Modal
        isOpen={showNewKeyModal}
        onClose={() => {
          setShowNewKeyModal(false);
          setCreatedKey(null);
          setNewKeyName('');
          setNewKeyDescription('');
        }}
        title={createdKey ? 'Cle API creee' : 'Nouvelle cle API'}
      >
        {createdKey ? (
          <div className="space-y-4">
            <Alert
              type="warning"
              message="Copiez cette cle maintenant. Elle ne sera plus affichee apres la fermeture de cette fenetre."
            />
            <div className="p-4 bg-gray-50 rounded-lg">
              <code className="text-sm font-mono break-all">{createdKey}</code>
            </div>
            <button onClick={() => copyToClipboard(createdKey)} className="btn-primary w-full">
              Copier la cle
            </button>
            <button
              onClick={() => {
                setShowNewKeyModal(false);
                setCreatedKey(null);
              }}
              className="btn-secondary w-full"
            >
              Fermer
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="form-label">Nom de la cle</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="ex: Production API Key"
                className="input-field"
              />
            </div>
            <div>
              <label className="form-label">Description (optionnel)</label>
              <textarea
                value={newKeyDescription}
                onChange={(e) => setNewKeyDescription(e.target.value)}
                placeholder="A quoi sert cette cle?"
                className="input-field"
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowNewKeyModal(false)} className="btn-secondary flex-1">
                Annuler
              </button>
              <button onClick={handleCreateKey} disabled={creating} className="btn-primary flex-1">
                {creating ? <LoadingSpinner size="sm" /> : 'Creer'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// Webhook Management Component
function WebhookManager() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookName, setWebhookName] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>([
    'order.created',
    'order.completed',
    'order.refunded',
    'ticket.scanned',
  ]);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [_deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [_showDeliveries, setShowDeliveries] = useState<string | null>(null);

  // Mock festival ID for development
  const festivalId = 'mock-festival-id';

  const availableEvents = [
    'order.created',
    'order.completed',
    'order.refunded',
    'ticket.scanned',
    'ticket.transferred',
    'payment.succeeded',
    'payment.failed',
  ];

  const loadWebhooks = useCallback(async () => {
    try {
      const result = await webhooksApi.getAll(festivalId);
      setWebhooks(result.items);
    } catch {
      // Mock data for development
      setWebhooks([
        {
          id: '1',
          festivalId,
          name: 'Production Webhook',
          url: 'https://api.example.com/webhooks/festival',
          events: ['order.created', 'order.completed'],
          isActive: true,
          description: 'Webhook principal pour la production',
          failureCount: 0,
          lastTriggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [festivalId]);

  useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks]);

  const handleCreateWebhook = async () => {
    if (!webhookUrl.trim() || !webhookName.trim()) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (webhookEvents.length === 0) {
      setError('Selectionnez au moins un evenement');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const result = await webhooksApi.create(festivalId, {
        name: webhookName,
        url: webhookUrl,
        events: webhookEvents,
        isActive: true,
      });
      setCreatedSecret(result.secret || null);
      setWebhooks((prev) => [result, ...prev]);
      setSuccess('Webhook cree avec succes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la creation');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleWebhook = async (webhookId: string, isActive: boolean) => {
    try {
      await webhooksApi.update(festivalId, webhookId, { isActive });
      setWebhooks((prev) => prev.map((w) => (w.id === webhookId ? { ...w, isActive } : w)));
      setSuccess(`Webhook ${isActive ? 'active' : 'desactive'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification');
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    try {
      const result = await webhooksApi.test(festivalId, webhookId);
      setSuccess(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du test');
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Etes-vous sur de vouloir supprimer ce webhook?')) return;

    try {
      await webhooksApi.delete(festivalId, webhookId);
      setWebhooks((prev) => prev.filter((w) => w.id !== webhookId));
      setSuccess('Webhook supprime');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const handleViewDeliveries = async (webhookId: string) => {
    try {
      const result = await webhooksApi.getDeliveries(festivalId, webhookId);
      setDeliveries(result.items);
      setShowDeliveries(webhookId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des livraisons');
    }
  };

  const toggleEvent = (event: string) => {
    setWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copie dans le presse-papiers');
    setTimeout(() => setSuccess(null), 2000);
  };

  return (
    <div className="space-y-4">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Webhooks</h3>
          <p className="text-gray-500 text-sm">Recevez des notifications en temps reel.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          Nouveau webhook
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Aucun webhook configure</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary mt-4">
            Creer votre premier webhook
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="p-4 border border-gray-100 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{webhook.name}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        webhook.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {webhook.isActive ? 'Actif' : 'Inactif'}
                    </span>
                    {webhook.failureCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                        {webhook.failureCount} echecs
                      </span>
                    )}
                  </div>
                  <code className="text-sm text-gray-500 break-all">{webhook.url}</code>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-mono"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {webhook.lastTriggeredAt
                      ? `Derniere execution: ${new Date(webhook.lastTriggeredAt).toLocaleString('fr-FR')}`
                      : 'Jamais execute'}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggleWebhook(webhook.id, !webhook.isActive)}
                    className="text-gray-400 hover:text-gray-600"
                    title={webhook.isActive ? 'Desactiver' : 'Activer'}
                  >
                    {webhook.isActive ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleTestWebhook(webhook.id)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Tester"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleViewDeliveries(webhook.id)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Historique"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteWebhook(webhook.id)}
                    className="text-red-400 hover:text-red-600"
                    title="Supprimer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Webhook Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreatedSecret(null);
          setWebhookUrl('');
          setWebhookName('');
          setWebhookEvents(['order.created', 'order.completed', 'order.refunded', 'ticket.scanned']);
        }}
        title={createdSecret ? 'Webhook cree' : 'Nouveau webhook'}
      >
        {createdSecret ? (
          <div className="space-y-4">
            <Alert
              type="warning"
              message="Copiez ce secret maintenant. Il ne sera plus affiche apres la fermeture de cette fenetre."
            />
            <div>
              <label className="form-label">Secret du webhook</label>
              <div className="flex gap-2">
                <code className="flex-1 p-3 bg-gray-50 rounded-lg text-sm font-mono break-all">
                  {createdSecret}
                </code>
                <button onClick={() => copyToClipboard(createdSecret)} className="btn-secondary">
                  Copier
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                setShowCreateModal(false);
                setCreatedSecret(null);
              }}
              className="btn-primary w-full"
            >
              Fermer
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="form-label">Nom du webhook</label>
              <input
                type="text"
                value={webhookName}
                onChange={(e) => setWebhookName(e.target.value)}
                placeholder="ex: Production Webhook"
                className="input-field"
              />
            </div>
            <div>
              <label className="form-label">URL du webhook</label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://votre-site.com/webhooks/festival"
                className="input-field"
              />
            </div>
            <div>
              <label className="form-label">Evenements a recevoir</label>
              <div className="space-y-2 mt-2">
                {availableEvents.map((event) => (
                  <label key={event} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webhookEvents.includes(event)}
                      onChange={() => toggleEvent(event)}
                      className="w-4 h-4 rounded text-primary-600"
                    />
                    <span className="text-gray-700 font-mono text-sm">{event}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">
                Annuler
              </button>
              <button onClick={handleCreateWebhook} disabled={creating} className="btn-primary flex-1">
                {creating ? <LoadingSpinner size="sm" /> : 'Creer'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [saved, setSaved] = useState(false);

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'general',
      label: 'General',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      ),
    },
    {
      id: 'payments',
      label: 'Paiements',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      ),
    },
    {
      id: 'security',
      label: 'Securite',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
    {
      id: 'api',
      label: 'API',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      ),
    },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parametres</h1>
        <p className="text-gray-500 mt-1">Configurez votre application et vos preferences.</p>
      </div>

      {/* Settings Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Informations generales
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Nom de la plateforme</label>
                      <input type="text" className="input-field" defaultValue="Festival Platform" />
                    </div>
                    <div>
                      <label className="form-label">Email de contact</label>
                      <input
                        type="email"
                        className="input-field"
                        defaultValue="contact@festival.com"
                      />
                    </div>
                    <div>
                      <label className="form-label">Fuseau horaire</label>
                      <select className="input-field">
                        <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                        <option value="Europe/London">Europe/London (UTC+0)</option>
                        <option value="America/New_York">America/New_York (UTC-5)</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Devise par defaut</label>
                      <select className="input-field">
                        <option value="EUR">Euro (EUR)</option>
                        <option value="USD">Dollar US (USD)</option>
                        <option value="GBP">Livre Sterling (GBP)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Apparence</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Logo</label>
                      <LogoUpload />
                    </div>
                    <div>
                      <label className="form-label">Theme</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="theme"
                            value="light"
                            defaultChecked
                            className="w-4 h-4 text-primary-600"
                          />
                          <span className="text-gray-700">Clair</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="theme"
                            value="dark"
                            className="w-4 h-4 text-primary-600"
                          />
                          <span className="text-gray-700">Sombre</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="theme"
                            value="system"
                            className="w-4 h-4 text-primary-600"
                          />
                          <span className="text-gray-700">Systeme</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Preferences de notification
                  </h2>
                  <div className="space-y-4">
                    {[
                      {
                        id: 'orders',
                        label: 'Nouvelles commandes',
                        description: 'Recevoir une notification pour chaque nouvelle commande',
                      },
                      {
                        id: 'refunds',
                        label: 'Demandes de remboursement',
                        description: 'Etre notifie des demandes de remboursement',
                      },
                      {
                        id: 'lowstock',
                        label: 'Stock faible',
                        description: 'Alerte quand un billet est presque epuise',
                      },
                      {
                        id: 'reports',
                        label: 'Rapports hebdomadaires',
                        description: 'Recevoir un resume hebdomadaire par email',
                      },
                    ].map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 border border-gray-100 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{item.label}</p>
                          <p className="text-sm text-gray-500">{item.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary-600 peer-focus:ring-2 peer-focus:ring-primary-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Canaux de notification
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="email"
                        defaultChecked
                        className="w-4 h-4 rounded text-primary-600"
                      />
                      <label htmlFor="email" className="text-gray-700">
                        Email
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="push"
                        className="w-4 h-4 rounded text-primary-600"
                      />
                      <label htmlFor="push" className="text-gray-700">
                        Notifications push
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="sms"
                        className="w-4 h-4 rounded text-primary-600"
                      />
                      <label htmlFor="sms" className="text-gray-700">
                        SMS
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payments Settings */}
            {activeTab === 'payments' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration Stripe</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Cle publique</label>
                      <input
                        type="text"
                        className="input-field font-mono"
                        placeholder="pk_live_..."
                      />
                    </div>
                    <div>
                      <label className="form-label">Cle secrete</label>
                      <input
                        type="password"
                        className="input-field font-mono"
                        placeholder="sk_live_..."
                      />
                    </div>
                    <div>
                      <label className="form-label">Webhook Secret</label>
                      <input
                        type="password"
                        className="input-field font-mono"
                        placeholder="whsec_..."
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Frais de service</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Commission par vente (%)</label>
                      <input
                        type="number"
                        className="input-field"
                        defaultValue="5"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="form-label">Frais fixes par transaction (EUR)</label>
                      <input
                        type="number"
                        className="input-field"
                        defaultValue="0.50"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Authentification</h2>
                  <div className="space-y-4">
                    <TwoFactorConfig />
                    <ActiveSessions />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Mot de passe</h2>
                  <PasswordChange />
                </div>
              </div>
            )}

            {/* API Settings */}
            {activeTab === 'api' && (
              <div className="p-6 space-y-6">
                <ApiKeysManager />

                <div className="pt-4 border-t border-gray-100">
                  <WebhookManager />
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              {saved && (
                <span className="text-green-600 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Modifications enregistrees
                </span>
              )}
              <button onClick={handleSave} className="btn-primary">
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
