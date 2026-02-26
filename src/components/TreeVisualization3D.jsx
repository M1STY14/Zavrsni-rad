import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Stars } from '@react-three/drei';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';

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

function Connection({ start, end, isOnProofPath }) {
    const points = useMemo(() => {
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(...start),
            new THREE.Vector3(
                (start[0] + end[0]) / 2,
                (start[1] + end[1]) / 2 - 0.3,
                (start[2] + end[2]) / 2
            ),
            new THREE.Vector3(...end),
        ]);
        return curve.getPoints(30);
    }, [start, end]);

    const lineGeometry = useMemo(() => {
        const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p.x, p.y, p.z)));
        return new THREE.TubeGeometry(curve, 20, isOnProofPath ? 0.06 : 0.04, 8, false);
    }, [points, isOnProofPath]);

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

function calculateTreePositions(node, depth = 0, parentX = 0, indexInLevel = 0, totalAtLevel = 1, positions = new Map(), levelCounts = {}) {
    if (!node) return positions;

    if (!levelCounts[depth]) levelCounts[depth] = 0;
    levelCounts[depth]++;

    const y = -depth * 3;
    let xPos;

    if (depth === 0) {
        xPos = 0;
    } else if (depth === 1) {
        const spacing = 4;
        xPos = (indexInLevel - (totalAtLevel - 1) / 2) * spacing;
    } else {
        const spacing = 6 / Math.pow(1.5, depth - 1);
        xPos = parentX + (indexInLevel - (totalAtLevel - 1) / 2) * spacing;
    }

    const zPos = Math.sin(xPos * 0.3) * 1.2;

    positions.set(node.name, {
        hash: node.name,
        position: [xPos, y, zPos],
        depth,
        node,
        children: node.children || [],
    });

    if (node.children && node.children.length > 0) {
        node.children.forEach((child, childIndex) => {
            calculateTreePositions(child, depth + 1, xPos, childIndex, node.children.length, positions, levelCounts);
        });
    }

    return positions;
}

function Scene({ data, onNodeClick, proofHighlight }) {
    const { nodePositions, connections } = useMemo(() => {
        if (!data) return { nodePositions: [], connections: [] };

        const posMap = calculateTreePositions(data);
        const positions = Array.from(posMap.values());
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
                        });
                    }
                });
            }
        });

        return { nodePositions: positions, connections: conns };
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
                <Connection key={i} start={conn.start} end={conn.end} isOnProofPath={conn.isOnProofPath} />
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
