import type { System } from '../types/system';
import bitcoin from './bitcoin';
import git from './git';
import bittorrent from './bittorrent';

export const systems: System[] = [bitcoin, git, bittorrent];

export function getSystemById(id: string): System | null {
    return systems.find(s => s.id === id) || null;
}

export { bitcoin, git, bittorrent };
