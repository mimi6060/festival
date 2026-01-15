'use client';

import { cn } from '@/lib/utils';
import { ConnectionState } from '@/hooks';

interface ConnectionStatusIndicatorProps {
  isConnected: boolean;
  connectionState: ConnectionState;
  lastUpdate?: Date | null;
  onReconnect?: () => void;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig: Record<
  ConnectionState,
  {
    color: string;
    bgColor: string;
    label: string;
    animate: boolean;
  }
> = {
  connected: {
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    label: 'Connecte en temps reel',
    animate: true,
  },
  connecting: {
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50',
    label: 'Connexion en cours...',
    animate: true,
  },
  reconnecting: {
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    label: 'Reconnexion...',
    animate: true,
  },
  disconnected: {
    color: 'bg-gray-400',
    bgColor: 'bg-gray-50',
    label: 'Deconnecte',
    animate: false,
  },
  error: {
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    label: 'Erreur de connexion',
    animate: false,
  },
};

const sizeConfig = {
  sm: {
    dot: 'w-2 h-2',
    text: 'text-xs',
    container: 'gap-1.5 px-2 py-1',
    icon: 'w-3 h-3',
  },
  md: {
    dot: 'w-3 h-3',
    text: 'text-sm',
    container: 'gap-2 px-3 py-1.5',
    icon: 'w-4 h-4',
  },
  lg: {
    dot: 'w-4 h-4',
    text: 'text-base',
    container: 'gap-2.5 px-4 py-2',
    icon: 'w-5 h-5',
  },
};

export function ConnectionStatusIndicator({
  isConnected,
  connectionState,
  lastUpdate,
  onReconnect,
  showLabel = true,
  size = 'md',
  className,
}: ConnectionStatusIndicatorProps) {
  const config = statusConfig[connectionState];
  const sizes = sizeConfig[size];

  const formatLastUpdate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);

    if (diffSec < 10) { return 'a l\'instant'; }
    if (diffSec < 60) { return `il y a ${diffSec}s`; }
    if (diffMin < 60) { return `il y a ${diffMin}min`; }
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border',
        config.bgColor,
        sizes.container,
        className
      )}
    >
      {/* Status dot */}
      <div className="relative flex items-center justify-center">
        <span
          className={cn(
            'rounded-full',
            config.color,
            sizes.dot,
            config.animate && 'animate-pulse'
          )}
        />
        {config.animate && (
          <span
            className={cn(
              'absolute rounded-full opacity-40',
              config.color,
              sizes.dot,
              'animate-ping'
            )}
          />
        )}
      </div>

      {/* Status label */}
      {showLabel && (
        <div className="flex items-center gap-2">
          <span className={cn('font-medium text-gray-700', sizes.text)}>
            {config.label}
          </span>

          {/* Last update time */}
          {isConnected && lastUpdate && (
            <span className={cn('text-gray-500', sizes.text)}>
              ({formatLastUpdate(lastUpdate)})
            </span>
          )}

          {/* Reconnect button for error/disconnected states */}
          {(connectionState === 'error' || connectionState === 'disconnected') && onReconnect && (
            <button
              onClick={onReconnect}
              className={cn(
                'inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors',
                sizes.text
              )}
            >
              <svg className={sizes.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Reconnecter
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Compact version for sidebar/header
export function ConnectionStatusDot({
  isConnected: _isConnected,
  connectionState,
  className,
}: Pick<ConnectionStatusIndicatorProps, 'isConnected' | 'connectionState' | 'className'>) {
  const config = statusConfig[connectionState];

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      title={config.label}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          config.color,
          config.animate && 'animate-pulse'
        )}
      />
      {config.animate && (
        <span
          className={cn(
            'absolute w-2 h-2 rounded-full opacity-40 animate-ping',
            config.color
          )}
        />
      )}
    </div>
  );
}

export default ConnectionStatusIndicator;
