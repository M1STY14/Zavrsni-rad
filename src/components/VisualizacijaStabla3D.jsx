import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Stars, useTexture } from '@react-three/drei';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';

// Node component for each merkle tree node
function TreeNode({ position, hash, depth, onClick, isHighlighted }) {
    const meshRef = useRef();
    const [hovered, setHovered] = useState(false);

    // Color based on depth in tree
    const baseColor = useMemo(() => {
        const colors = [
            '#00d4ff', // Root - cyan
            '#00b8e6', // Level 1
            '#667eea', // Level 2
            '#764ba2', // Level 3 - purple
            '#9b59b6', // Level 4
        ];
        return colors[Math.min(depth, colors.length - 1)];
    }, [depth]);

    // Animate scale when hovered
    const { scale } = useSpring({
        scale: hovered ? 1.5 : 1,
        config: { mass: 1, tension: 280, friction: 60 }
    });

    useFrame((state) => {
        if (meshRef.current && !hovered) {
            // Gentle floating animation - relative to group position
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
                    emissiveIntensity={hovered ? 1.0 : 0.4}
                    metalness={0.9}
                    roughness={0.1}
                />
            </animated.mesh>

            {/* Glow effect */}
            <mesh scale={hovered ? 2.0 : 1.5}>
                <sphereGeometry args={[0.4, 32, 32]} />
                <meshBasicMaterial
                    color={baseColor}
                    transparent
                    opacity={hovered ? 0.4 : 0.2}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* Hash label */}
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

// Connection line between nodes using tube for better visibility
function Connection({ start, end, isHighlighted }) {
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
        return new THREE.TubeGeometry(curve, 20, 0.04, 8, false);
    }, [points]);

    return (
        <mesh geometry={lineGeometry}>
            <meshBasicMaterial
                color={isHighlighted ? '#00ffff' : '#00d4ff'}
                transparent
                opacity={isHighlighted ? 0.9 : 0.5}
            />
        </mesh>
    );
}

// Particle system for background effect
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
            <pointsMaterial
                size={0.05}
                color="#00d4ff"
                transparent
                opacity={0.6}
                sizeAttenuation
            />
        </points>
    );
}

// Calculate 3D positions for tree nodes - returns map of hash to position and node data
function calculateTreePositions(node, depth = 0, parentX = 0, indexInLevel = 0, totalAtLevel = 1, positions = new Map(), levelCounts = {}) {
    if (!node) return positions;

    // Track how many nodes at this level
    if (!levelCounts[depth]) levelCounts[depth] = 0;
    const myIndexAtLevel = levelCounts[depth];
    levelCounts[depth]++;

    // Calculate Y position (depth - going downward)
    const y = -depth * 3;

    // Calculate total width needed for this level
    // For depth 0 (root): center at 0
    // For depth 1: spread children around parent
    // For depth 2+: spread based on position
    let xPos;

    if (depth === 0) {
        xPos = 0; // Root at center
    } else if (depth === 1) {
        // First level: spread around center
        const spacing = 4;
        xPos = (indexInLevel - (totalAtLevel - 1) / 2) * spacing;
    } else {
        // Deeper levels: position based on parent with offset
        const spacing = 6 / Math.pow(1.5, depth - 1);
        xPos = parentX + (indexInLevel - (totalAtLevel - 1) / 2) * spacing;
    }

    // Calculate Z position - subtle wave based on X position
    const zPos = Math.sin(xPos * 0.3) * 1.2;

    // Store position with hash as key
    positions.set(node.name, {
        hash: node.name,
        position: [xPos, y, zPos],
        depth: depth,
        node: node,
        children: node.children || []
    });

    // Calculate positions for children
    if (node.children && node.children.length > 0) {
        node.children.forEach((child, childIndex) => {
            calculateTreePositions(
                child,
                depth + 1,
                xPos, // Parent's X position
                childIndex,
                node.children.length,
                positions,
                levelCounts
            );
        });
    }

    return positions;
}

// Main 3D Scene component
function Scene({ data, onNodeClick }) {
    const [selectedHash, setSelectedHash] = useState(null);

    const { nodePositions, connections } = useMemo(() => {
        if (!data) return { nodePositions: [], connections: [] };

        // Calculate positions - returns a Map
        const posMap = calculateTreePositions(data);

        // Convert Map to array for rendering
        const positions = Array.from(posMap.values());

        // Generate connections based on actual tree structure
        const conns = [];
        posMap.forEach((nodeData) => {
            // For each node, connect to its children
            if (nodeData.children && nodeData.children.length > 0) {
                nodeData.children.forEach((child) => {
                    const childData = posMap.get(child.name);
                    if (childData) {
                        conns.push({
                            start: nodeData.position,
                            end: childData.position,
                        });
                    }
                });
            }
        });

        return { nodePositions: positions, connections: conns };
    }, [data]);

    const handleNodeClick = (hash) => {
        setSelectedHash(hash);
        onNodeClick?.(hash);
    };

    return (
        <>
            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 10, 5]} intensity={0.6} color="#ffffff" />
            <pointLight position={[0, 5, 10]} intensity={1.2} color="#00d4ff" />
            <pointLight position={[-8, -5, -5]} intensity={0.8} color="#667eea" />
            <pointLight position={[8, -5, -5]} intensity={0.8} color="#764ba2" />
            <hemisphereLight
                skyColor="#00d4ff"
                groundColor="#0a0a1a"
                intensity={0.3}
            />

            {/* Background effects */}
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <Particles count={500} />

            {/* Tree connections */}
            {connections.map((conn, i) => (
                <Connection
                    key={i}
                    start={conn.start}
                    end={conn.end}
                    isHighlighted={false}
                />
            ))}

            {/* Tree nodes */}
            {nodePositions.map((nodeData, i) => (
                <TreeNode
                    key={i}
                    position={nodeData.position}
                    hash={nodeData.hash}
                    depth={nodeData.depth}
                    onClick={() => handleNodeClick(nodeData.hash)}
                    isHighlighted={selectedHash === nodeData.hash}
                />
            ))}

            {/* Camera controls */}
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

// Main component
export default function VisualizacijaStabla3D({ data }) {
    const [selectedNode, setSelectedNode] = useState(null);

    const handleNodeClick = (hash) => {
        setSelectedNode(hash);
        navigator.clipboard.writeText(hash);
    };

    if (!data) {
        return (
            <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666'
            }}>
                <p>Nema podataka za prikaz</p>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Canvas
                camera={{ position: [0, 1, 18], fov: 50 }}
                style={{ background: 'linear-gradient(to bottom, #000000, #0a0a1a)' }}
            >
                <Scene data={data} onNodeClick={handleNodeClick} />
            </Canvas>

            {/* Controls hint */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                background: 'rgba(0, 0, 0, 0.7)',
                padding: '1rem',
                borderRadius: '8px',
                color: '#00d4ff',
                fontSize: '0.85rem',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(0, 212, 255, 0.3)'
            }}>
                <div><strong>Controls:</strong></div>
                <div>🖱️ Click & Drag - Rotate</div>
                <div>🔍 Scroll - Zoom</div>
                <div>👆 Click Node - Copy Hash</div>
            </div>

            {/* Selected node notification */}
            {selectedNode && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(0, 212, 255, 0.15)',
                    border: '2px solid rgba(0, 212, 255, 0.4)',
                    padding: '1rem 1.5rem',
                    borderRadius: '12px',
                    color: '#00d4ff',
                    fontSize: '0.9rem',
                    maxWidth: '300px',
                    wordBreak: 'break-all',
                    backdropFilter: 'blur(10px)',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    ✓ Hash kopiran u clipboard
                    <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.8 }}>
                        {selectedNode.substring(0, 16)}...
                    </div>
                </div>
            )}
        </div>
    );
}
