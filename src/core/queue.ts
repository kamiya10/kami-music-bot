import { KamiResource } from './resource';

export interface KamiQueue {
  resources: KamiResource[];
}

const queues = new Map<string, KamiQueue>();

export function getQueue(guildId: string): KamiQueue | undefined {
  return queues.get(guildId);
}
