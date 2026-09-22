import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SwordProps {
  pullProgress: number; // 0 = fully in stone, 1 = fully pulled
  shaking: boolean;
}

export function Sword({ pullProgress, shaking }: SwordProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta;
    
    // Pull animation - sword moves up (blade comes out of stone)
    const pullY = pullProgress * 2.8;
    groupRef.current.position.y = -0.8 + pullY;
    
    // Base rotation is Math.PI on X (blade points down into stone)
    const baseRotX = Math.PI;
    
    // Shake when pulling
    if (shaking && pullProgress < 0.95) {
      const intensity = 0.04 * (1 - pullProgress * 0.5);
      groupRef.current.rotation.z = Math.sin(timeRef.current * 35) * intensity;
      groupRef.current.rotation.x = baseRotX + Math.cos(timeRef.current * 28) * intensity * 0.5;
    } else if (pullProgress < 0.01) {
      // Subtle idle breathing animation
      groupRef.current.rotation.z = Math.sin(timeRef.current * 0.8) * 0.005;
      groupRef.current.rotation.x = baseRotX;
      groupRef.current.position.y = -0.8 + Math.sin(timeRef.current * 1.2) * 0.01;
    } else {
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.08);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, baseRotX, 0.08);
    }

    // Glow intensity based on pull progress
    if (glowRef.current) {
      const baseGlow = 0.3 + Math.sin(timeRef.current * 2) * 0.1;
      glowRef.current.intensity = baseGlow + pullProgress * 2.5;
      glowRef.current.position.y = groupRef.current.position.y + 1.5;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.8, 0]} rotation={[Math.PI, 0, 0]}>
      {/* Glow light */}
      <pointLight ref={glowRef} position={[0, 1.5, 0]} intensity={0.5} color="#ffd700" distance={4} />
      
      {/* Blade - main */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <boxGeometry args={[0.055, 2.6, 0.018]} />
        <meshStandardMaterial 
          color="#e8e8e8" 
          metalness={0.95} 
          roughness={0.05} 
          envMapIntensity={2}
        />
      </mesh>
      {/* Blade edge highlight */}
      <mesh position={[0, 1.8, 0.012]}>
        <boxGeometry args={[0.02, 2.5, 0.002]} />
        <meshStandardMaterial 
          color="#ffffff" 
          metalness={1} 
          roughness={0}
          emissive="#ffffff"
          emissiveIntensity={0.1}
        />
      </mesh>
      {/* Blade tip */}
      <mesh position={[0, 3.2, 0]} rotation={[0, 0, Math.PI / 4]}>
        <coneGeometry args={[0.035, 0.35, 4]} />
        <meshStandardMaterial color="#f0f0f0" metalness={0.95} roughness={0.05} />
      </mesh>
      
      {/* Guard - cross piece */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.55, 0.07, 0.07]} />
        <meshStandardMaterial color="#daa520" metalness={0.85} roughness={0.15} />
      </mesh>
      {/* Guard center gem */}
      <mesh position={[0, 0.4, 0.04]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial 
          color="#ff2222" 
          metalness={0.3} 
          roughness={0.1}
          emissive="#ff0000"
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* Guard ornaments */}
      <mesh position={[0.25, 0.4, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#daa520" metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[-0.25, 0.4, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#daa520" metalness={0.85} roughness={0.15} />
      </mesh>
      
      {/* Grip */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.038, 0.6, 8]} />
        <meshStandardMaterial color="#3d1f00" roughness={0.9} />
      </mesh>
      {/* Grip wrapping */}
      {[0, 1, 2, 3, 4].map(i => (
        <mesh key={i} position={[0, -0.12 + i * 0.1, 0]}>
          <torusGeometry args={[0.04, 0.008, 6, 12]} />
          <meshStandardMaterial color="#5c3a1e" roughness={0.7} />
        </mesh>
      ))}
      
      {/* Pommel */}
      <mesh position={[0, -0.25, 0]} castShadow>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#daa520" metalness={0.85} roughness={0.15} />
      </mesh>
      {/* Pommel gem */}
      <mesh position={[0, -0.25, 0.05]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial 
          color="#4444ff" 
          metalness={0.3} 
          roughness={0.1}
          emissive="#2222ff"
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  );
}

export function Stone() {
  const stoneGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.75, 0.95, 1.3, 10, 4);
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const noise = (Math.random() - 0.5) * 0.08;
      if (y > -0.5 && y < 0.5) {
        positions.setX(i, x + noise);
        positions.setZ(i, z + noise);
      }
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const baseGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(1.1, 1.35, 0.5, 12, 2);
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const noise = (Math.random() - 0.5) * 0.06;
      positions.setX(i, x + noise);
      positions.setZ(i, z + noise);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group position={[0, -1.3, 0]}>
      {/* Main stone */}
      <mesh geometry={stoneGeometry} castShadow receiveShadow>
        <meshStandardMaterial color="#5a5a5a" roughness={0.92} metalness={0.08} />
      </mesh>
      {/* Stone base */}
      <mesh geometry={baseGeometry} position={[0, -0.6, 0]} receiveShadow>
        <meshStandardMaterial color="#484848" roughness={0.95} metalness={0.05} />
      </mesh>
      {/* Moss patches */}
      {[
        [0.4, 0.2, 0.5],
        [-0.3, 0.1, 0.6],
        [0.5, -0.1, -0.4],
        [-0.5, 0.3, -0.3],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} scale={0.15 + Math.random() * 0.1}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshStandardMaterial color="#2d5a2d" roughness={1} />
        </mesh>
      ))}
      {/* Sword slot (dark crack) */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.08, 0.7, 0.04]} />
        <meshStandardMaterial color="#0a0a0a" roughness={1} />
      </mesh>
    </group>
  );
}

export function Ground() {
  return (
    <group>
      {/* Main ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.2, 0]} receiveShadow>
        <circleGeometry args={[30, 32]} />
        <meshStandardMaterial color="#1a3a1a" roughness={0.95} />
      </mesh>
      {/* Clearing around stone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.19, 0]} receiveShadow>
        <circleGeometry args={[3, 24]} />
        <meshStandardMaterial color="#2a4a2a" roughness={0.9} />
      </mesh>
    </group>
  );
}

export function Particles() {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 150;
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = Math.random() * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    if (!particlesRef.current) return;
    const pos = particlesRef.current.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      let y = pos.getY(i);
      y -= delta * 0.2;
      if (y < -0.5) y = 8;
      pos.setY(i, y);
      // Gentle horizontal drift
      const x = pos.getX(i) + Math.sin(y * 0.5 + i) * delta * 0.05;
      pos.setX(i, x);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial 
        size={0.04} 
        color="#ffd700" 
        transparent 
        opacity={0.5}
        sizeAttenuation
      />
    </points>
  );
}

export function Trees() {
  const trees = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const radius = 7 + Math.random() * 6;
      arr.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        scale: 0.7 + Math.random() * 0.8,
        rotation: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, []);

  return (
    <>
      {trees.map((tree, i) => (
        <group key={i} position={[tree.x, -2.2, tree.z]} scale={tree.scale} rotation={[0, tree.rotation, 0]}>
          {/* Trunk */}
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.18, 3, 6]} />
            <meshStandardMaterial color="#2d1f14" roughness={0.95} />
          </mesh>
          {/* Lower foliage */}
          <mesh position={[0, 3.2, 0]} castShadow>
            <coneGeometry args={[1.3, 2.8, 7]} />
            <meshStandardMaterial color="#1a4d1a" roughness={0.85} />
          </mesh>
          {/* Upper foliage */}
          <mesh position={[0, 4.5, 0]} castShadow>
            <coneGeometry args={[0.9, 2.2, 7]} />
            <meshStandardMaterial color="#1f5c1f" roughness={0.85} />
          </mesh>
          {/* Top */}
          <mesh position={[0, 5.5, 0]} castShadow>
            <coneGeometry args={[0.5, 1.5, 6]} />
            <meshStandardMaterial color="#245a24" roughness={0.85} />
          </mesh>
        </group>
      ))}
    </>
  );
}

export function Rocks() {
  const rocks = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 2.5 + Math.random() * 2;
      arr.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        scale: 0.15 + Math.random() * 0.25,
        rotation: Math.random() * Math.PI,
      });
    }
    return arr;
  }, []);

  return (
    <>
      {rocks.map((rock, i) => (
        <mesh 
          key={i} 
          position={[rock.x, -2.1, rock.z]} 
          rotation={[Math.random() * 0.3, rock.rotation, Math.random() * 0.3]}
          scale={rock.scale}
          castShadow
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.95} />
        </mesh>
      ))}
    </>
  );
}

export function Grass() {
  const grassRef = useRef<THREE.InstancedMesh>(null);
  const count = 300;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const grassData = useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.5 + Math.random() * 5;
      data.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        scale: 0.3 + Math.random() * 0.4,
        rotation: Math.random() * Math.PI,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return data;
  }, []);

  useFrame((state) => {
    if (!grassRef.current) return;
    const time = state.clock.elapsedTime;
    
    grassData.forEach((grass, i) => {
      dummy.position.set(grass.x, -2.1, grass.z);
      dummy.rotation.set(0, grass.rotation, Math.sin(time * 1.5 + grass.phase) * 0.1);
      dummy.scale.set(grass.scale * 0.3, grass.scale, grass.scale * 0.3);
      dummy.updateMatrix();
      grassRef.current!.setMatrixAt(i, dummy.matrix);
    });
    grassRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={grassRef} args={[undefined, undefined, count]}>
      <coneGeometry args={[0.1, 0.5, 4]} />
      <meshStandardMaterial color="#2d6b2d" roughness={0.9} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}
