
import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameState } from '../types';

interface BallProps {
  position: [number, number, number];
  visible?: boolean;
  gameState?: GameState;
  cupObstacles?: (THREE.Group | null)[];
}

export const Ball: React.FC<BallProps> = ({ position, visible = true, gameState, cupObstacles }) => {
  const ref = useRef<THREE.Mesh>(null);
  const prevGameState = useRef<GameState | undefined>(gameState);
  
  // Physics State
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const hasInitializedPhysics = useRef(false);

  // Constants for Collision
  const BALL_RADIUS = 0.25;
  const CUP_RADIUS = 0.6; // Approx radius at base
  const COLLISION_THRESHOLD = BALL_RADIUS + CUP_RADIUS;
  const BOUNDS_X = 3.5; // Screen width limits
  const BOUNDS_Z = 1.5; // Table depth limits

  useFrame((state, delta) => {
    if (!ref.current) return;

    // IDLE ANIMATION: Realistic Physics Rolling
    if (gameState === GameState.IDLE) {
        
        // Init Physics Momentum on first frame of IDLE
        if (!hasInitializedPhysics.current) {
            // Give it a random push
            const angle = Math.random() * Math.PI * 2;
            const speed = 3.5;
            velocity.current.set(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);
            
            // Set start height to floor level (ball radius)
            ref.current.position.y = BALL_RADIUS;
            hasInitializedPhysics.current = true;
        }

        const pos = ref.current.position;
        const vel = velocity.current;

        // 1. Apply Velocity
        pos.x += vel.x * delta;
        pos.z += vel.z * delta;
        
        // 2. Boundary Collisions (Walls)
        if (pos.x > BOUNDS_X) {
            pos.x = BOUNDS_X;
            vel.x *= -1;
        } else if (pos.x < -BOUNDS_X) {
            pos.x = -BOUNDS_X;
            vel.x *= -1;
        }

        if (pos.z > BOUNDS_Z) {
            pos.z = BOUNDS_Z;
            vel.z *= -1;
        } else if (pos.z < -BOUNDS_Z) {
            pos.z = -BOUNDS_Z;
            vel.z *= -1;
        }

        // 3. Obstacle Collision (Cups)
        if (cupObstacles) {
            cupObstacles.forEach((cupGroup) => {
                if (!cupGroup) return;
                const cupPos = cupGroup.position;
                
                // Calculate flat 2D distance (ignoring Y since everything is on floor)
                const dx = pos.x - cupPos.x;
                const dz = pos.z - cupPos.z;
                const distSq = dx*dx + dz*dz;
                
                if (distSq < COLLISION_THRESHOLD * COLLISION_THRESHOLD) {
                    // COLLISION DETECTED!
                    const dist = Math.sqrt(distSq);
                    
                    // Normal vector from Cup to Ball
                    const nx = dx / dist;
                    const nz = dz / dist;

                    // Push ball out of collision to prevent sticking
                    const overlap = COLLISION_THRESHOLD - dist;
                    pos.x += nx * overlap;
                    pos.z += nz * overlap;

                    // Reflect Velocity: V_new = V_old - 2(V dot N)N
                    const dotProduct = vel.x * nx + vel.z * nz;
                    vel.x = vel.x - 2 * dotProduct * nx;
                    vel.z = vel.z - 2 * dotProduct * nz;
                    
                    // Add slight randomness to bounce to prevent loops
                    vel.x += (Math.random() - 0.5) * 0.5;
                    vel.z += (Math.random() - 0.5) * 0.5;
                    
                    // Normalize speed to prevent energy loss/gain
                    const speed = Math.sqrt(vel.x*vel.x + vel.z*vel.z);
                    const targetSpeed = 3.5;
                    if (speed < 0.1) {
                        // If stopped, kick it
                        vel.set(Math.random()-0.5, 0, Math.random()-0.5).normalize().multiplyScalar(targetSpeed);
                    } else {
                        // Maintain constant energy
                        vel.multiplyScalar(targetSpeed / speed);
                    }
                }
            });
        }

        // 4. Rotate ball based on movement (Rolling effect)
        // Rotation axis is perpendicular to velocity
        ref.current.rotation.z -= vel.x * delta * 2; // Roll along X
        ref.current.rotation.x += vel.z * delta * 2; // Roll along Z


    } else {
        // RESET LOGIC: If we just switched from IDLE, snap to start position
        if (prevGameState.current === GameState.IDLE) {
            hasInitializedPhysics.current = false; // Reset physics flag
            ref.current.position.set(position[0], BALL_RADIUS, position[2]);
            ref.current.rotation.set(0, 0, 0);
        }

        // STANDARD LOGIC: Lerp to target position (When parented to cup)
        ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, position[0], delta * 15);
        ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, position[2], delta * 15);
        ref.current.position.y = BALL_RADIUS; // Stay on floor
        
        // Reset rotation when stationary/hidden
        ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, 0, delta * 5);
        ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, 0, delta * 5);
    }

    prevGameState.current = gameState;
  });

  return (
    <mesh 
      ref={ref}
      position={[position[0], 0.25, position[2]]} 
      castShadow 
      visible={visible}
    >
      <sphereGeometry args={[0.25, 32, 32]} />
      <meshStandardMaterial 
        color="#0047AB" 
        roughness={0.2} 
        metalness={0.6} 
        emissive="#0047AB"
        emissiveIntensity={0.2}
      />
    </mesh>
  );
};
