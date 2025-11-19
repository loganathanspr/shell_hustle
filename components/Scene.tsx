
import React, { useState, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Cup } from './Cup';
import { Ball } from './Ball';
import { GameState, POSITIONS, Difficulty, REVEAL_HEIGHT } from '../types';
import { audio } from '../utils/audio';

interface SceneProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  difficulty: Difficulty;
  onWin: () => void;
  onLose: () => void;
  setInstruction: (text: string) => void;
  setCommentary: (text: string) => void;
}

const DIFFICULTY_SETTINGS = {
  EASY: { maxSpeed: 2.5, minSwaps: 5, maxSwaps: 8, scamChance: 0.0 },
  MEDIUM: { maxSpeed: 4.0, minSwaps: 10, maxSwaps: 15, scamChance: 0.05 },
  HARD: { maxSpeed: 6.0, minSwaps: 18, maxSwaps: 25, scamChance: 0.15 }
};

export const Scene: React.FC<SceneProps> = ({ 
  gameState, 
  setGameState, 
  difficulty, 
  onWin, 
  onLose, 
  setInstruction,
  setCommentary
}) => {
  // --- State ---
  // 0, 1, 2 represent the visual cups. value is their current slot index (0=left, 1=center, 2=right)
  const [cupPositions, setCupPositions] = useState<number[]>([0, 1, 2]); 
  const [ballAtIndex, setBallAtIndex] = useState<number>(1); // Which slot (0,1,2) has the ball
  const [liftedCups, setLiftedCups] = useState<boolean[]>([false, false, false]);
  const [hoveredCup, setHoveredCup] = useState<number | null>(null);
  
  // Direct refs to the 3D objects for performant animation
  const cupRefs = useRef<(THREE.Group | null)[]>([]);
  
  // Animation State
  const shuffleQueue = useRef<Array<{a: number, b: number}>>([]); // Queue of swaps
  const isAnimating = useRef(false);
  const swapProgress = useRef(0);
  const currentSwap = useRef<{a: number, b: number, startPosA: number, startPosB: number} | null>(null);
  const shuffleSpeed = useRef(0);

  // Render Refs for interpolation - keeping these for Ball Logic tracking
  const visualPositions = useRef<THREE.Vector3[]>([
    new THREE.Vector3(POSITIONS[0], 0, 0),
    new THREE.Vector3(POSITIONS[1], 0, 0),
    new THREE.Vector3(POSITIONS[2], 0, 0),
  ]);

  // --- Game Loop Logic ---

  // Initialize Round
  useEffect(() => {
    if (gameState === GameState.REVEAL) {
      // Reset
      setLiftedCups([false, false, false]);
      setInstruction("Watch closely...");
      
      // Start commentary
      const introPhrase = audio.getRandomPhrase('intro');
      setCommentary(introPhrase);
      audio.speak(introPhrase, 'intro');
      
      // Ensure ball is at center initially for the "Reveal" phase
      const startSlot = 1;
      setBallAtIndex(startSlot);
      
      // Identify which cup is at the start slot
      const cupIdAtSlot = cupPositions.findIndex(pos => pos === startSlot);
      
      // Lift that cup
      const newLifted = [false, false, false];
      newLifted[cupIdAtSlot] = true;
      setLiftedCups(newLifted);
      audio.playLift();

      // After delay, drop cup and start shuffle
      setTimeout(() => {
        setLiftedCups([false, false, false]); // Close
        setTimeout(() => {
          setGameState(GameState.SHUFFLING);
        }, 500);
      }, 2000);
    }
  }, [gameState, setGameState, setInstruction, setCommentary]);

  // Generate Shuffle Sequence based on Difficulty
  useEffect(() => {
    if (gameState === GameState.SHUFFLING) {
      setInstruction("Shuffling...");
      setCommentary("...");
      
      // Start the shuffle sound effect loop
      audio.startShuffle();
      
      const settings = DIFFICULTY_SETTINGS[difficulty];
      
      // Generate random swaps based on difficulty settings
      const swapsCount = Math.floor(Math.random() * (settings.maxSwaps - settings.minSwaps + 1)) + settings.minSwaps;
      const newQueue = [];
      
      let lastA = -1;
      let lastB = -1;

      for (let i = 0; i < swapsCount; i++) {
        // Pick two random slots 0,1,2
        let a = Math.floor(Math.random() * 3);
        let b = Math.floor(Math.random() * 3);
        while (a === b || (a === lastA && b === lastB)) { // Avoid immediate undo or same cup
            a = Math.floor(Math.random() * 3);
            b = Math.floor(Math.random() * 3);
        }
        lastA = a;
        lastB = b;
        newQueue.push({ a, b });
      }
      shuffleQueue.current = newQueue;
      isAnimating.current = true;
    }
  }, [gameState, setInstruction, difficulty, setCommentary]);

  // Frame Loop: Handle Shuffling Animation
  useFrame((state, delta) => {
    
    // Force Update refs for Ball Tracking
    cupRefs.current.forEach((ref, i) => {
      if (ref) {
        visualPositions.current[i].copy(ref.position);
      }
    });

    if (gameState === GameState.SHUFFLING) {
        // SHUFFLING ANIMATION LOGIC
        // ... (Existing shuffling logic)
        
        if (!currentSwap.current && shuffleQueue.current.length > 0) {
          const next = shuffleQueue.current.shift()!;
          const cupA_ID = cupPositions.findIndex(p => p === next.a);
          const cupB_ID = cupPositions.findIndex(p => p === next.b);
    
          currentSwap.current = {
            a: cupA_ID,
            b: cupB_ID,
            startPosA: next.a,
            startPosB: next.b
          };
          swapProgress.current = 0;
        }
    
        const settings = DIFFICULTY_SETTINGS[difficulty];
    
        if (currentSwap.current) {
          const remaining = shuffleQueue.current.length;
          let targetSpeed = settings.maxSpeed; 
          const rampThreshold = 3;
          if (remaining > (settings.minSwaps - rampThreshold)) targetSpeed = settings.maxSpeed * 0.5; 
          if (remaining < rampThreshold) targetSpeed = settings.maxSpeed * 0.5; 
    
          shuffleSpeed.current = THREE.MathUtils.lerp(shuffleSpeed.current, targetSpeed, delta * 2);
          
          swapProgress.current += delta * shuffleSpeed.current;
    
          const audioPulse = Math.sin(Math.min(swapProgress.current, 1) * Math.PI);
          audio.updateShuffle(shuffleSpeed.current, audioPulse);
    
          if (swapProgress.current >= 1) {
            const { a, b, startPosA, startPosB } = currentSwap.current;
            const newPositions = [...cupPositions];
            newPositions[a] = startPosB; 
            newPositions[b] = startPosA; 
            setCupPositions(newPositions);
            
            if (ballAtIndex === startPosA) setBallAtIndex(startPosB);
            else if (ballAtIndex === startPosB) setBallAtIndex(startPosA);
    
            if (cupRefs.current[a]) cupRefs.current[a]!.position.set(POSITIONS[startPosB], 0, 0);
            if (cupRefs.current[b]) cupRefs.current[b]!.position.set(POSITIONS[startPosA], 0, 0);
    
            currentSwap.current = null;
          } else {
            const { a, b, startPosA, startPosB } = currentSwap.current;
            const posA_WorldX = POSITIONS[startPosA];
            const posB_WorldX = POSITIONS[startPosB];
    
            const midX = (posA_WorldX + posB_WorldX) / 2;
            const distance = Math.abs(posA_WorldX - posB_WorldX);
            const radius = distance / 2;
            const visualRadius = radius * 1.3; 
            const angle = swapProgress.current * Math.PI;
            const theta = angle; 
            
            if (cupRefs.current[a]) {
                 if (startPosA < startPosB) {
                    const currentAngle = Math.PI - theta;
                    cupRefs.current[a]!.position.x = midX + radius * Math.cos(currentAngle); 
                    cupRefs.current[a]!.position.z = visualRadius * Math.sin(currentAngle); 
                } else {
                    const currentAngle = theta;
                    cupRefs.current[a]!.position.x = midX + radius * Math.cos(currentAngle);
                    cupRefs.current[a]!.position.z = -visualRadius * Math.sin(currentAngle); 
                }
            }
            
            if (cupRefs.current[b]) {
                if (startPosB < startPosA) {
                     const currentAngle = Math.PI - theta;
                     cupRefs.current[b]!.position.x = midX + radius * Math.cos(currentAngle);
                     cupRefs.current[b]!.position.z = visualRadius * Math.sin(currentAngle);
                } else {
                     const currentAngle = theta;
                     cupRefs.current[b]!.position.x = midX + radius * Math.cos(currentAngle);
                     cupRefs.current[b]!.position.z = -visualRadius * Math.sin(currentAngle); 
                }
            }
          }
        } else if (shuffleQueue.current.length === 0 && isAnimating.current) {
          isAnimating.current = false;
          audio.stopShuffle();
          setGameState(GameState.PICKING);
          setInstruction("Where is the ball?");
        } else {
            audio.updateShuffle(0, 0);
        }

    } else if (gameState === GameState.IDLE) {
       // IDLE ANIMATION: Cups gently bob up and down
       const t = state.clock.getElapsedTime();
       cupPositions.forEach((slotIndex, cupId) => {
           if (cupRefs.current[cupId]) {
               // Ensure strict home positions
               cupRefs.current[cupId]!.position.x = THREE.MathUtils.lerp(cupRefs.current[cupId]!.position.x, POSITIONS[slotIndex], delta * 5);
               cupRefs.current[cupId]!.position.z = THREE.MathUtils.lerp(cupRefs.current[cupId]!.position.z, 0, delta * 5);
               
               // Sine wave bobbing (Group Y)
               const bobHeight = Math.sin(t * 2 + cupId) * 0.15 + 0.2; // Phase offset by cupId, base height 0.2
               cupRefs.current[cupId]!.position.y = THREE.MathUtils.lerp(cupRefs.current[cupId]!.position.y, bobHeight, delta * 2);
           }
       });

    } else {
       // OTHER STATES (Reveal, Picking, Result): Ensure cups are grounded (Y=0)
       cupPositions.forEach((slotIndex, cupId) => {
           if (cupRefs.current[cupId]) {
               cupRefs.current[cupId]!.position.x = THREE.MathUtils.lerp(cupRefs.current[cupId]!.position.x, POSITIONS[slotIndex], delta * 10);
               cupRefs.current[cupId]!.position.z = THREE.MathUtils.lerp(cupRefs.current[cupId]!.position.z, 0, delta * 10);
               // Reset Group Y to 0 (internal Cup handles lifting)
               cupRefs.current[cupId]!.position.y = THREE.MathUtils.lerp(cupRefs.current[cupId]!.position.y, 0, delta * 10);
           }
       });
    }
  });

  // --- Interaction ---

  const handleCupClick = (cupId: number) => {
    if (gameState !== GameState.PICKING) return;
    
    const chosenSlot = cupPositions[cupId];
    const isWinner = chosenSlot === ballAtIndex;

    // SCAM LOGIC check based on Difficulty
    let finalIsWinner = isWinner;
    let actualBallSlot = ballAtIndex;

    const settings = DIFFICULTY_SETTINGS[difficulty];
    if (settings.scamChance > 0) {
      // Check if we should scam this turn
      const isScamming = Math.random() < settings.scamChance;
      
      if (isScamming && isWinner) {
        // User clicked correct cup, but we cheat!
        finalIsWinner = false;
        // Move ball to a neighbor slot immediately
        const neighborSlots = [0, 1, 2].filter(s => s !== chosenSlot);
        actualBallSlot = neighborSlots[Math.floor(Math.random() * neighborSlots.length)];
        setBallAtIndex(actualBallSlot); // Teleport logic
      }
    }

    setGameState(GameState.RESULT);
    
    // Lift the clicked cup
    const newLifted = [...liftedCups];
    newLifted[cupId] = true;
    setLiftedCups(newLifted);
    audio.playLift();

    if (finalIsWinner) {
      audio.playWin();
      const winPhrase = audio.getRandomPhrase('win');
      setCommentary(winPhrase);
      audio.speak(winPhrase, 'win');
      
      onWin();
      setInstruction("You found it!");
      // Reset after delay
      setTimeout(() => setGameState(GameState.IDLE), 4000);
    } else {
      audio.playLose();
      const losePhrase = audio.getRandomPhrase('lose');
      setCommentary(losePhrase);
      audio.speak(losePhrase, 'lose');
      
      onLose();
      
      // Use 'actualBallSlot' to check if the ball was moved (scammed) or just missed
      const wasScammed = isWinner && !finalIsWinner;
      setInstruction(wasScammed ? "Too slow!" : "Missed it!");
      
      // Reveal actual location after short delay
      setTimeout(() => {
        // Find cup at actualBallSlot
        const actualCupId = cupPositions.findIndex(p => p === actualBallSlot);
        // Lift the actual cup if it wasn't the one picked
        if (actualCupId !== cupId) {
            const revealLift = [...newLifted];
            revealLift[actualCupId] = true;
            setLiftedCups(revealLift);
            audio.playLift();
        }
        
        setTimeout(() => setGameState(GameState.IDLE), 4000);
      }, 1500);
    }
  };

  // Calculate ball visual position based on ballAtIndex
  // We use visualPositions ref which is now synced from cupRefs in useFrame
  const cupWithBall = cupPositions.findIndex(pos => pos === ballAtIndex);
  
  const ballPos: [number, number, number] = [
    visualPositions.current[cupWithBall]?.x || POSITIONS[ballAtIndex] || 0,
    0,
    visualPositions.current[cupWithBall]?.z || 0
  ];

  return (
    <>
      {/* Lighting - Adjusted for White Room */}
      <ambientLight intensity={0.6} color="#ffffff" />
      <directionalLight 
        position={[2, 8, 5]} 
        intensity={1.0} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-5, 2, -2]} intensity={0.5} color="#4169E1" distance={10} />
      <spotLight position={[0, 10, 0]} angle={0.5} penumbra={0.5} intensity={0.5} color="#ffffff" />

      {/* White Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Ball: Hidden strictly during SHUFFLING to prevent clipping tells. 
          Pass gameState for IDLE animations. Pass cupRefs for collisions. */}
      <Ball 
        position={ballPos} 
        visible={gameState !== GameState.SHUFFLING} 
        gameState={gameState}
        cupObstacles={cupRefs.current}
      />

      {/* Cups */}
      {cupPositions.map((_, id) => (
        <Cup
          key={id}
          ref={(el) => { cupRefs.current[id] = el; }}
          position={[
            POSITIONS[cupPositions[id]],
            0,
            0
          ]}
          isLifted={liftedCups[id]}
          isHovered={hoveredCup === id && gameState === GameState.PICKING}
          color={'#E34234'} // Vermilion
          onClick={() => handleCupClick(id)}
          onPointerOver={() => setHoveredCup(id)}
          onPointerOut={() => setHoveredCup(null)}
        />
      ))}
    </>
  );
};
