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
            // Gentle floating animation
            meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.1;
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
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshStandardMaterial
                    color={baseColor}
                    emissive={baseColor}
                    emissiveIntensity={hovered ? 0.8 : 0.3}
                    metalness={0.8}
                    roughness={0.2}
                />
            </animated.mesh>

            {/* Glow effect */}
            <mesh scale={hovered ? 1.8 : 1.3}>
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshBasicMaterial
                    color={baseColor}
                    transparent
                    opacity={hovered ? 0.3 : 0.15}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* Hash label */}
            {hovered && (
                <Text
                    position={[0, 1.2, 0]}
                    fontSize={0.2}
                    color="#ffffff"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.02}
                    outlineColor="#000000"
                >
                    {hash.substring(0, 8)}...
                </Text>
            )}
        </group>
    );
}

// Connection line between nodes
function Connection({ start, end, isHighlighted }) {
    const points = useMemo(() => {
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(...start),
            new THREE.Vector3(
                (start[0] + end[0]) / 2,
                (start[1] + end[1]) / 2 - 0.5,
                (start[2] + end[2]) / 2
            ),
            new THREE.Vector3(...end),
        ]);
        return curve.getPoints(50);
    }, [start, end]);

    const lineGeometry = useMemo(() => {
        return new THREE.BufferGeometry().setFromPoints(points);
    }, [points]);

    return (
        <line geometry={lineGeometry}>
            <lineBasicMaterial
                color={isHighlighted ? '#00ffff' : '#00d4ff'}
                transparent
                opacity={isHighlighted ? 0.8 : 0.3}
                linewidth={2}
            />
        </line>
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

// Calculate 3D positions for tree nodes
function calculateTreePositions(node, depth = 0, x = 0, z = 0, spreadX = 8, spreadZ = 3) {
    if (!node) return [];

    const y = -depth * 3; // Vertical spacing between levels
    const positions = [];

    // Current node position
    positions.push({
        hash: node.name,
        position: [x, y, z],
        depth: depth,
        node: node
    });

    // Calculate positions for children
    if (node.children && node.children.length > 0) {
        const childSpreadX = spreadX / 2;
        const childSpreadZ = spreadZ / 1.5;

        node.children.forEach((child, index) => {
            const offsetX = (index - (node.children.length - 1) / 2) * childSpreadX;
            const offsetZ = depth % 2 === 0 ? childSpreadZ : -childSpreadZ;

            const childPositions = calculateTreePositions(
                child,
                depth + 1,
                x + offsetX,
                z + offsetZ,
                childSpreadX,
                childSpreadZ
            );
            positions.push(...childPositions);
        });
    }

    return positions;
}

// Get all connections between nodes
function getConnections(node, parentPos = null, depth = 0) {
    if (!node) return [];

    const connections = [];
    const currentY = -depth * 3;

    if (node.children && node.children.length > 0) {
        node.children.forEach((child, index) => {
            // We'll need to match positions calculated earlier
            // This is a simplified version - we'll enhance this
            connections.push({
                start: parentPos || [0, currentY, 0],
                end: [0, currentY - 3, 0], // Placeholder
                depth: depth
            });

            connections.push(...getConnections(child, null, depth + 1));
        });
    }

    return connections;
}

// Main 3D Scene component
function Scene({ data, onNodeClick }) {
    const [selectedHash, setSelectedHash] = useState(null);

    const nodePositions = useMemo(() => {
        if (!data) return [];
        return calculateTreePositions(data);
    }, [data]);

    const connections = useMemo(() => {
        if (nodePositions.length === 0) return [];

        const conns = [];
        nodePositions.forEach((nodeData) => {
            if (nodeData.node.children) {
                nodeData.node.children.forEach((child) => {
                    const childPos = nodePositions.find(p => p.hash === child.name);
                    if (childPos) {
                        conns.push({
                            start: nodeData.position,
                            end: childPos.position,
                        });
                    }
                });
            }
        });
        return conns;
    }, [nodePositions]);

    const handleNodeClick = (hash) => {
        setSelectedHash(hash);
        onNodeClick?.(hash);
    };

    return (
        <>
            {/* Lighting */}
            <ambientLight intensity={0.3} />
            <pointLight position={[10, 10, 10]} intensity={0.8} color="#00d4ff" />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#667eea" />
            <spotLight
                position={[0, 20, 0]}
                angle={0.3}
                penumbra={1}
                intensity={0.5}
                color="#ffffff"
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
                minDistance={5}
                maxDistance={50}
                autoRotate
                autoRotateSpeed={0.5}
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
                camera={{ position: [0, 0, 20], fov: 60 }}
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
