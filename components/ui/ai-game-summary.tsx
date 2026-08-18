"use client";

import { motion } from "framer-motion";
import { Sparkles, TrendingUp, TrendingDown, Award } from "lucide-react";
import { Button } from "./button";

interface AIGameSummaryProps {
  summaryText: string;
  isLoading: boolean;
  playerScore: number;
  aiScore: number;
  result: 'win' | 'loss';
  difficulty: 'easy' | 'medium' | 'hard';
  onPlayAgain: () => void;
  onViewResults: () => void;
}

export function AIGameSummary({
  summaryText,
  isLoading,
  playerScore,
  aiScore,
  result,
  difficulty,
  onPlayAgain,
  onViewResults,
}: AIGameSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const margin = Math.abs(playerScore - aiScore);
  const isWin = result === 'win';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={`bg-gradient-to-br ${
        isWin
          ? 'from-green-900/80 via-green-800/80 to-emerald-900/80'
          : 'from-red-900/80 via-red-800/80 to-rose-900/80'
      } backdrop-blur-xl border ${
        isWin ? 'border-green-400/30' : 'border-red-400/30'
      } rounded-2xl p-8 max-w-2xl mx-auto`}
    >
      {/* Header with Result */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
          className="text-6xl mb-4"
        >
          {isWin ? '🏆' : '💔'}
        </motion.div>

        <h2
          className={`text-4xl font-orbitron font-bold mb-2 ${
            isWin ? 'text-green-300' : 'text-red-300'
          }`}
        >
          {isWin ? 'Victory!' : 'Game Over'}
        </h2>

        <div
          className={`inline-block px-4 py-2 rounded-full text-sm font-bold mb-4 ${
            difficulty === 'easy'
              ? 'bg-green-500/30 text-green-200'
              : difficulty === 'medium'
              ? 'bg-yellow-500/30 text-yellow-200'
              : 'bg-red-500/30 text-red-200'
          }`}
        >
          {difficulty.toUpperCase()} MODE
        </div>
      </div>

      {/* Score Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4 text-center"
        >
          <div className="text-sm text-blue-200 mb-1">Your Score</div>
          <div className="text-2xl font-jetbrains font-bold text-blue-100">
            {formatCurrency(playerScore)}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-purple-500/20 border border-purple-400/30 rounded-lg p-4 text-center"
        >
          <div className="text-sm text-purple-200 mb-1">AI Score</div>
          <div className="text-2xl font-jetbrains font-bold text-purple-100">
            {formatCurrency(aiScore)}
          </div>
        </motion.div>
      </div>

      {/* Margin */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className={`text-center mb-8 p-3 rounded-lg ${
          isWin
            ? 'bg-green-500/20 border border-green-400/30'
            : 'bg-red-500/20 border border-red-400/30'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          {isWin ? (
            <TrendingUp className="w-5 h-5 text-green-300" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-300" />
          )}
          <span className={`font-bold text-lg ${isWin ? 'text-green-200' : 'text-red-200'}`}>
            {isWin ? '+' : '-'}{formatCurrency(margin)}
          </span>
        </div>
      </motion.div>

      {/* AI Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-background/30 border border-border/30 rounded-lg p-5 mb-8"
      >
        <div className="flex items-start gap-3 mb-3">
          <Sparkles className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-1 animate-pulse" />
          <h3 className="font-orbitron font-bold text-yellow-200">AI Analysis</h3>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div
                className="w-2 h-2 bg-yellow-300 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <div
                className="w-2 h-2 bg-yellow-300 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <div
                className="w-2 h-2 bg-yellow-300 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
            <span className="text-sm text-yellow-200">Generating analysis...</span>
          </div>
        ) : (
          <p className="text-sm text-foreground/80 font-poppins leading-relaxed">{summaryText}</p>
        )}
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex gap-3"
      >
        <Button
          onClick={onPlayAgain}
          className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-foreground font-bold"
        >
          Play Again
        </Button>
        <Button
          onClick={onViewResults}
          variant="outline"
          className="flex-1 border-primary/50 text-foreground hover:bg-primary/10"
        >
          View History
        </Button>
      </motion.div>
    </motion.div>
  );
}
