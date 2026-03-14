import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Stars } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { getTreeDepth, getTreeStats } from '../utils/merkle';

// Demo tree data - 5 levels with 16 leaves (exported for proof calculation)
export const DEMO_TREE = {
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

function computeLayoutParams(tree) {
  const { maxDepth, maxBranching } = getTreeStats(tree);
  const widthFactor = Math.max(1, Math.log2(maxBranching + 1));
  const adjustedHeight = TARGET_HEIGHT * (1 + (widthFactor - 1) * 0.5);
  const adjustedShrink = Math.min(0.85, SHRINK_FACTOR + (widthFactor - 1) * 0.04);
  const adjustedSpread = SPREAD_ANGLE + (widthFactor - 1) * 0.06;
  const maxFanAngle = Math.PI * Math.min(0.95, 0.7 + (widthFactor - 1) * 0.08);
  const geoSum = maxDepth > 0
    ? (1 - Math.pow(adjustedShrink, maxDepth)) / (1 - adjustedShrink) : 1;
  const branchLen = adjustedHeight / (geoSum * Math.cos(adjustedSpread));
  return { branchLen, shrinkFactor: adjustedShrink, spreadAngle: adjustedSpread, maxFanAngle };
}

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

// Camera positions for each phase
const CAMERA_LANDING = { position: [0, 0, 28], target: [0, -2, 0], fov: 60 };
const CAMERA_EXPLORING = { position: [0, 2, 26], target: [0, -4, 0], fov: 50 };

// Keyboard pan — arrow keys move camera + orbit target together
function KeyboardPan({ controlsRef, enabled }) {
  const { camera } = useThree();
  const keysPressed = useRef(new Set());

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        keysPressed.current.add(e.key);
      }
    };
    const onKeyUp = (e) => keysPressed.current.delete(e.key);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      keysPressed.current.clear();
    };
  }, [enabled]);

  useFrame((_, delta) => {
    if (!enabled || !controlsRef.current || keysPressed.current.size === 0) return;
    const speed = 15 * delta;
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    right.setFromMatrixColumn(camera.matrix, 0);
    up.setFromMatrixColumn(camera.matrix, 1);
    const offset = new THREE.Vector3();
    if (keysPressed.current.has('ArrowLeft')) offset.addScaledVector(right, -speed);
    if (keysPressed.current.has('ArrowRight')) offset.addScaledVector(right, speed);
    if (keysPressed.current.has('ArrowUp')) offset.addScaledVector(up, speed);
    if (keysPressed.current.has('ArrowDown')) offset.addScaledVector(up, -speed);
    camera.position.add(offset);
    controlsRef.current.target.add(offset);
  });

  return null;
}

// Camera controller that smoothly transitions between phases
function CameraController({ phase, onTransitionComplete, controlsRef, resetTrigger }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(...CAMERA_LANDING.position));
  const targetLookAt = useRef(new THREE.Vector3(...CAMERA_LANDING.target));
  const isTransitioning = useRef(false);
  const transitionProgress = useRef(0);

  useEffect(() => {
    const target = phase === 'exploring' ? CAMERA_EXPLORING : CAMERA_LANDING;
    targetPos.current.set(...target.position);
    targetLookAt.current.set(...target.target);
    isTransitioning.current = true;
    transitionProgress.current = 0;

    // Disable orbit controls during transition
    if (controlsRef.current) {
      controlsRef.current.enabled = false;
    }
  }, [phase, controlsRef]);

  // Reset camera when resetTrigger changes
  useEffect(() => {
    if (resetTrigger === 0) return;
    const target = phase === 'exploring' ? CAMERA_EXPLORING : CAMERA_LANDING;
    targetPos.current.set(...target.position);
    targetLookAt.current.set(...target.target);
    isTransitioning.current = true;
    transitionProgress.current = 0;
    if (controlsRef.current) controlsRef.current.enabled = false;
  }, [resetTrigger]);

  useFrame((state, delta) => {
    if (!isTransitioning.current) return;

    transitionProgress.current += delta * 0.8; // ~1.2s total
    const t = Math.min(transitionProgress.current, 1);
    // Smooth easing
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camera.position.lerp(targetPos.current, ease * 0.08 + 0.02);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, ease * 0.08 + 0.02);
    }

    // Update FOV
    const targetFov = phase === 'exploring' ? CAMERA_EXPLORING.fov : CAMERA_LANDING.fov;
    camera.fov += (targetFov - camera.fov) * (ease * 0.08 + 0.02);
    camera.updateProjectionMatrix();

    // Check if close enough to target
    if (camera.position.distanceTo(targetPos.current) < 0.05 && t >= 0.95) {
      isTransitioning.current = false;
      camera.position.copy(targetPos.current);
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLookAt.current);
        // Only enable controls in exploring mode
        controlsRef.current.enabled = phase === 'exploring';
      }
      onTransitionComplete?.();
    }
  });

  return null;
}

// Tree node for landing mode (no interaction, build-up animation)
function LandingTreeNode({ position, depth, maxDepth }) {
  const meshRef = useRef();

  const baseColor = useMemo(() => {
    const colors = ['#00d4ff', '#00b8e6', '#667eea', '#764ba2', '#9b59b6'];
    return colors[Math.min(depth, colors.length - 1)];
  }, [depth]);

  const levelDelay = (maxDepth - depth) * 2000;

  const { scale } = useSpring({
    from: { scale: 0 },
    to: { scale: 1 },
    delay: levelDelay,
    config: { mass: 1, tension: 180, friction: 20 }
  });

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
      <mesh scale={1.5}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial color={baseColor} transparent opacity={0.2} side={THREE.BackSide} />
      </mesh>
    </animated.group>
  );
}

// Tree node for exploring mode (interactive, proof highlighting)
function ExploringTreeNode({ position, hash, depth, onClick, proofHighlight }) {
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

      <mesh scale={hovered ? 2.0 : (isOnPath || isSelected) ? 1.8 : 1.5}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={hovered ? 0.4 : (isOnPath || isSelected) ? 0.35 : 0.2}
          side={THREE.BackSide}
        />
      </mesh>

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

// Landing-mode connection with progressive draw animation
function LandingConnection({ start, end, childDepth, maxDepth }) {
  const meshRef = useRef();

  const fullGeometry = useMemo(() => {
    const mid = connectionMidpoint(end, start);
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(...end),
      new THREE.Vector3(...mid),
      new THREE.Vector3(...start),
    ]);
    const radius = taperRadius(childDepth, maxDepth);
    const geom = new THREE.TubeGeometry(c, 50, radius, 8, false);
    geom.setDrawRange(0, 0);
    return geom;
  }, [start, end, childDepth, maxDepth]);

  const connectionStartDelay = (maxDepth - childDepth) * 2000 + 800;

  const { progress } = useSpring({
    from: { progress: 0 },
    to: { progress: 1 },
    delay: connectionStartDelay,
    config: { mass: 1, tension: 100, friction: 30 }
  });

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
      <meshBasicMaterial color="#00d4ff" transparent opacity={0.5} />
    </mesh>
  );
}

// Exploring-mode connection (instant, with proof path highlighting)
function ExploringConnection({ start, end, isOnProofPath, childDepth = 0, maxDepth = 1 }) {
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

// Particle system
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
      <pointsMaterial size={0.05} color="#00d4ff" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

// Calculate 3D positions using fractal tree layout
function calculateTreePositions(node, depth, parentX, parentY, parentAngle, branchLength, positions, yOffset, shrinkFactor = SHRINK_FACTOR, spreadAngle = SPREAD_ANGLE, maxFanAngle = Math.PI * 0.7) {
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
    const childBranchLength = branchLength * shrinkFactor;
    const jitter = (hashSeed(node.name) - 0.5) * 0.1;

    node.children.forEach((child, i) => {
      const n = node.children.length;
      let childAngle;
      if (n === 1) {
        childAngle = parentAngle;
      } else if (n === 2) {
        const sign = i === 0 ? -1 : 1;
        const baseSpread = spreadAngle + 0.2 / (1 + depth);
        childAngle = parentAngle + sign * (baseSpread + jitter);
      } else {
        const baseSpread = spreadAngle + 0.2 / (1 + depth);
        const fanWidth = Math.min(baseSpread * 2 * (1 + Math.log2(n)), maxFanAngle);
        const t = i / (n - 1);
        childAngle = parentAngle - fanWidth / 2 + t * fanWidth + jitter;
      }
      calculateTreePositions(child, depth + 1, x, y, childAngle, childBranchLength, positions, yOffset, shrinkFactor, spreadAngle, maxFanAngle);
    });
  }

  return positions;
}

// Single floating node inside a neighbor tree — scales in, then floats
function NeighborNode({ position, color, offset, delay = 0 }) {
  const meshRef = useRef();
  const matRef = useRef();
  const appeared = useRef(false);

  const { scale } = useSpring({
    from: { scale: 0 },
    to: { scale: 1 },
    delay,
    config: { mass: 1, tension: 180, friction: 20 },
    onRest: () => { appeared.current = true; },
  });

  useFrame((state) => {
    if (!appeared.current) return;
    const t = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(t * 0.8 + offset) * 0.15;
      meshRef.current.position.x = position[0] + Math.cos(t * 0.5 + offset * 1.3) * 0.05;
    }
    if (matRef.current) {
      matRef.current.emissiveIntensity = 0.2 + Math.sin(t * 1.2 + offset) * 0.15;
      matRef.current.opacity = 0.25 + Math.sin(t * 0.9 + offset * 0.7) * 0.08;
    }
  });

  return (
    <animated.mesh ref={meshRef} position={position} scale={scale}>
      <sphereGeometry args={[0.4, 16, 16]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        emissive={color}
        emissiveIntensity={0.25}
        metalness={0.9}
        roughness={0.1}
        transparent
        opacity={0.3}
      />
    </animated.mesh>
  );
}

// Connection inside a neighbor tree — draws progressively after a delay
function NeighborConnection({ start, end, delay = 0, childDepth = 0, maxDepth = 1 }) {
  const meshRef = useRef();

  const geometry = useMemo(() => {
    const mid = connectionMidpoint(start, end);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(...start),
      new THREE.Vector3(...mid),
      new THREE.Vector3(...end),
    ]);
    const radius = taperRadius(childDepth, maxDepth);
    const geom = new THREE.TubeGeometry(curve, 20, radius, 8, false);
    geom.setDrawRange(0, 0);
    return geom;
  }, [start, end]);

  const { progress } = useSpring({
    from: { progress: 0 },
    to: { progress: 1 },
    delay,
    config: { mass: 1, tension: 100, friction: 30 },
  });

  useFrame(() => {
    if (meshRef.current && meshRef.current.geometry) {
      const currentProgress = progress.get();
      const totalCount = meshRef.current.geometry.index.count;
      meshRef.current.geometry.setDrawRange(0, Math.floor(currentProgress * totalCount));
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial color="#5a8fa0" transparent opacity={0.25} />
    </mesh>
  );
}

// Neighbor tree - simplified non-interactive tree rendered as a faded backdrop
function NeighborTree({ treeData, position = [-22, 0, 3], scale = 0.45, startDelay = 0 }) {
  const groupRef = useRef();

  const { nodePositions, connections, maxDepth: neighborMaxDepth } = useMemo(() => {
    const { branchLen, shrinkFactor, spreadAngle, maxFanAngle } = computeLayoutParams(treeData);
    const posMap = calculateTreePositions(treeData, 0, 0, 0, 0, branchLen, new Map(), 0, shrinkFactor, spreadAngle, maxFanAngle);
    const positions = Array.from(posMap.values());

    const conns = [];
    const connSet = new Set();
    posMap.forEach((nodeData) => {
      if (nodeData.children && nodeData.children.length > 0) {
        nodeData.children.forEach((child) => {
          const childData = posMap.get(child.name);
          if (childData) {
            const connKey = `nb-${nodeData.hash}-${childData.hash}`;
            if (!connSet.has(connKey)) {
              connSet.add(connKey);
              conns.push({
                start: nodeData.position,
                end: childData.position,
                key: connKey,
                parentDepth: nodeData.depth,
                childDepth: childData.depth,
              });
            }
          }
        });
      }
    });

    const maxD = Math.max(...positions.map(p => p.depth));
    return { nodePositions: positions, connections: conns, maxDepth: maxD };
  }, [treeData]);

  const desaturatedColors = ['#5a8fa0', '#5a8fb0', '#7a7ea0', '#7a5a80', '#7a5a90'];

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {connections.map((conn) => {
        // Connection draws after its parent node has appeared, with a small extra offset
        const connDelay = startDelay + conn.parentDepth * 800 + 400;
        return (
          <NeighborConnection
            key={conn.key}
            start={conn.start}
            end={conn.end}
            delay={connDelay}
            childDepth={conn.childDepth}
            maxDepth={neighborMaxDepth}
          />
        );
      })}
      {nodePositions.map((nodeData) => {
        const color = desaturatedColors[Math.min(nodeData.depth, desaturatedColors.length - 1)];
        // Root-to-leaf cascade: root appears first, deeper nodes later
        const nodeDelay = startDelay + nodeData.depth * 800;
        return (
          <NeighborNode
            key={`nb-${nodeData.hash}`}
            position={nodeData.position}
            color={color}
            offset={nodeData.position[0] * 2 + nodeData.depth}
            delay={nodeDelay}
          />
        );
      })}
    </group>
  );
}

// Glowing arc connecting neighbor tree root to main tree root
function ChainLink({ startPos, endPos, delay = 0 }) {
  const meshRef = useRef();
  const drawn = useRef(false);

  const geometry = useMemo(() => {
    const midX = (startPos[0] + endPos[0]) / 2;
    const midY = (startPos[1] + endPos[1]) / 2 + 3;
    const midZ = (startPos[2] + endPos[2]) / 2 - 2;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(...startPos),
      new THREE.Vector3(midX, midY, midZ),
      new THREE.Vector3(...endPos),
    ]);
    const geom = new THREE.TubeGeometry(curve, 40, 0.06, 8, false);
    geom.setDrawRange(0, 0);
    return geom;
  }, [startPos, endPos]);

  const { progress } = useSpring({
    from: { progress: 0 },
    to: { progress: 1 },
    delay,
    config: { mass: 1, tension: 80, friction: 30 },
    onRest: () => { drawn.current = true; },
  });

  useFrame((state) => {
    if (!meshRef.current) return;
    // Progressive draw
    const currentProgress = progress.get();
    const totalCount = meshRef.current.geometry.index.count;
    meshRef.current.geometry.setDrawRange(0, Math.floor(currentProgress * totalCount));
    // Pulsing glow after fully drawn
    if (drawn.current) {
      const pulse = 0.25 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      meshRef.current.material.opacity = pulse;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial color="#f7931a" transparent opacity={0.35} />
    </mesh>
  );
}

// Floating block height label above a tree
function BlockLabel({ position, height }) {
  return (
    <Text
      position={position}
      fontSize={0.8}
      color="#ffffff"
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.04}
      outlineColor="#000000"
      transparent
      opacity={0.6}
    >
      {typeof height === 'number' ? `Block #${height}` : height}
    </Text>
  );
}

// Main scene component
function Scene({ phase, treeData, proofHighlight, onNodeClick, isMobile, onTransitionComplete, neighborBlocks, blockHeight, resetTrigger }) {
  const groupRef = useRef();
  const controlsRef = useRef();
  const particleCount = isMobile ? 100 : 300;
  const starCount = isMobile ? 1000 : 3000;

  // Determine which data to render
  const displayData = treeData || DEMO_TREE;
  const isInteractive = phase === 'exploring';
  const yOffset = phase === 'landing' ? 4 : 0;

  // Reset group rotation when entering exploring mode
  useEffect(() => {
    if (phase === 'exploring' && groupRef.current) {
      groupRef.current.rotation.y = 0;
    }
  }, [phase]);

  const { nodePositions, connections, maxDepth } = useMemo(() => {
    const { branchLen, shrinkFactor, spreadAngle, maxFanAngle } = computeLayoutParams(displayData);
    const posMap = calculateTreePositions(displayData, 0, 0, 0, 0, branchLen, new Map(), yOffset, shrinkFactor, spreadAngle, maxFanAngle);
    const positions = Array.from(posMap.values());
    const maxD = Math.max(...positions.map(p => p.depth));

    const conns = [];
    const connSet = new Set();

    posMap.forEach((nodeData) => {
      if (nodeData.children && nodeData.children.length > 0) {
        nodeData.children.forEach((child) => {
          const childData = posMap.get(child.name);
          if (childData) {
            const connKey = `${nodeData.hash}-${childData.hash}`;
            if (!connSet.has(connKey)) {
              connSet.add(connKey);
              const bothOnPath = isInteractive && proofHighlight?.pathHashes?.has(nodeData.hash)
                && proofHighlight?.pathHashes?.has(childData.hash);
              conns.push({
                start: nodeData.position,
                end: childData.position,
                childDepth: childData.depth,
                isOnProofPath: bothOnPath || false,
                key: connKey,
              });
            }
          }
        });
      }
    });

    return { nodePositions: positions, connections: conns, maxDepth: maxD };
  }, [displayData, proofHighlight, isInteractive, yOffset]);

  // Auto-rotation (only in landing mode)
  useFrame((state) => {
    if (groupRef.current && phase === 'landing') {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.6} color="#ffffff" />
      <pointLight position={[0, 5, 10]} intensity={1.2} color="#00d4ff" />
      <pointLight position={[-8, -5, -5]} intensity={0.8} color="#667eea" />
      <pointLight position={[8, -5, -5]} intensity={0.8} color="#764ba2" />
      <hemisphereLight skyColor="#00d4ff" groundColor="#0a0a1a" intensity={0.3} />

      {/* Background */}
      <Stars radius={100} depth={50} count={starCount} factor={4} saturation={0} fade speed={1} />
      <Particles count={particleCount} />

      {/* Camera controller */}
      <CameraController
        phase={phase}
        onTransitionComplete={onTransitionComplete}
        controlsRef={controlsRef}
        resetTrigger={resetTrigger}
      />

      {/* Keyboard pan (arrow keys) */}
      <KeyboardPan controlsRef={controlsRef} enabled={phase === 'exploring'} />

      {/* Orbit controls - only enabled in exploring mode after transition */}
      <OrbitControls
        ref={controlsRef}
        enabled={false}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        minDistance={12}
        maxDistance={50}
        maxPolarAngle={Math.PI / 1.5}
        minPolarAngle={Math.PI / 6}
        target={phase === 'exploring' ? CAMERA_EXPLORING.target : CAMERA_LANDING.target}
        autoRotate={phase === 'exploring'}
        autoRotateSpeed={0.4}
      />

      {/* Tree group */}
      <group ref={groupRef}>
        {/* Connections */}
        {connections.map((conn) => (
          isInteractive ? (
            <ExploringConnection
              key={conn.key}
              start={conn.start}
              end={conn.end}
              isOnProofPath={conn.isOnProofPath}
              childDepth={conn.childDepth}
              maxDepth={maxDepth}
            />
          ) : (
            <LandingConnection
              key={conn.key}
              start={conn.start}
              end={conn.end}
              childDepth={conn.childDepth}
              maxDepth={maxDepth}
            />
          )
        ))}

        {/* Nodes */}
        {nodePositions.map((nodeData) => (
          isInteractive ? (
            <ExploringTreeNode
              key={nodeData.hash}
              position={nodeData.position}
              hash={nodeData.hash}
              depth={nodeData.depth}
              onClick={() => onNodeClick?.(nodeData.hash)}
              proofHighlight={proofHighlight}
            />
          ) : (
            <LandingTreeNode
              key={nodeData.hash}
              position={nodeData.position}
              depth={nodeData.depth}
              maxDepth={maxDepth}
            />
          )
        ))}

        {/* Demo neighbor trees — visible on landing and exploring until real data is loaded */}
        {(phase === 'landing' || (phase === 'exploring' && !treeData)) && (() => {
          // Chain link draws after the main root appears, then neighbor tree cascades root→leaf
          const chainDelay = maxDepth * 2000 + 1000;
          const treeDelay = chainDelay + 1200;
          return (
            <>
              <ChainLink startPos={[-22, yOffset, 3]} endPos={[0, yOffset, 0]} delay={chainDelay} />
              <NeighborTree treeData={DEMO_TREE} position={[-22, yOffset, 3]} scale={0.4} startDelay={treeDelay} />
              <ChainLink startPos={[22, yOffset, 3]} endPos={[0, yOffset, 0]} delay={chainDelay} />
              <NeighborTree treeData={DEMO_TREE} position={[22, yOffset, 3]} scale={0.4} startDelay={treeDelay} />
            </>
          );
        })()}
      </group>

      {/* Neighbor trees and chain links (outside rotating group — static backdrop) */}
      {phase === 'exploring' && treeData && neighborBlocks && neighborBlocks.length > 0 && neighborBlocks.map((neighbor) => {
        const pos = neighbor.side === 'left' ? [-22, 0, 3] : [22, 0, 3];
        return (
          <React.Fragment key={`neighbor-${neighbor.height}`}>
            <NeighborTree
              treeData={neighbor.tree}
              position={pos}
              scale={0.45}
            />
            <ChainLink
              startPos={pos}
              endPos={[0, 0, 0]}
            />
            <BlockLabel
              position={[pos[0], pos[1] + 3, pos[2]]}
              height={neighbor.height}
            />
          </React.Fragment>
        );
      })}
      {phase === 'exploring' && treeData && blockHeight && neighborBlocks && neighborBlocks.length > 0 && (
        <BlockLabel position={[0, 3, 0]} height={blockHeight} />
      )}
    </>
  );
}

// Main exported component - single persistent Canvas
export default function MerkleScene3D({
  phase = 'landing',
  treeData = null,
  proofHighlight = null,
  onNodeClick,
  isMobile = false,
  onTransitionComplete,
  neighborBlocks = [],
  blockHeight = null,
}) {
  const [notification, setNotification] = useState(null);
  const [resetTrigger, setResetTrigger] = useState(0);

  const handleNodeClick = useCallback((hash) => {
    navigator.clipboard.writeText(hash).catch(() => {});
    setNotification(hash);
    setTimeout(() => setNotification(null), 2000);
    onNodeClick?.(hash);
  }, [onNodeClick]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 28], fov: 60 }}
        style={{ background: 'linear-gradient(to bottom, #000000, #0a0a1a)' }}
      >
        <Scene
          phase={phase}
          treeData={treeData}
          proofHighlight={proofHighlight}
          onNodeClick={handleNodeClick}
          isMobile={isMobile}
          onTransitionComplete={onTransitionComplete}
          neighborBlocks={neighborBlocks}
          blockHeight={blockHeight}
          resetTrigger={resetTrigger}
        />
      </Canvas>

      {/* Reset view button */}
      {phase === 'exploring' && (
        <button
          className="reset-view-btn"
          onClick={() => setResetTrigger(t => t + 1)}
          title="Reset camera view"
        >
          Reset View
        </button>
      )}

      {/* Hash copy notification */}
      {notification && (
        <div style={{
          position: 'absolute', top: '20px', right: '20px',
          background: 'rgba(0, 212, 255, 0.15)', border: '2px solid rgba(0, 212, 255, 0.4)',
          padding: '1rem 1.5rem', borderRadius: '12px', color: '#00d4ff',
          fontSize: '0.9rem', maxWidth: '300px', wordBreak: 'break-all',
          backdropFilter: 'blur(10px)', animation: 'fadeIn 0.3s ease',
          zIndex: 10,
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
