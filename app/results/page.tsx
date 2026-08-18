"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useGameSummary } from "@/hooks/use-game-coach"
import { AIGameSummary } from "@/components/ui/ai-game-summary"
import { useGameStore } from "@/lib/store"

interface GameResult {
  userId: string
  date: string
  playerScore: number
  aiScore: number
  result: 'win' | 'loss'
  difficulty: 'easy' | 'medium' | 'hard'
  investments?: Record<string, number>
  investmentProfits?: Record<string, number>
}

export default function Results() {
  const { user: clerkUser } = useAuth();
  const { summary, generateSummary } = useGameSummary();
  const { resetGame } = useGameStore();
  const router = useRouter();
  const [results, setResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastGameResult, setLastGameResult] = useState<GameResult | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    if (clerkUser) {
      // Load user-specific results
      const userResultsKey = `gameResults_${clerkUser.id}`;
      const storedResults = localStorage.getItem(userResultsKey);
      if (storedResults) {
        const parsedResults = JSON.parse(storedResults);
        setResults(parsedResults);
        
        // Get the most recent game result
        if (parsedResults.length > 0) {
          const lastResult = parsedResults[parsedResults.length - 1];
          setLastGameResult(lastResult);
          setShowSummary(true);
          
          // Generate AI summary in the background
          generateSummary({
            playerScore: lastResult.playerScore,
            aiScore: lastResult.aiScore,
            result: lastResult.result,
            yearsPlayed: 10,
            difficulty: lastResult.difficulty,
            investmentBreakdown: lastResult.investments || {},
            bestPerformingAsset: 'Nifty 50',
            worstPerformingAsset: 'Savings',
            totalInvested: 500000,
            totalReturns: lastResult.playerScore - 100000,
          });
        }
      }
    }
    setLoading(false);
  }, [clerkUser, generateSummary]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getResultColor = (result: string) => {
    return result === 'win' ? 'text-green-600' : 'text-red-600';
  };

  const getResultEmoji = (result: string) => {
    return result === 'win' ? '🏆' : '💔';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your game results...</p>
        </div>
      </div>
    );
  }

  // Show AI summary for last game
  if (showSummary && lastGameResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10 text-foreground p-4">
        <div className="max-w-4xl mx-auto">
          <AIGameSummary
            summaryText={summary.text}
            isLoading={summary.isLoading}
            playerScore={lastGameResult.playerScore}
            aiScore={lastGameResult.aiScore}
            result={lastGameResult.result}
            difficulty={lastGameResult.difficulty}
            onPlayAgain={() => {
              resetGame();
              router.push('/game');
            }}
            onViewResults={() => setShowSummary(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 font-orbitron text-primary">Your Game History</h1>
        
        {results.length > 0 ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              📊 Total Games: {results.length} | 
              Wins: {results.filter(r => r.result === 'win').length} | 
              Losses: {results.filter(r => r.result === 'loss').length}
            </div>
            
            <div className="grid gap-4">
              {results.map((result, index) => (
                <motion.div
                  key={index}
                  className="bg-card/50 backdrop-blur-sm border border-border p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getResultEmoji(result.result)}</span>
                      <div>
                        <h3 className={`font-bold text-lg ${getResultColor(result.result)}`}>
                          {result.result === 'win' ? 'Victory!' : 'Defeat'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(result.date).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(result.difficulty)}`}>
                      {result.difficulty.toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Your Score</p>
                      <p className="font-bold text-lg">{formatCurrency(result.playerScore)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">AI Score</p>
                      <p className="font-bold text-lg">{formatCurrency(result.aiScore)}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Margin: {result.result === 'win' ? '+' : '-'}{formatCurrency(Math.abs(result.playerScore - result.aiScore))}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-2xl font-semibold mb-4 font-orbitron">No Games Yet</h2>
            <p className="text-muted-foreground mb-6">
              You haven't completed any games yet. Start playing to see your results here!
            </p>
            <Button 
              onClick={() => window.location.href = '/game'}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              Start Your First Game
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

