import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';

// Demo tree data - simple 4-leaf Merkle tree
const DEMO_TREE = {
  name: "a7f3c892d4e1b5f6",
  children: [
    {
      name: "5b8e1a2fc3d4e5f6",
      children: [
        { name: "e3c1a9f0" },
        { name: "7b125f3c" }
      ]
    },
    {
      name: "9c2d4f1ab5e6c7d8",
      children: [
        { name: "a4d1bb99" },
        { name: "0c5423d1" }
      ]
    }
  ]
};

// Simplified TreeNode component for background (no interaction)
function TreeNode({ position, depth }) {
  const meshRef = useRef();

  // Color based on depth in tree
  const baseColor = useMemo(() => {
    const colors = [
      '#00d4ff', // Root - cyan
      '#00b8e6', // Level 1
      '#667eea', // Level 2
      '#764ba2', // Level 3 - purple
    ];
    return colors[Math.min(depth, colors.length - 1)];
  }, [depth]);

  // Gentle floating animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime + position[0]) * 0.1;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={0.4}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Glow effect */}
      <mesh scale={1.5}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={0.2}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

// Connection line between nodes
function Connection({ start, end }) {
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
        color="#00d4ff"
        transparent
        opacity={0.5}
      />
    </mesh>
  );
}

// Particle system for background effect
function Particles({ count = 200 }) {
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
function calculateTreePositions(node, depth = 0, parentX = 0, indexInLevel = 0, totalAtLevel = 1, positions = new Map(), levelCounts = {}) {
  if (!node) return positions;

  if (!levelCounts[depth]) levelCounts[depth] = 0;
  const myIndexAtLevel = levelCounts[depth];
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
    depth: depth,
    node: node,
    children: node.children || []
  });

  if (node.children && node.children.length > 0) {
    node.children.forEach((child, childIndex) => {
      calculateTreePositions(
        child,
        depth + 1,
        xPos,
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
function Scene({ isMobile }) {
  const groupRef = useRef();
  const particleCount = isMobile ? 100 : 200;
  const starCount = isMobile ? 1000 : 2000;

  const { nodePositions, connections } = useMemo(() => {
    const posMap = calculateTreePositions(DEMO_TREE);
    const positions = Array.from(posMap.values());

    const conns = [];
    posMap.forEach((nodeData) => {
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
  }, []);

  // Gentle auto-rotation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <>
      {/* Simplified lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 5, 10]} intensity={1.2} color="#00d4ff" />
      <pointLight position={[-8, -5, -5]} intensity={0.8} color="#667eea" />

      {/* Background effects */}
      <Stars radius={100} depth={50} count={starCount} factor={4} saturation={0} fade speed={1} />
      <Particles count={particleCount} />

      {/* Tree group with rotation */}
      <group ref={groupRef}>
        {/* Tree connections */}
        {connections.map((conn, i) => (
          <Connection
            key={i}
            start={conn.start}
            end={conn.end}
          />
        ))}

        {/* Tree nodes */}
        {nodePositions.map((nodeData, i) => (
          <TreeNode
            key={i}
            position={nodeData.position}
            depth={nodeData.depth}
          />
        ))}
      </group>
    </>
  );
}

// Main component
export default function BackgroundVisualization3D({ isMobile = false }) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 2, 18], fov: 60 }}
        style={{ background: 'linear-gradient(to bottom, #000000, #0a0a1a)' }}
      >
        <Scene isMobile={isMobile} />
      </Canvas>
    </div>
  );
}
