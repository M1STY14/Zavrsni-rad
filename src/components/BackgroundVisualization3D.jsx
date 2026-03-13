import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { getTreeDepth } from '../utils/merkle';

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
    const mid = connectionMidpoint(end, start);
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(...end),
      new THREE.Vector3(...mid),
      new THREE.Vector3(...start),
    ]);
    const points = c.getPoints(50);
    const radius = taperRadius(childDepth, maxDepth);
    const geom = new THREE.TubeGeometry(c, 50, radius, 8, false);
    geom.setDrawRange(0, 0);
    return { fullGeometry: geom, curvePoints: points };
  }, [start, end, childDepth, maxDepth]);

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

// Calculate 3D positions using fractal tree layout
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
    children: node.children || []
  });

  if (node.children && node.children.length > 0) {
    const childBranchLength = branchLength * SHRINK_FACTOR;
    const jitter = (hashSeed(node.name) - 0.5) * 0.1;

    node.children.forEach((child, i) => {
      const sign = i === 0 ? -1 : 1;
      const baseSpread = SPREAD_ANGLE + 0.2 / (1 + depth);
      const childAngle = parentAngle + sign * (baseSpread + jitter);
      calculateTreePositions(child, depth + 1, x, y, childAngle, childBranchLength, positions, yOffset);
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
    const treeDepth = getTreeDepth(DEMO_TREE);
    const geoSum = treeDepth > 0 ? (1 - Math.pow(SHRINK_FACTOR, treeDepth)) / (1 - SHRINK_FACTOR) : 1;
    const branchLen = TARGET_HEIGHT / (geoSum * Math.cos(SPREAD_ANGLE));
    const posMap = calculateTreePositions(DEMO_TREE, 0, 0, 0, 0, branchLen, new Map(), 4);
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
