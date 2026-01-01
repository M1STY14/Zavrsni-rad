import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

// Demo tree data - 5 levels with 16 leaves
const DEMO_TREE = {
  name: "root_a7f3c892",
  children: [
    {
      name: "lvl1_5b8e1a2f",
      children: [
        {
          name: "lvl2_e3c1a9f0",
          children: [
            {
              name: "lvl3_1a2b3c4d",
              children: [
                { name: "leaf_01abc123" },
                { name: "leaf_02def456" }
              ]
            },
            {
              name: "lvl3_2e3f4a5b",
              children: [
                { name: "leaf_03ghi789" },
                { name: "leaf_04jkl012" }
              ]
            }
          ]
        },
        {
          name: "lvl2_7b125f3c",
          children: [
            {
              name: "lvl3_3c4d5e6f",
              children: [
                { name: "leaf_05mno345" },
                { name: "leaf_06pqr678" }
              ]
            },
            {
              name: "lvl3_4f5a6b7c",
              children: [
                { name: "leaf_07stu901" },
                { name: "leaf_08vwx234" }
              ]
            }
          ]
        }
      ]
    },
    {
      name: "lvl1_9c2d4f1a",
      children: [
        {
          name: "lvl2_a4d1bb99",
          children: [
            {
              name: "lvl3_5d6e7f8a",
              children: [
                { name: "leaf_09yza567" },
                { name: "leaf_10bcd890" }
              ]
            },
            {
              name: "lvl3_6e7f8a9b",
              children: [
                { name: "leaf_11efg123" },
                { name: "leaf_12hij456" }
              ]
            }
          ]
        },
        {
          name: "lvl2_0c5423d1",
          children: [
            {
              name: "lvl3_7f8a9b0c",
              children: [
                { name: "leaf_13klm789" },
                { name: "leaf_14nop012" }
              ]
            },
            {
              name: "lvl3_8a9b0c1d",
              children: [
                { name: "leaf_15qrs345" },
                { name: "leaf_16tuv678" }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// Simplified TreeNode component with build-up animation
function TreeNode({ position, depth, maxDepth }) {
  const meshRef = useRef();
  const glowRef = useRef();

  // Color based on depth in tree
  const baseColor = useMemo(() => {
    const colors = [
      '#00d4ff', // Root - cyan
      '#00b8e6', // Level 1
      '#667eea', // Level 2
      '#764ba2', // Level 3
      '#9b59b6', // Level 4 - purple
    ];
    return colors[Math.min(depth, colors.length - 1)];
  }, [depth]);

  // Animation timing: leaves appear first, then wait for connections, then next level
  // Each level: 800ms node appear + 1200ms connection draw = 2000ms per level
  const levelDelay = (maxDepth - depth) * 2000; // Leaves = 0ms, root = maxDepth * 2000ms

  const { scale } = useSpring({
    from: { scale: 0 },
    to: { scale: 1 },
    delay: levelDelay,
    config: { mass: 1, tension: 180, friction: 20 }
  });

  // Gentle floating animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime + position[0]) * 0.1;
    }
  });

  return (
    <animated.group position={position} scale={scale}>
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
      <mesh ref={glowRef} scale={1.5}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={0.2}
          side={THREE.BackSide}
        />
      </mesh>
    </animated.group>
  );
}

// Connection line between nodes with progressive drawing animation (loading bar style)
function Connection({ start, end, childDepth, maxDepth }) {
  const meshRef = useRef();
  const materialRef = useRef();

  const { fullGeometry, curvePoints } = useMemo(() => {
    // REVERSED: Start from child (end), draw toward parent (start)
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(...end),  // Child node (bottom)
      new THREE.Vector3(
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2 - 0.3,
        (start[2] + end[2]) / 2
      ),
      new THREE.Vector3(...start),  // Parent node (top)
    ]);
    const points = c.getPoints(50);
    const geom = new THREE.TubeGeometry(c, 50, 0.04, 8, false);
    geom.setDrawRange(0, 0); // Start with nothing drawn
    return { fullGeometry: geom, curvePoints: points };
  }, [start, end]);

  // Connection grows after child nodes appear (800ms) + small delay
  const connectionStartDelay = (maxDepth - childDepth) * 2000 + 800;

  const { progress } = useSpring({
    from: { progress: 0 },
    to: { progress: 1 },
    delay: connectionStartDelay,
    config: { mass: 1, tension: 100, friction: 30 }
  });

  // Update draw range based on progress
  useFrame(() => {
    if (meshRef.current && meshRef.current.geometry) {
      const currentProgress = progress.get();
      const totalCount = meshRef.current.geometry.index.count;
      const drawCount = Math.floor(currentProgress * totalCount);
      meshRef.current.geometry.setDrawRange(0, drawCount);
    }
  });

  return (
    <mesh ref={meshRef} geometry={fullGeometry}>
      <meshBasicMaterial
        ref={materialRef}
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

  const y = -depth * 3 + 4; // Moved up by 4 units

  let xPos;
  if (depth === 0) {
    xPos = 0;
  } else if (depth === 1) {
    const spacing = 6;
    xPos = (indexInLevel - (totalAtLevel - 1) / 2) * spacing;
  } else {
    // Increased spacing formula - doesn't shrink as much for deeper levels
    const spacing = 8 / Math.pow(1.3, depth - 1);
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

  const { nodePositions, connections, maxDepth } = useMemo(() => {
    const posMap = calculateTreePositions(DEMO_TREE);
    const positions = Array.from(posMap.values());

    // Find max depth for animation timing
    const maxD = Math.max(...positions.map(p => p.depth));

    const conns = [];
    const connSet = new Set(); // Track unique connections to prevent duplicates

    posMap.forEach((nodeData) => {
      if (nodeData.children && nodeData.children.length > 0) {
        nodeData.children.forEach((child) => {
          const childData = posMap.get(child.name);
          if (childData) {
            // Create unique key for this connection
            const connKey = `${nodeData.hash}-${childData.hash}`;
            if (!connSet.has(connKey)) {
              connSet.add(connKey);
              conns.push({
                start: nodeData.position,
                end: childData.position,
                childDepth: childData.depth,
                key: connKey, // Add unique key for React rendering
              });
            }
          }
        });
      }
    });

    console.log('Total connections created:', conns.length);
    return { nodePositions: positions, connections: conns, maxDepth: maxD };
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
        {connections.map((conn) => (
          <Connection
            key={conn.key}
            start={conn.start}
            end={conn.end}
            childDepth={conn.childDepth}
            maxDepth={maxDepth}
          />
        ))}

        {/* Tree nodes */}
        {nodePositions.map((nodeData) => (
          <TreeNode
            key={nodeData.hash}
            position={nodeData.position}
            depth={nodeData.depth}
            maxDepth={maxDepth}
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
        camera={{ position: [0, 0, 22], fov: 60 }}
        style={{ background: 'linear-gradient(to bottom, #000000, #0a0a1a)' }}
      >
        <Scene isMobile={isMobile} />
      </Canvas>
    </div>
  );
}
