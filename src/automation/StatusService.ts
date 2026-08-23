import { store } from '../utils/store';

export type StatusKey =
  | 'Operational'
  | 'Maintenance'
  | 'Degraded Performance'
  | 'Offline';

export interface StatusMeta {
  color: number;
  badge: string;
}

export const STATUS_META: Record<StatusKey, StatusMeta> = {
  Operational: { color: 0x2ecc71, badge: '✅' },
  Maintenance: { color: 0xf1c40f, badge: '🛠️' },
  'Degraded Performance': { color: 0xe67e22, badge: '⚠️' },
  Offline: { color: 0xe74c3c, badge: '❌' },
};

export const STATUS_KEYS: StatusKey[] = [
  'Operational',
  'Maintenance',
  'Degraded Performance',
  'Offline',
];

export interface StatusConfig {
  status: StatusKey;
  message: string;
  channelId?: string;
  roleId?: string;
  updatedAt: number;
  updatedByTag: string;
}

export interface StatusHistoryEntry {
  status: StatusKey;
  message: string;
  updatedAt: number;
  updatedByTag: string;
}

const MAX_HISTORY = 25;

export function getStatus(guildId: string): StatusConfig | null {
  return store.get<StatusConfig>('status', guildId);
}

export function getStatusHistory(guildId: string): StatusHistoryEntry[] {
  return store.get<StatusHistoryEntry[]>('statushistory', guildId) ?? [];
}

export function setStatus(
  guildId: string,
  cfg: Omit<StatusConfig, 'updatedAt' | 'updatedByTag'>,
  updatedByTag: string
): StatusConfig {
  const full: StatusConfig = {
    ...cfg,
    updatedAt: Date.now(),
    updatedByTag,
  };
  store.set('status', guildId, full);

  const entry: StatusHistoryEntry = {
    status: full.status,
    message: full.message,
    updatedAt: full.updatedAt,
    updatedByTag,
  };
  const history = getStatusHistory(guildId);
  history.unshift(entry);
  const trimmed = history.slice(0, MAX_HISTORY);
  store.set('statushistory', guildId, trimmed);

  return full;
}

export function setStatusChannel(guildId: string, channelId: string): void {
  const cfg = getStatus(guildId) ?? {
    status: 'Operational' as StatusKey,
    message: '',
    updatedAt: Date.now(),
    updatedByTag: '',
  };
  cfg.channelId = channelId;
  store.set('status', guildId, cfg);
}
