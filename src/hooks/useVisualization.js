import { useCallback, useMemo, useReducer } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { systems } from '../systems/index.js';
import { fetchAdjacentBlocks, expandSubtree } from '../systems/bitcoin.js';
import { fetchAdjacentCommits } from '../systems/git.js';
import { replaceSubtree } from '../utils/merkle.js';

// Single source of truth for the active visualization. Local state is owned by
// useReducer (system, inputs, loaded tree, expansion progress); transient
// network state (loading, errors, neighbor lists) is owned by react-query so
// we get caching + dedup for free. The hook returns a unified `state` view
// that merges both surfaces.

const initialState = {
  activeSystem: systems[0],
  inputValues: {},
  treeData: null,
  rootHash: null,
  error: null,
  expandingHashes: {},
};

function reducer(state, action) {
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
      return {
        ...state,
        expandingHashes: next,
        treeData: replaceSubtree(state.treeData, action.payload.parentHash, action.payload.subtree),
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

export default function useVisualization(t) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const queryClient = useQueryClient();

  // Tree fetch — wrapped in a mutation so the user's submit click is what
  // triggers it, but the underlying fetch goes through the query cache so
  // re-submitting the same block/repo is served from cache for 60s.
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!state.activeSystem.validate(state.inputValues)) {
        throw new Error(t('errors.fill_one'));
      }
      return queryClient.fetchQuery({
        queryKey: ['tree', state.activeSystem.id, state.inputValues],
        queryFn: () => state.activeSystem.fetchTree(state.inputValues),
      });
    },
    onSuccess: (result) => {
      dispatch({ type: 'TREE_LOADED', payload: result });
    },
    onError: (err) => {
      dispatch({ type: 'ERROR_SET', payload: err.message || t('errors.server') });
    },
  });

  // Neighbor blocks (Bitcoin) / commits (Git) — auto-fetched when a rootHash
  // is loaded. Replaces the old fire-and-forget Promise.then(setNeighborBlocks).
  const neighborQuery = useQuery({
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
        return commits.map(n => ({ height: n.label, tree: n.tree, rootHash: n.rootHash, side: n.side }));
      }
      return [];
    },
    enabled: !!state.rootHash && (state.activeSystem.id === 'bitcoin' || state.activeSystem.id === 'git'),
  });

  const expandMutation = useMutation({
    mutationFn: ({ parentHash }) => expandSubtree(state.rootHash, parentHash),
    onMutate: ({ parentHash }) => {
      dispatch({ type: 'EXPAND_STARTED', payload: parentHash });
    },
    onSuccess: (subtree, { parentHash }) => {
      dispatch({ type: 'EXPAND_SUCCEEDED', payload: { parentHash, subtree } });
    },
    onError: (err, { parentHash }) => {
      dispatch({
        type: 'EXPAND_FAILED',
        payload: { parentHash, error: err.message || 'Failed to expand subtree.' },
      });
    },
  });

  const submit = useCallback(() => submitMutation.mutate(), [submitMutation]);

  const expandCollapsed = useCallback((parentHash) => {
    if (!state.rootHash || state.activeSystem.id !== 'bitcoin') return;
    expandMutation.mutate({ parentHash });
  }, [expandMutation, state.rootHash, state.activeSystem.id]);

  const actions = useMemo(() => ({
    systemChanged: (system) => dispatch({ type: 'SYSTEM_CHANGED', payload: system }),
    inputChanged: (key, value) => dispatch({ type: 'INPUT_CHANGED', payload: { key, value } }),
    cleared: () => dispatch({ type: 'CLEARED' }),
  }), []);

  // Compose the unified surface AppShell consumes. Network state comes from
  // react-query; reducer state is everything else.
  const composedState = {
    ...state,
    loading: submitMutation.isPending,
    neighborBlocks: neighborQuery.data ?? [],
  };

  return { state: composedState, actions, submit, expandCollapsed };
}
