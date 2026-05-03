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

// Reveal animation timing (ms per depth level)
const REVEAL_MS_PER_LEVEL = 650;

// TODO(perf): viewport-virtualized rendering. Today the scene mounts a
// react-three-fiber component per node + connection, which scales linearly
// with tree size and starts to lag once a user expands enough subtrees in a
// real Bitcoin block (3k+ tx → tens of thousands of meshes). Path forward:
// switch to a single InstancedMesh for nodes and a merged BufferGeometry for
// connections, keyed by world-space position; cull anything outside the
// camera frustum / beyond a depth-of-detail threshold. This is the natural
// follow-up to the click-to-expand collapsing landed alongside this comment.

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
const CAMERA_EXPLORING_BASE = { position: [0, 2, 26], target: [0, -4, 0], fov: 50 };

// Compute exploring camera that pulls back for larger trees
function getExploringCamera(maxDepth) {
  const extra = Math.max(0, maxDepth - 4);
  return {
    position: [0, 2 + extra * 2, 26 + extra * 8],
    target: [0, -4 - extra * 2, 0],
    fov: 50 + Math.min(extra * 4, 20),
  };
}

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
const TRANSITION_DURATION_S = 0.9;

function CameraController({ phase, onTransitionComplete, controlsRef, resetTrigger, exploringCamera }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(...CAMERA_LANDING.position));
  const targetLookAt = useRef(new THREE.Vector3(...CAMERA_LANDING.target));
  const startPos = useRef(new THREE.Vector3());
  const startLookAt = useRef(new THREE.Vector3());
  const startFov = useRef(CAMERA_LANDING.fov);
  const targetFov = useRef(CAMERA_LANDING.fov);
  const isTransitioning = useRef(false);
  const transitionProgress = useRef(0);

  const camConfig = phase === 'exploring' ? exploringCamera : CAMERA_LANDING;
  // Track the latest camConfig in a ref so the phase/reset effects don't
  // re-fire (and yank the camera back to default framing) every time
  // exploringCamera identity changes — e.g. when a click-to-expand grows
  // maxDepth. The user's current navigation should be preserved; Reset View
  // is the explicit way to refit the camera.
  const camConfigRef = useRef(camConfig);
  camConfigRef.current = camConfig;

  const beginTransition = () => {
    const cfg = camConfigRef.current;
    startPos.current.copy(camera.position);
    if (controlsRef.current) {
      startLookAt.current.copy(controlsRef.current.target);
    } else {
      startLookAt.current.copy(targetLookAt.current);
    }
    startFov.current = camera.fov;
    targetPos.current.set(...cfg.position);
    targetLookAt.current.set(...cfg.target);
    targetFov.current = cfg.fov;
    isTransitioning.current = true;
    transitionProgress.current = 0;
    if (controlsRef.current) controlsRef.current.enabled = false;
  };

  useEffect(() => {
    beginTransition();
  }, [phase, controlsRef]);

  // Reset camera when resetTrigger changes
  useEffect(() => {
    if (resetTrigger === 0) return;
    beginTransition();
  }, [resetTrigger]);

  useFrame((state, delta) => {
    if (!isTransitioning.current) return;

    transitionProgress.current += delta / TRANSITION_DURATION_S;
    const t = Math.min(transitionProgress.current, 1);
    // Smooth ease in/out (cubic)
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camera.position.lerpVectors(startPos.current, targetPos.current, ease);
    if (controlsRef.current) {
      controlsRef.current.target.lerpVectors(startLookAt.current, targetLookAt.current, ease);
    }
    camera.fov = startFov.current + (targetFov.current - startFov.current) * ease;
    camera.updateProjectionMatrix();

    if (t >= 1) {
      isTransitioning.current = false;
      camera.position.copy(targetPos.current);
      camera.fov = targetFov.current;
      camera.updateProjectionMatrix();
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLookAt.current);
        controlsRef.current.enabled = phase === 'exploring';
      }
      onTransitionComplete?.();
    }
  });

  return null;
}

// Tree node for landing mode (no interaction, build-up animation)
function LandingTreeNode({ position, depth, maxDepth, msPerLevel = 2000 }) {
  const meshRef = useRef();

  const baseColor = useMemo(() => {
    const colors = ['#00d4ff', '#00b8e6', '#667eea', '#764ba2', '#9b59b6'];
    return colors[Math.min(depth, colors.length - 1)];
  }, [depth]);

  const levelDelay = (maxDepth - depth) * msPerLevel;

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
function ExploringTreeNode({ position, hash, depth, onClick, proofHighlight, collapsed, leafCount, isExpanding }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  const isSelected = proofHighlight?.selectedLeaf === hash;
  const isOnPath = proofHighlight?.pathHashes?.has(hash);
  const isSibling = proofHighlight?.siblingHashes?.has(hash);

  const baseColor = useMemo(() => {
    if (collapsed) return '#f7931a'; // Bitcoin orange — signals "click to expand"
    if (isSelected) return '#ff6f00';
    if (isOnPath) return '#ffa726';
    if (isSibling) return '#66bb6a';
    const colors = ['#00d4ff', '#00b8e6', '#667eea', '#764ba2', '#9b59b6'];
    return colors[Math.min(depth, colors.length - 1)];
  }, [depth, isSelected, isOnPath, isSibling, collapsed]);

  const emissiveIntensity = useMemo(() => {
    if (collapsed) return hovered ? 1.4 : 0.9;
    if (isSelected) return 1.2;
    if (isOnPath) return 0.8;
    if (isSibling) return 0.6;
    return hovered ? 1.0 : 0.4;
  }, [isSelected, isOnPath, isSibling, hovered, collapsed]);

  const { scale } = useSpring({
    scale: hovered ? 1.5 : (isSelected ? 1.4 : (isOnPath || isSibling) ? 1.2 : collapsed ? 1.15 : 1),
    config: { mass: 1, tension: 280, friction: 60 },
  });

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    if (isExpanding) {
      // Faster pulse while a subtree fetch is in flight
      meshRef.current.position.y = Math.sin(t * 6) * 0.05;
    } else if (!hovered) {
      meshRef.current.position.y = Math.sin(t + position[0]) * 0.1;
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

      <mesh scale={hovered ? 2.0 : (isOnPath || isSelected) ? 1.8 : collapsed ? 1.7 : 1.5}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={hovered ? 0.4 : (isOnPath || isSelected) ? 0.35 : collapsed ? 0.32 : 0.2}
          side={THREE.BackSide}
        />
      </mesh>

      {collapsed && (
        <Text
          position={[0, 0.9, 0]}
          fontSize={0.32}
          color="#f7931a"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.04}
          outlineColor="#000000"
        >
          {isExpanding ? 'expanding...' : `+${leafCount} txs`}
        </Text>
      )}

      {hovered && !collapsed && (
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

      {hovered && collapsed && !isExpanding && (
        <Text
          position={[0, -0.8, 0]}
          fontSize={0.2}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#000000"
        >
          click to expand
        </Text>
      )}
    </group>
  );
}

// Landing-mode connection with progressive draw animation
function LandingConnection({ start, end, childDepth, maxDepth, msPerLevel = 2000 }) {
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

  const connectionStartDelay = (maxDepth - childDepth) * msPerLevel + msPerLevel * 0.4;

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
function Scene({ phase, treeData, proofHighlight, onNodeClick, onExpandCollapsed, expandingHashes, isMobile, onTransitionComplete, neighborBlocks, blockHeight, resetTrigger }) {
  const groupRef = useRef();
  const controlsRef = useRef();
  const particleCount = isMobile ? 100 : 300;
  const starCount = isMobile ? 1000 : 3000;

  // Reveal animation state — plays a fast leaf-to-root cascade when new data arrives
  const [isRevealing, setIsRevealing] = useState(false);
  const revealTimerRef = useRef(null);
  const lastRootRef = useRef(null);
  const [neighborsVisible, setNeighborsVisible] = useState(false);

  useEffect(() => {
    if (phase === 'exploring' && treeData) {
      // Only run the reveal cascade when the *root* changes — subtree expansion
      // keeps the same root and shouldn't re-animate the whole tree.
      if (lastRootRef.current === treeData.name) return;
      lastRootRef.current = treeData.name;
      setIsRevealing(true);
      setNeighborsVisible(false);
      clearTimeout(revealTimerRef.current);
      const depth = getTreeDepth(treeData);
      const totalRevealMs = depth * REVEAL_MS_PER_LEVEL + 1500;
      revealTimerRef.current = setTimeout(() => setIsRevealing(false), totalRevealMs);
    } else if (!treeData) {
      lastRootRef.current = null;
    }
    return () => clearTimeout(revealTimerRef.current);
  }, [treeData, phase]);

  // Show neighbors after reveal completes
  useEffect(() => {
    if (phase === 'exploring' && treeData && !isRevealing) {
      const timer = setTimeout(() => setNeighborsVisible(true), 300);
      return () => clearTimeout(timer);
    }
    setNeighborsVisible(false);
  }, [isRevealing, treeData, phase]);

  // Disable orbit controls during reveal
  useEffect(() => {
    if (controlsRef.current && phase === 'exploring') {
      controlsRef.current.enabled = !isRevealing;
    }
  }, [isRevealing, phase]);

  // Determine which data to render
  const displayData = treeData || DEMO_TREE;
  const isInteractive = phase === 'exploring' && !isRevealing;
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

  // Dynamic exploring camera — pulls back for larger trees
  const exploringCamera = useMemo(() => getExploringCamera(maxDepth), [maxDepth]);

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
        exploringCamera={exploringCamera}
      />

      {/* Keyboard pan (arrow keys) — disabled during reveal */}
      <KeyboardPan controlsRef={controlsRef} enabled={phase === 'exploring' && !isRevealing} />

      {/* Orbit controls - only enabled in exploring mode after transition */}
      <OrbitControls
        ref={controlsRef}
        enabled={false}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        minDistance={12}
        maxDistance={50 + Math.max(0, maxDepth - 4) * 8}
        maxPolarAngle={Math.PI / 1.5}
        minPolarAngle={Math.PI / 6}
        target={phase === 'exploring' ? exploringCamera.target : CAMERA_LANDING.target}
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
              msPerLevel={phase === 'exploring' ? REVEAL_MS_PER_LEVEL : 2000}
            />
          )
        ))}

        {/* Nodes */}
        {nodePositions.map((nodeData) => {
          const isCollapsed = nodeData.node?.collapsed === true;
          const leafCount = nodeData.node?.leafCount;
          const isExpanding = expandingHashes?.has(nodeData.hash);
          return isInteractive ? (
            <ExploringTreeNode
              key={nodeData.hash}
              position={nodeData.position}
              hash={nodeData.hash}
              depth={nodeData.depth}
              onClick={() => {
                if (isCollapsed) {
                  if (!isExpanding) onExpandCollapsed?.(nodeData.hash);
                } else {
                  onNodeClick?.(nodeData.hash);
                }
              }}
              proofHighlight={proofHighlight}
              collapsed={isCollapsed}
              leafCount={leafCount}
              isExpanding={isExpanding}
            />
          ) : (
            <LandingTreeNode
              key={nodeData.hash}
              position={nodeData.position}
              depth={nodeData.depth}
              maxDepth={maxDepth}
              msPerLevel={phase === 'exploring' ? REVEAL_MS_PER_LEVEL : 2000}
            />
          );
        })}

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
      {phase === 'exploring' && treeData && neighborsVisible && neighborBlocks && neighborBlocks.length > 0 && neighborBlocks.map((neighbor) => {
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
      {phase === 'exploring' && treeData && neighborsVisible && blockHeight && neighborBlocks && neighborBlocks.length > 0 && (
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
  onExpandCollapsed,
  expandingHashes,
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
          onExpandCollapsed={onExpandCollapsed}
          expandingHashes={expandingHashes}
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
