"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CoachAdvice } from "@/hooks/use-game-coach";
import { Sparkles, Lightbulb } from "lucide-react";

interface GameCoachPanelProps {
  advice: CoachAdvice | null;
  isLoading: boolean;
  onDismiss: () => void;
}

export function GameCoachPanel({ advice, isLoading, onDismiss }: GameCoachPanelProps) {
  return (
    <AnimatePresence>
      {(advice || isLoading) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 right-6 max-w-sm bg-gradient-to-br from-purple-900/90 to-purple-800/90 backdrop-blur-xl border border-purple-400/30 rounded-lg shadow-2xl p-4 z-50"
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Sparkles className="w-5 h-5 text-purple-300 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-orbitron font-bold text-purple-200 flex items-center gap-1">
                  <Lightbulb className="w-4 h-4" />
                  Coach Tip {advice?.emoji}
                </h3>
                <button
                  onClick={onDismiss}
                  className="text-purple-300 hover:text-purple-100 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm text-purple-200">Thinking...</span>
                </div>
              ) : (
                <p className="text-sm text-purple-100 font-poppins leading-relaxed">
                  {advice?.text}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
