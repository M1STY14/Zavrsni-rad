import { useCallback, useMemo, useReducer } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { systems } from '../systems/index';
import { fetchAdjacentBlocks, expandSubtree, type AdjacentBlock } from '../systems/bitcoin';
import { fetchAdjacentCommits } from '../systems/git';
import { replaceSubtree } from '../utils/merkle';
import type { System } from '../types/system';
import type { TreeFetchResult, TreeNode } from '../types/tree';

// Reducer state — local, deterministic, owned by useReducer. Network state
// (loading, neighbor blocks) lives in react-query and is merged into the
// composed surface this hook returns.
export interface VisualizationState {
    activeSystem: System;
    inputValues: Record<string, string>;
    treeData: TreeNode | null;
    rootHash: string | null;
    error: string | null;
    expandingHashes: Record<string, boolean>;
}

export type VisualizationAction =
    | { type: 'SYSTEM_CHANGED'; payload: System }
    | { type: 'INPUT_CHANGED'; payload: { key: string; value: string } }
    | { type: 'TREE_LOADED'; payload: TreeFetchResult }
    | { type: 'CLEARED' }
    | { type: 'EXPAND_STARTED'; payload: string }
    | { type: 'EXPAND_SUCCEEDED'; payload: { parentHash: string; subtree: TreeNode } }
    | { type: 'EXPAND_FAILED'; payload: { parentHash: string; error: string } }
    | { type: 'ERROR_SET'; payload: string };

const initialState: VisualizationState = {
    activeSystem: systems[0]!,
    inputValues: {},
    treeData: null,
    rootHash: null,
    error: null,
    expandingHashes: {},
};

function reducer(state: VisualizationState, action: VisualizationAction): VisualizationState {
    switch (action.type) {
        case 'SYSTEM_CHANGED':
            return { ...initialState, activeSystem: action.payload };
        case 'INPUT_CHANGED':
            return {
                ...state,
                inputValues: { ...state.inputValues, [action.payload.key]: action.payload.value },
            };
        case 'TREE_LOADED':
            return {
                ...state,
                error: null,
                treeData: action.payload.tree,
                rootHash: action.payload.rootHash,
            };
        case 'CLEARED':
            return { ...initialState, activeSystem: state.activeSystem };
        case 'EXPAND_STARTED':
            return {
                ...state,
                expandingHashes: { ...state.expandingHashes, [action.payload]: true },
            };
        case 'EXPAND_SUCCEEDED': {
            const next = { ...state.expandingHashes };
            delete next[action.payload.parentHash];
            const newTree = replaceSubtree(state.treeData, action.payload.parentHash, action.payload.subtree);
            return {
                ...state,
                expandingHashes: next,
                treeData: (newTree ?? state.treeData) as TreeNode | null,
            };
        }
        case 'EXPAND_FAILED': {
            const next = { ...state.expandingHashes };
            delete next[action.payload.parentHash];
            return { ...state, expandingHashes: next, error: action.payload.error };
        }
        case 'ERROR_SET':
            return { ...state, error: action.payload };
        default:
            return state;
    }
}

// The composed surface — reducer fields plus network-derived fields. AppShell
// reads from this; it doesn't care which slice each field comes from.
export interface VisualizationView extends VisualizationState {
    loading: boolean;
    neighborBlocks: AdjacentBlock[];
}

export interface VisualizationActions {
    systemChanged: (system: System) => void;
    inputChanged: (key: string, value: string) => void;
    cleared: () => void;
}

export interface VisualizationApi {
    state: VisualizationView;
    actions: VisualizationActions;
    submit: () => void;
    expandCollapsed: (parentHash: string) => void;
}

type TFn = (key: string, ...args: unknown[]) => unknown;

export default function useVisualization(t: TFn): VisualizationApi {
    const [state, dispatch] = useReducer(reducer, initialState);
    const queryClient = useQueryClient();

    const submitMutation = useMutation({
        mutationFn: async (): Promise<TreeFetchResult> => {
            if (!state.activeSystem.validate(state.inputValues)) {
                throw new Error(String(t('errors.fill_one')));
            }
            return queryClient.fetchQuery({
                queryKey: ['tree', state.activeSystem.id, state.inputValues],
                queryFn: () => state.activeSystem.fetchTree(state.inputValues),
            });
        },
        onSuccess: (result) => {
            dispatch({ type: 'TREE_LOADED', payload: result });
        },
        onError: (err: Error) => {
            dispatch({ type: 'ERROR_SET', payload: err.message || String(t('errors.server')) });
        },
    });

    const neighborQuery = useQuery<AdjacentBlock[]>({
        queryKey: [
            'neighbors',
            state.activeSystem.id,
            state.rootHash,
            state.inputValues.repoPath,
            state.inputValues.blockHeight,
        ],
        queryFn: async () => {
            if (!state.rootHash) return [];
            if (state.activeSystem.id === 'bitcoin' && state.inputValues.blockHeight) {
                const height = parseInt(state.inputValues.blockHeight, 10);
                return fetchAdjacentBlocks(height);
            }
            if (state.activeSystem.id === 'git') {
                const repoPath = state.inputValues.repoPath || '.';
                const commits = await fetchAdjacentCommits(state.rootHash, repoPath);
                return commits.map(n => ({
                    height: n.label as unknown as number, // git neighbor labels are SHA fragments, not numbers
                    tree: n.tree,
                    rootHash: n.rootHash,
                    side: n.side,
                }));
            }
            return [];
        },
        enabled: !!state.rootHash && (state.activeSystem.id === 'bitcoin' || state.activeSystem.id === 'git'),
    });

    const expandMutation = useMutation({
        mutationFn: ({ parentHash }: { parentHash: string }) => {
            if (!state.rootHash) throw new Error('No tree loaded');
            return expandSubtree(state.rootHash, parentHash);
        },
        onMutate: ({ parentHash }) => {
            dispatch({ type: 'EXPAND_STARTED', payload: parentHash });
        },
        onSuccess: (subtree, { parentHash }) => {
            dispatch({ type: 'EXPAND_SUCCEEDED', payload: { parentHash, subtree } });
        },
        onError: (err: Error, { parentHash }) => {
            dispatch({
                type: 'EXPAND_FAILED',
                payload: { parentHash, error: err.message || 'Failed to expand subtree.' },
            });
        },
    });

    const submit = useCallback(() => submitMutation.mutate(), [submitMutation]);

    const expandCollapsed = useCallback((parentHash: string) => {
        if (!state.rootHash || state.activeSystem.id !== 'bitcoin') return;
        expandMutation.mutate({ parentHash });
    }, [expandMutation, state.rootHash, state.activeSystem.id]);

    const actions = useMemo<VisualizationActions>(() => ({
        systemChanged: (system) => dispatch({ type: 'SYSTEM_CHANGED', payload: system }),
        inputChanged: (key, value) => dispatch({ type: 'INPUT_CHANGED', payload: { key, value } }),
        cleared: () => dispatch({ type: 'CLEARED' }),
    }), []);

    const composedState: VisualizationView = {
        ...state,
        loading: submitMutation.isPending,
        neighborBlocks: neighborQuery.data ?? [],
    };

    return { state: composedState, actions, submit, expandCollapsed };
}
