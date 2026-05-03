import bitcoin from './bitcoin';
import git from './git';
import bittorrent from './bittorrent';

export const systems = [bitcoin, git, bittorrent];

export function getSystemById(id) {
    return systems.find(s => s.id === id) || null;
}

export { bitcoin, git, bittorrent };
