import type { TreeFetchResult } from './tree';

export type SystemId = 'bitcoin' | 'git' | 'bittorrent';

export interface SystemSelectOption {
    value: string;
    label: string;
}

export interface SystemInput {
    key: string;
    label: string;
    type: 'text' | 'number' | 'select';
    placeholder?: string;
    options?: SystemSelectOption[];
}

// The plugin shape every system module exports as default. New systems just
// need an object that satisfies this contract.
export interface System {
    id: SystemId;
    name: string;
    color: string;
    icon: string;
    description: string;
    inputs: SystemInput[];
    hint: string;
    validate(params: Record<string, string>): boolean;
    fetchTree(params: Record<string, string>): Promise<TreeFetchResult>;
}
