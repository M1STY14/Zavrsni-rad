import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Stars } from '@react-three/drei';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';
import { getTreeDepth } from '../utils/merkle';

// Fractal tree layout constants
const SPREAD_ANGLE = 0.56;
const SHRINK_FACTOR = 0.72;
const TARGET_HEIGHT = 18;

function hashSeed(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) {
        h = ((h << 5) - h + name.charCodeAt(i)) | 0;
    }
    return ((h >>> 0) % 10000) / 10000;
}

function connectionMidpoint(start, end) {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const bowAmount = len * 0.12;
    const perpX = -dy / len;
    const perpY = dx / len;
    const midXBase = (start[0] + end[0]) / 2;
    const outward = Math.sign(midXBase) || 1;
    const flip = Math.sign(perpX) === outward ? 1 : -1;
    return [
        midXBase + perpX * bowAmount * flip,
        (start[1] + end[1]) / 2 + perpY * bowAmount * flip,
        (start[2] + end[2]) / 2
    ];
}

function taperRadius(childDepth, maxDepth) {
    const t = childDepth / (maxDepth || 1);
    return 0.07 - 0.05 * t;
}

function TreeNode({ position, hash, depth, onClick, proofHighlight }) {
    const meshRef = useRef();
    const [hovered, setHovered] = useState(false);

    const isSelected = proofHighlight?.selectedLeaf === hash;
    const isOnPath = proofHighlight?.pathHashes?.has(hash);
    const isSibling = proofHighlight?.siblingHashes?.has(hash);

    const baseColor = useMemo(() => {
        if (isSelected) return '#ff6f00';
        if (isOnPath) return '#ffa726';
        if (isSibling) return '#66bb6a';
        const colors = ['#00d4ff', '#00b8e6', '#667eea', '#764ba2', '#9b59b6'];
        return colors[Math.min(depth, colors.length - 1)];
    }, [depth, isSelected, isOnPath, isSibling]);

    const emissiveIntensity = useMemo(() => {
        if (isSelected) return 1.2;
        if (isOnPath) return 0.8;
        if (isSibling) return 0.6;
        return hovered ? 1.0 : 0.4;
    }, [isSelected, isOnPath, isSibling, hovered]);

    const { scale } = useSpring({
        scale: hovered ? 1.5 : (isSelected ? 1.4 : (isOnPath || isSibling) ? 1.2 : 1),
        config: { mass: 1, tension: 280, friction: 60 },
    });

    useFrame((state) => {
        if (meshRef.current && !hovered) {
            meshRef.current.position.y = Math.sin(state.clock.elapsedTime + position[0]) * 0.1;
        }
    });

    return (
        <group position={position}>
            <animated.mesh
                ref={meshRef}
                scale={scale}
                onClick={onClick}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <sphereGeometry args={[0.4, 32, 32]} />
                <meshStandardMaterial
                    color={baseColor}
                    emissive={baseColor}
                    emissiveIntensity={emissiveIntensity}
                    metalness={0.9}
                    roughness={0.1}
                />
            </animated.mesh>

            {/* Glow effect */}
            <mesh scale={hovered ? 2.0 : (isOnPath || isSelected) ? 1.8 : 1.5}>
                <sphereGeometry args={[0.4, 32, 32]} />
                <meshBasicMaterial
                    color={baseColor}
                    transparent
                    opacity={hovered ? 0.4 : (isOnPath || isSelected) ? 0.35 : 0.2}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* Hash label on hover */}
            {hovered && (
                <Text
                    position={[0, 1.0, 0]}
                    fontSize={0.25}
                    color="#ffffff"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.03}
                    outlineColor="#000000"
                >
                    {hash.substring(0, 8)}...
                </Text>
            )}
        </group>
    );
}

function Connection({ start, end, isOnProofPath, childDepth = 0, maxDepth = 1 }) {
    const lineGeometry = useMemo(() => {
        const mid = connectionMidpoint(start, end);
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(...start),
            new THREE.Vector3(...mid),
            new THREE.Vector3(...end),
        ]);
        const radius = taperRadius(childDepth, maxDepth);
        return new THREE.TubeGeometry(curve, 20, isOnProofPath ? radius + 0.02 : radius, 8, false);
    }, [start, end, isOnProofPath, childDepth, maxDepth]);

    return (
        <mesh geometry={lineGeometry}>
            <meshBasicMaterial
                color={isOnProofPath ? '#ffa726' : '#00d4ff'}
                transparent
                opacity={isOnProofPath ? 0.9 : 0.5}
            />
        </mesh>
    );
}

function Particles({ count = 1000 }) {
    const points = useRef();

    const particlesPosition = useMemo(() => {
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 50;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
        }
        return positions;
    }, [count]);

    useFrame((state) => {
        if (points.current) {
            points.current.rotation.y = state.clock.elapsedTime * 0.05;
        }
    });

    return (
        <points ref={points}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={particlesPosition.length / 3}
                    array={particlesPosition}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial size={0.05} color="#00d4ff" transparent opacity={0.6} sizeAttenuation />
        </points>
    );
}

function calculateTreePositions(node, depth, parentX, parentY, parentAngle, branchLength, positions, yOffset) {
    if (!node) return positions;

    let x, y;
    if (depth === 0) {
        x = 0;
        y = yOffset;
    } else {
        x = parentX + branchLength * Math.sin(parentAngle);
        y = parentY - branchLength * Math.cos(parentAngle);
    }

    const z = Math.sin(x * 0.3) * 0.6;

    positions.set(node.name, {
        hash: node.name,
        position: [x, y, z],
        depth,
        node,
        children: node.children || [],
    });

    if (node.children && node.children.length > 0) {
        const childBranchLength = branchLength * SHRINK_FACTOR;
        const jitter = (hashSeed(node.name) - 0.5) * 0.1;

        node.children.forEach((child, i) => {
            const n = node.children.length;
            let childAngle;
            if (n === 1) {
                childAngle = parentAngle;
            } else if (n === 2) {
                const sign = i === 0 ? -1 : 1;
                const baseSpread = SPREAD_ANGLE + 0.2 / (1 + depth);
                childAngle = parentAngle + sign * (baseSpread + jitter);
            } else {
                const baseSpread = SPREAD_ANGLE + 0.2 / (1 + depth);
                const fanWidth = Math.min(baseSpread * 2 * (1 + Math.log2(n)), Math.PI * 0.7);
                const t = i / (n - 1);
                childAngle = parentAngle - fanWidth / 2 + t * fanWidth + jitter;
            }
            calculateTreePositions(child, depth + 1, x, y, childAngle, childBranchLength, positions, yOffset);
        });
    }

    return positions;
}

function Scene({ data, onNodeClick, proofHighlight }) {
    const { nodePositions, connections, maxDepth } = useMemo(() => {
        if (!data) return { nodePositions: [], connections: [], maxDepth: 0 };

        const treeDepth = getTreeDepth(data);
        const geoSum = treeDepth > 0 ? (1 - Math.pow(SHRINK_FACTOR, treeDepth)) / (1 - SHRINK_FACTOR) : 1;
        const branchLen = TARGET_HEIGHT / (geoSum * Math.cos(SPREAD_ANGLE));
        const posMap = calculateTreePositions(data, 0, 0, 0, 0, branchLen, new Map(), 0);
        const positions = Array.from(posMap.values());
        const maxD = Math.max(...positions.map(p => p.depth));
        const conns = [];

        posMap.forEach((nodeData) => {
            if (nodeData.children && nodeData.children.length > 0) {
                nodeData.children.forEach((child) => {
                    const childData = posMap.get(child.name);
                    if (childData) {
                        const bothOnPath = proofHighlight?.pathHashes?.has(nodeData.hash)
                            && proofHighlight?.pathHashes?.has(childData.hash);
                        conns.push({
                            start: nodeData.position,
                            end: childData.position,
                            isOnProofPath: bothOnPath || false,
                            childDepth: childData.depth,
                        });
                    }
                });
            }
        });

        return { nodePositions: positions, connections: conns, maxDepth: maxD };
    }, [data, proofHighlight]);

    return (
        <>
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 10, 5]} intensity={0.6} color="#ffffff" />
            <pointLight position={[0, 5, 10]} intensity={1.2} color="#00d4ff" />
            <pointLight position={[-8, -5, -5]} intensity={0.8} color="#667eea" />
            <pointLight position={[8, -5, -5]} intensity={0.8} color="#764ba2" />
            <hemisphereLight skyColor="#00d4ff" groundColor="#0a0a1a" intensity={0.3} />

            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <Particles count={500} />

            {connections.map((conn, i) => (
                <Connection key={i} start={conn.start} end={conn.end} isOnProofPath={conn.isOnProofPath} childDepth={conn.childDepth} maxDepth={maxDepth} />
            ))}

            {nodePositions.map((nodeData, i) => (
                <TreeNode
                    key={i}
                    position={nodeData.position}
                    hash={nodeData.hash}
                    depth={nodeData.depth}
                    onClick={() => onNodeClick?.(nodeData.hash)}
                    proofHighlight={proofHighlight}
                />
            ))}

            <OrbitControls
                enableDamping
                dampingFactor={0.05}
                rotateSpeed={0.5}
                zoomSpeed={0.8}
                minDistance={10}
                maxDistance={35}
                maxPolarAngle={Math.PI / 1.5}
                minPolarAngle={Math.PI / 6}
                target={[0, -4, 0]}
                autoRotate
                autoRotateSpeed={0.4}
            />
        </>
    );
}

export default function TreeVisualization3D({ data, proofHighlight, onNodeClick }) {
    const [notification, setNotification] = useState(null);

    const handleNodeClick = (hash) => {
        navigator.clipboard.writeText(hash);
        setNotification(hash);
        setTimeout(() => setNotification(null), 2000);
        onNodeClick?.(hash);
    };

    if (!data) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                <p>No data to display</p>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Canvas
                camera={{ position: [0, 1, 18], fov: 50 }}
                style={{ background: 'linear-gradient(to bottom, #000000, #0a0a1a)' }}
            >
                <Scene data={data} onNodeClick={handleNodeClick} proofHighlight={proofHighlight} />
            </Canvas>

            <div style={{
                position: 'absolute', bottom: '20px', left: '20px',
                background: 'rgba(0, 0, 0, 0.7)', padding: '1rem', borderRadius: '8px',
                color: '#00d4ff', fontSize: '0.85rem', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
            }}>
                <div><strong>Controls:</strong></div>
                <div>Click & Drag - Rotate</div>
                <div>Scroll - Zoom</div>
                <div>Click Leaf - Show Proof</div>
            </div>

            {notification && (
                <div style={{
                    position: 'absolute', top: '20px', right: '20px',
                    background: 'rgba(0, 212, 255, 0.15)', border: '2px solid rgba(0, 212, 255, 0.4)',
                    padding: '1rem 1.5rem', borderRadius: '12px', color: '#00d4ff',
                    fontSize: '0.9rem', maxWidth: '300px', wordBreak: 'break-all',
                    backdropFilter: 'blur(10px)', animation: 'fadeIn 0.3s ease',
                }}>
                    Hash copied to clipboard
                    <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.8 }}>
                        {notification.substring(0, 16)}...
                    </div>
                </div>
            )}
        </div>
    );
}
