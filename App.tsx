
import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './components/Scene';
import { GameState, Difficulty } from './types';
import { Trophy, RefreshCw, Gauge, MessageSquare } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [instruction, setInstruction] = useState("Ready to play?");
  const [commentary, setCommentary] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>('EASY');

  const handleWin = () => {
    setScore(s => s + 1);
    setStreak(s => s + 1);
  };

  const handleLose = () => {
    setStreak(0);
  };

  const handleStart = () => {
    if (gameState === GameState.IDLE) {
      setGameState(GameState.REVEAL);
      setCommentary("");
    }
  };

  const cycleDifficulty = () => {
    setDifficulty(d => {
      if (d === 'EASY') return 'MEDIUM';
      if (d === 'MEDIUM') return 'HARD';
      return 'EASY';
    });
    setStreak(0); // Reset streak on difficulty change
  };

  const getDifficultyColor = (d: Difficulty) => {
    switch (d) {
        case 'EASY': return 'text-green-600 border-green-600';
        case 'MEDIUM': return 'text-yellow-600 border-yellow-600';
        case 'HARD': return 'text-red-600 border-red-600';
        default: return 'text-gray-600 border-gray-600';
    }
  };

  return (
    <div className="relative w-full h-screen bg-white font-mono overflow-hidden select-none text-gray-900">
      {/* 3D Canvas */}
      <Canvas shadows camera={{ position: [0, 6, 6], fov: 45 }}>
        <Scene 
          gameState={gameState} 
          setGameState={setGameState}
          difficulty={difficulty}
          onWin={handleWin}
          onLose={handleLose}
          setInstruction={setInstruction}
          setCommentary={setCommentary}
        />
      </Canvas>

      {/* HUD Overlay - Dark text for White Background */}
      <div className="absolute top-0 left-0 w-full p-6 pointer-events-none flex justify-between text-gray-800 z-10">
        <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tighter text-hustle-green drop-shadow-sm">SHELL HUSTLE</h1>
            <div className="flex items-center gap-2">
                <Trophy size={20} className="text-yellow-600" />
                <span className="text-xl font-bold">WINS: {score}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm opacity-70 font-semibold">STREAK: {streak}</span>
            </div>
        </div>

        <div className="flex flex-col items-end gap-2 pointer-events-auto">
             <button 
                onClick={cycleDifficulty}
                className={`flex items-center gap-2 px-3 py-1 text-xs border-2 font-bold rounded hover:bg-black/5 transition ${getDifficultyColor(difficulty)}`}
            >
                <Gauge size={12} />
                MODE: {difficulty}
            </button>
        </div>
      </div>

      {/* Center Instruction / Start Button */}
      <div className="absolute bottom-10 left-0 w-full flex flex-col items-center justify-center pointer-events-none z-10">
        
        {/* Commentary Bubble - Light theme with dark border */}
        {commentary && (
          <div className="mb-4 max-w-md text-center animate-bounce">
             <div className="bg-white text-gray-900 px-4 py-2 rounded-xl rounded-bl-none border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] font-bold flex items-center gap-2 justify-center">
                <MessageSquare size={16} className="fill-current text-gray-500" />
                {commentary}
             </div>
          </div>
        )}

        <div className="text-2xl text-gray-900 font-bold mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] bg-white/90 px-4 py-2 rounded border-2 border-gray-200 backdrop-blur-sm">
            {instruction}
        </div>

        {gameState === GameState.IDLE && (
          <button
            onClick={handleStart}
            className="pointer-events-auto bg-vermilion text-white text-xl px-8 py-4 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-2 active:shadow-none transition-all flex items-center gap-3 border-2 border-black/10"
          >
            <RefreshCw size={24} />
            START ROUND
          </button>
        )}
      </div>
      
      {/* Subtle Texture Overlay for White Room */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.03)_50%)] bg-[length:100%_4px] z-20 opacity-50" />
    </div>
  );
}