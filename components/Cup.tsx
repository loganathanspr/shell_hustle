
import React, { useMemo, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HOVER_HEIGHT, REVEAL_HEIGHT } from '../types';

interface CupProps {
  position: [number, number, number]; // Used for initial placement and Y-axis reference
  isHovered: boolean;
  isLifted: boolean;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
  color?: string;
}

export const Cup = forwardRef<THREE.Group, CupProps>(({
  position,
  isHovered,
  isLifted,
  onClick,
  onPointerOver,
  onPointerOut,
  color = '#E34234' // Vermilion Red
}, ref) => {
  
  // We use a local ref for the inner mesh to handle vertical lift animation
  // The forwarded ref (outer group) is handled by the Scene for X/Z movement
  const meshRef = React.useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Lift logic (Y axis) - Controlled locally for smooth UI feedback
    let targetY = 0; // Relative to the group
    if (isLifted) {
      targetY = REVEAL_HEIGHT;
    } else if (isHovered) {
      targetY = HOVER_HEIGHT;
    }
    // Lerp Y
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, delta * 10);
  });

  // Material with retro plastic/matte look
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.4,
    metalness: 0.1,
  }), [color]);

  // Geometry: Cylinder with radiusTop small (truncated cone)
  const geometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.5, 0.8, 1.8, 32);
    // Shift geometry up so origin is at base
    geo.translate(0, 0.9, 0); 
    return geo;
  }, []);

  return (
    <group 
      ref={ref} 
      position={[position[0], position[1], position[2]]}
    >
        <mesh
            ref={meshRef}
            geometry={geometry}
            material={material}
            castShadow
            receiveShadow
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            onPointerOver={(e) => {
                e.stopPropagation();
                onPointerOver();
            }}
            onPointerOut={(e) => {
                e.stopPropagation();
                onPointerOut();
            }}
        >
             {/* Decorative stripes - NOW BEIGE */}
            <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
                 <cylinderGeometry args={[0.81, 0.81, 0.1, 32]} />
                 <meshStandardMaterial color="#F3E5AB" roughness={0.3} metalness={0.6} />
            </mesh>
            
            {/* Dynamic Shadow on table when lifted (attached to cup so it moves up) */}
             <mesh 
                rotation={[-Math.PI / 2, 0, 0]} 
                position={[0, -0.8, 0]} // Relative to the lifted cup center
                visible={isLifted || isHovered}
            >
                <ringGeometry args={[0, 0.7, 32]} />
                <meshBasicMaterial color="#000000" transparent opacity={0.3} />
            </mesh>
        </mesh>
    </group>
  );
});
