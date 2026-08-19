"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@clerk/nextjs"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GameResultsSummary } from "@/components/game-results-summary"
import { useGameStore } from "@/lib/store"
import { ArrowRight } from "lucide-react"

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
  const { user: clerkUser, isLoaded } = useAuth()
  const { resetGame } = useGameStore()
  const [results, setResults] = useState<GameResult[]>([])
  const [lastGameResult, setLastGameResult] = useState<GameResult | null>(null)
  const [gameStats, setGameStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) {
      return // Wait for auth to load
    }

    if (clerkUser) {
      const userResultsKey = `gameResults_${clerkUser.id}`
      const storedResults = localStorage.getItem(userResultsKey)
      console.log('Looking for results with key:', userResultsKey)
      console.log('Stored results:', storedResults)
      
      if (storedResults) {
        const parsedResults = JSON.parse(storedResults)
        setResults(parsedResults)

        if (parsedResults.length > 0) {
          const lastResult = parsedResults[parsedResults.length - 1]
          setLastGameResult(lastResult)
          console.log('Last game result:', lastResult)

          // Prepare game stats for AI analysis
          const investmentBreakdown = lastResult.investments || {}
          const totalInvested = Object.values(investmentBreakdown).reduce((a: number, b: number) => a + b, 0)
          const bestAsset = Object.entries(investmentBreakdown).sort(([, a]: any, [, b]: any) => b - a)[0]?.[0] || 'Unknown'
          const worstAsset = Object.entries(investmentBreakdown).sort(([, a]: any, [, b]: any) => a - b)[0]?.[0] || 'Unknown'

          const stats = {
            playerScore: lastResult.playerScore,
            aiScore: lastResult.aiScore,
            result: lastResult.result,
            yearsPlayed: 10,
            difficulty: lastResult.difficulty,
            investmentBreakdown,
            bestPerformingAsset: bestAsset,
            worstPerformingAsset: worstAsset,
            totalInvested,
            totalReturns: lastResult.playerScore - totalInvested,
          }
          setGameStats(stats)
          console.log('Game stats prepared:', stats)
        }
      }
      setLoading(false)
    } else {
      // No user, still set loading to false
      setLoading(false)
    }
  }, [clerkUser, isLoaded])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading results...</p>
        </div>
      </div>
    )
  }

  if (!lastGameResult || !gameStats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold mb-4">No Games Yet</h1>
          <p className="text-muted-foreground mb-6">Start a game to see your results and analysis here.</p>
          <Link href="/game">
            <Button>Play Game</Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10 text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-black mb-2 font-orbitron">
            {lastGameResult.result === 'win' ? '🏆 Victory!' : '💔 Game Over'}
          </h1>
          <p className="text-lg text-muted-foreground font-poppins">
            Difficulty: <span className="font-semibold text-primary capitalize">{lastGameResult.difficulty}</span>
          </p>
        </motion.div>

        {/* Score Comparison */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-2 gap-6 mb-8"
        >
          <div className={`bg-card/50 backdrop-blur-sm border rounded-lg p-6 text-center ${
            lastGameResult.result === 'win' ? 'border-green-500/30 bg-green-500/5' : 'border-blue-500/30 bg-blue-500/5'
          }`}>
            <p className="text-muted-foreground text-sm mb-2">YOUR FINAL SCORE</p>
            <p className="text-4xl font-bold text-primary">₹{lastGameResult.playerScore.toLocaleString('en-IN')}</p>
          </div>

          <div className={`bg-card/50 backdrop-blur-sm border rounded-lg p-6 text-center ${
            lastGameResult.result === 'loss' ? 'border-red-500/30 bg-red-500/5' : 'border-red-500/30 bg-red-500/5'
          }`}>
            <p className="text-muted-foreground text-sm mb-2">AI FINAL SCORE</p>
            <p className="text-4xl font-bold text-destructive">₹{lastGameResult.aiScore.toLocaleString('en-IN')}</p>
          </div>
        </motion.div>

        {/* AI Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GameResultsSummary gameStats={gameStats} />
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex gap-4 mt-8 justify-center flex-wrap"
        >
          <Link href="/game">
            <Button
              onClick={() => resetGame()}
              className="gap-2"
            >
              Play Again
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline">
              Back to Home
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
