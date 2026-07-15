export type MultiplayerMode = 'v1-backend' | 'v2-backend' | 'disabled';

export function resolveMultiplayerMode(value: string | undefined): MultiplayerMode {
  if (value === 'v2-backend' || value === 'disabled') return value;
  return 'v1-backend';
}

export const MULTIPLAYER_MODE = resolveMultiplayerMode(import.meta.env?.VITE_MULTIPLAYER_MODE);
export const V2_EVENT_ID = import.meta.env?.VITE_E23_EVENT_ID?.trim() ?? '';
