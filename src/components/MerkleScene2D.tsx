import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TreeNode } from '../types/tree';
import { DEMO_TREE } from '../data/demo';
import type { ProofHighlight } from '../hooks/useProofClick';

// A flat, traditional 2D rendering of the Merkle tree: straight diagonal links
// and branching, drawn as SVG. This is both a user-selectable alternative to
// the 3D scene and the automatic fallback when WebGL is unavailable.
//
// It shares MerkleScene3D's prop contract (treeData / proofHighlight /
// onNodeClick / onExpandCollapsed / expandingHashes), so the proof flow in
// useProofClick works identically here — click a leaf to build a proof, with
// the path and sibling nodes highlighted using the same colour semantics as the
// 3D ExploringTreeNode. Neighbour blocks, particles and animations are
// intentionally omitted; this view is a clean structural diagram.

interface MerkleScene2DProps {
    treeData: TreeNode | null;
    proofHighlight: ProofHighlight | null;
    onNodeClick: (hash: string) => void;
    onExpandCollapsed?: (parentHash: string) => void;
    expandingHashes?: Record<string, boolean>;
}

interface PositionedNode {
    // Stable identity by tree position, not hash: Merkle trees can repeat a hash
    // (Bitcoin duplicates the last node on odd levels), so hashes are not unique
    // and must not be used as React keys.
    id: string;
    node: TreeNode;
    hash: string;
    x: number;
    y: number;
    depth: number;
    parent: PositionedNode | null;
}

interface Transform {
    k: number;
    x: number;
    y: number;
}

const LEAF_GAP = 56; // horizontal spacing between adjacent leaves
const LEVEL_HEIGHT = 96; // vertical spacing between depths
const NODE_R = 13;
const FIT_PADDING = 70;
const MIN_SCALE = 0.2;
const MAX_SCALE = 4;

const DEPTH_COLORS = ['#00d4ff', '#00b8e6', '#667eea', '#764ba2', '#9b59b6'];

function clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
}

// Classic "leaves evenly spaced, parents centred over their children" layout
// (a Reingold–Tilford simplification). Collapsed nodes are treated as leaves.
function layoutTree(root: TreeNode): PositionedNode[] {
    const out: PositionedNode[] = [];
    let leafCursor = 0;

    function walk(node: TreeNode, depth: number, parent: PositionedNode | null, id: string): PositionedNode {
        const entry: PositionedNode = {
            id,
            node,
            hash: node.name,
            x: 0,
            y: depth * LEVEL_HEIGHT,
            depth,
            parent,
        };
        out.push(entry);

        const children = node.collapsed ? undefined : node.children;
        if (children && children.length > 0) {
            const placed = children.map((c, i) => walk(c, depth + 1, entry, `${id}.${i}`));
            // Centre the parent between its first and last child for a tidy look.
            entry.x = (placed[0]!.x + placed[placed.length - 1]!.x) / 2;
        } else {
            entry.x = leafCursor * LEAF_GAP;
            leafCursor += 1;
        }
        return entry;
    }

    walk(root, 0, null, 'r');
    return out;
}

function nodeColor(node: TreeNode, depth: number, ph: ProofHighlight | null): string {
    if (node.collapsed) return '#f7931a'; // Bitcoin orange — "click to expand"
    if (ph?.selectedLeaf === node.name) return '#ff6f00';
    if (ph?.pathHashes?.has(node.name)) return '#ffa726';
    if (ph?.siblingHashes?.has(node.name)) return '#66bb6a';
    return DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)]!;
}

// Tracks the rendered pixel size of the SVG so we can fit the tree on load.
function useElementSize(): [React.MutableRefObject<HTMLDivElement | null>, { w: number; h: number }] {
    const ref = useRef<HTMLDivElement | null>(null);
    const [size, setSize] = useState({ w: 0, h: 0 });
    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return [ref, size];
}

export default function MerkleScene2D({
    treeData,
    proofHighlight,
    onNodeClick,
    onExpandCollapsed,
    expandingHashes,
}: MerkleScene2DProps) {
    // Mirror the 3D scene's demo fallback: before any input, show the demo tree
    // so the background isn't blank and proof clicks still work (demo mode).
    const tree = treeData ?? (DEMO_TREE as TreeNode);

    const { nodes, bounds } = useMemo(() => {
        const positioned = layoutTree(tree);
        let minX = Infinity;
        let maxX = -Infinity;
        let maxY = 0;
        for (const n of positioned) {
            if (n.x < minX) minX = n.x;
            if (n.x > maxX) maxX = n.x;
            if (n.y > maxY) maxY = n.y;
        }
        if (!Number.isFinite(minX)) {
            minX = 0;
            maxX = 0;
        }
        return { nodes: positioned, bounds: { minX, maxX, maxY } };
    }, [tree]);

    const [containerRef, size] = useElementSize();
    const [transform, setTransform] = useState<Transform>({ k: 1, x: 0, y: 0 });

    // Fit-and-centre whenever the tree or the container size changes.
    const fitKey = `${bounds.minX}|${bounds.maxX}|${bounds.maxY}|${size.w}|${size.h}`;
    useEffect(() => {
        if (size.w === 0 || size.h === 0) return;
        const worldW = bounds.maxX - bounds.minX + FIT_PADDING * 2;
        const worldH = bounds.maxY + FIT_PADDING * 2;
        const k = clamp(Math.min(size.w / worldW, size.h / worldH), MIN_SCALE, MAX_SCALE);
        const cx = (bounds.minX + bounds.maxX) / 2;
        const cy = bounds.maxY / 2;
        setTransform({ k, x: size.w / 2 - cx * k, y: size.h / 2 - cy * k });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fitKey]);

    // Pan via pointer drag. Panning (and pointer capture) only begins once the
    // pointer moves past a small threshold — a plain click never captures the
    // pointer, so node clicks register reliably on the first try.
    const dragRef = useRef<{
        active: boolean;
        pointerId: number;
        originX: number;
        originY: number;
        lastX: number;
        lastY: number;
        moved: boolean;
        captured: boolean;
    }>({ active: false, pointerId: -1, originX: 0, originY: 0, lastX: 0, lastY: 0, moved: false, captured: false });

    const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
        dragRef.current = {
            active: true,
            pointerId: e.pointerId,
            originX: e.clientX,
            originY: e.clientY,
            lastX: e.clientX,
            lastY: e.clientY,
            moved: false,
            captured: false,
        };
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
        const d = dragRef.current;
        if (!d.active) return;
        // Promote to a real drag only after crossing the threshold from the
        // press origin; capture the pointer at that point, not before.
        if (!d.moved && Math.hypot(e.clientX - d.originX, e.clientY - d.originY) > 4) {
            d.moved = true;
            d.captured = true;
            e.currentTarget.setPointerCapture(d.pointerId);
        }
        if (d.moved) {
            const dx = e.clientX - d.lastX;
            const dy = e.clientY - d.lastY;
            setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
        }
        d.lastX = e.clientX;
        d.lastY = e.clientY;
    }, []);

    const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
        const d = dragRef.current;
        d.active = false;
        if (d.captured) {
            e.currentTarget.releasePointerCapture(d.pointerId);
            d.captured = false;
        }
    }, []);

    // Wheel zoom toward the cursor. Attached imperatively with passive:false so
    // preventDefault works (React's onWheel is passive in some setups).
    const svgRef = useRef<SVGSVGElement | null>(null);
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return undefined;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = svg.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            setTransform((t) => {
                const k = clamp(t.k * (e.deltaY < 0 ? 1.1 : 1 / 1.1), MIN_SCALE, MAX_SCALE);
                const f = k / t.k;
                return { k, x: px - (px - t.x) * f, y: py - (py - t.y) * f };
            });
        };
        svg.addEventListener('wheel', onWheel, { passive: false });
        return () => svg.removeEventListener('wheel', onWheel);
    }, []);

    const [hovered, setHovered] = useState<string | null>(null);

    const handleNodeActivate = useCallback(
        (n: PositionedNode) => {
            if (dragRef.current.moved) return; // it was a pan, not a click
            if (n.node.collapsed) onExpandCollapsed?.(n.hash);
            else onNodeClick(n.hash);
        },
        [onNodeClick, onExpandCollapsed],
    );

    const pathHashes = proofHighlight?.pathHashes;
    // Per-node hash labels are helpful on small trees (demo, Git) but turn into
    // unreadable noise on large Bitcoin trees — there, show them only on hover.
    const showStaticLabels = nodes.length <= 80;

    return (
        <div ref={containerRef} className="merkle-scene-2d">
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                style={{ cursor: dragRef.current.active ? 'grabbing' : 'grab', touchAction: 'none' }}
            >
                <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
                    {/* Links first, so nodes draw on top. */}
                    {nodes.map((n) => {
                        if (!n.parent) return null;
                        const onPath = !!pathHashes?.has(n.hash) && !!pathHashes?.has(n.parent.hash);
                        return (
                            <line
                                key={`link-${n.id}`}
                                x1={n.parent.x}
                                y1={n.parent.y}
                                x2={n.x}
                                y2={n.y}
                                stroke={onPath ? '#ffa726' : 'rgba(0, 212, 255, 0.35)'}
                                strokeWidth={onPath ? 3 : 1.5}
                            />
                        );
                    })}

                    {nodes.map((n) => {
                        const color = nodeColor(n.node, n.depth, proofHighlight);
                        const isSelected = proofHighlight?.selectedLeaf === n.hash;
                        const isOnPath = !!proofHighlight?.pathHashes?.has(n.hash);
                        const isSibling = !!proofHighlight?.siblingHashes?.has(n.hash);
                        const emphasised = isSelected || isOnPath || isSibling || n.node.collapsed;
                        const isExpanding = !!expandingHashes?.[n.hash];
                        const r = emphasised ? NODE_R + 3 : NODE_R;
                        return (
                            <g
                                key={`node-${n.id}`}
                                transform={`translate(${n.x}, ${n.y})`}
                                onClick={() => handleNodeActivate(n)}
                                onPointerEnter={() => setHovered(n.id)}
                                onPointerLeave={() => setHovered((h) => (h === n.id ? null : h))}
                                style={{ cursor: 'pointer' }}
                                className={isExpanding ? 'merkle-node-2d expanding' : 'merkle-node-2d'}
                            >
                                {/* Invisible, generous hit target so nodes (especially
                                    collapsed ones) are easy to click even when zoomed out. */}
                                <circle r={r + 12} fill="transparent" />
                                {/* Soft glow ring for emphasised nodes. */}
                                {emphasised && (
                                    <circle r={r + 5} fill={color} opacity={0.22} />
                                )}
                                <circle
                                    r={r}
                                    fill={color}
                                    stroke="#0a0a1a"
                                    strokeWidth={2}
                                />
                                {/* Collapsed nodes always show their tx count. */}
                                {n.node.collapsed && (
                                    <text
                                        y={-r - 8}
                                        textAnchor="middle"
                                        fontSize={13}
                                        fontWeight={600}
                                        fill="#f7931a"
                                    >
                                        {isExpanding ? 'expanding…' : `+${n.node.leafCount ?? ''} txs`}
                                    </text>
                                )}
                                {/* Short hash under each node; full-ish hash on hover.
                                    On large trees only the hovered node is labelled. */}
                                {(showStaticLabels || hovered === n.id) && (
                                    <text
                                        y={r + 16}
                                        textAnchor="middle"
                                        fontSize={11}
                                        fill={hovered === n.id ? '#ffffff' : 'rgba(255,255,255,0.55)'}
                                    >
                                        {hovered === n.id ? `${n.hash.substring(0, 16)}…` : n.hash.substring(0, 8)}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </g>
            </svg>
        </div>
    );
}
