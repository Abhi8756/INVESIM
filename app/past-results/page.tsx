"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@clerk/nextjs"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Download, ArrowRight, Trash2, Loader2 } from "lucide-react"
import { generateGameSummaryPDF } from "@/lib/pdf-generator"
import { generateGameSummary } from "@/lib/groq-client"

interface GameResult {
  gameId: string
  userId: string
  date: string
  playerScore: number
  aiScore: number
  result: 'win' | 'loss'
  difficulty: 'easy' | 'medium' | 'hard'
  investments: Record<string, number>
  investmentProfits: Record<string, number>
  bestPerformingAsset: string
  worstPerformingAsset: string
  totalInvested: number
  totalReturns: number
  analysis?: any
}

export default function PastResults() {
  const { userId, isSignedIn, isLoaded } = useAuth()
  const [games, setGames] = useState<GameResult[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    console.log('🔍 Auth Status:', { userId, isSignedIn, isLoaded })
    
    if (!isLoaded) {
      console.log('⏳ Waiting for auth...')
      return
    }

    if (isSignedIn && userId) {
      console.log('✅ User signed in with ID:', userId)
      const userResultsKey = `gameResults_${userId}`
      console.log('🔑 Checking localStorage key:', userResultsKey)
      
      // Direct localStorage access
      const storedData = localStorage.getItem(userResultsKey)
      console.log('💾 Raw data:', storedData)
      
      if (storedData) {
        try {
          const parsedGames = JSON.parse(storedData)
          console.log('📊 Parsed games:', parsedGames)
          setGames(Array.isArray(parsedGames) ? parsedGames.reverse() : [])
        } catch (e) {
          console.error('❌ Parse error:', e)
          setGames([])
        }
      } else {
        console.log('❌ No data found in localStorage')
        setGames([])
      }
    } else {
      console.log('❌ User not signed in')
      setGames([])
    }
    
    setLoading(false)
  }, [userId, isSignedIn, isLoaded])

  const handleDownloadPDF = async (game: GameResult) => {
    try {
      setDownloadingId(game.gameId)

      // Get analysis if not already stored
      let analysis = game.analysis
      if (!analysis) {
        analysis = await generateGameSummary({
          playerScore: game.playerScore,
          aiScore: game.aiScore,
          result: game.result,
          yearsPlayed: 10,
          difficulty: game.difficulty,
          investmentBreakdown: game.investments,
          bestPerformingAsset: game.bestPerformingAsset,
          worstPerformingAsset: game.worstPerformingAsset,
          totalInvested: game.totalInvested,
          totalReturns: game.totalReturns,
        })
      }

      const pdfBlob = await generateGameSummaryPDF(analysis, {
        playerScore: game.playerScore,
        aiScore: game.aiScore,
        result: game.result,
        yearsPlayed: 10,
        difficulty: game.difficulty,
        investmentBreakdown: game.investments,
        bestPerformingAsset: game.bestPerformingAsset,
        worstPerformingAsset: game.worstPerformingAsset,
        totalInvested: game.totalInvested,
        totalReturns: game.totalReturns,
      })

      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invesim-game-${new Date(game.date).toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading PDF:', err)
      alert('Failed to download PDF')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDeleteGame = (gameId: string) => {
    if (!userId) return
    if (!confirm('Are you sure you want to delete this game record?')) return

    const userResultsKey = `gameResults_${userId}`
    const storedResults = localStorage.getItem(userResultsKey)
    if (storedResults) {
      const results = JSON.parse(storedResults).filter((g: GameResult) => g.gameId !== gameId)
      localStorage.setItem(userResultsKey, JSON.stringify(results))
      setGames(games.filter(g => g.gameId !== gameId))
    }
  }

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold">
            {!isLoaded ? 'Loading authentication...' : 'Loading games...'}
          </p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-6">Please sign in to view your game history</p>
          <Link href="/sign-in">
            <Button className="gap-2">
              Sign In
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold mb-4">No Games Yet</h1>
          <p className="text-muted-foreground mb-6">Start playing to build your game history!</p>
          <Link href="/game">
            <Button className="gap-2">
              Play Game
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10 text-foreground p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-black mb-2 font-orbitron">Past Results</h1>
          <p className="text-muted-foreground">All your investment simulation games</p>
        </motion.div>

        {/* Games List */}
        <div className="space-y-4">
          {games.map((game, idx) => (
            <motion.div
              key={game.gameId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-6 hover:border-primary/50 transition-colors"
            >
              <div className="grid md:grid-cols-5 gap-6 items-center">
                {/* Date & Result */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Date</p>
                  <p className="font-semibold">
                    {new Date(game.date).toLocaleDateString('en-IN')}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-2xl">
                      {game.result === 'win' ? '🏆' : '💔'}
                    </span>
                    <span className={`text-sm font-bold px-2 py-1 rounded ${
                      game.result === 'win'
                        ? 'bg-green-500/20 text-green-700'
                        : 'bg-red-500/20 text-red-700'
                    }`}>
                      {game.result.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Difficulty</p>
                  <p className="font-semibold capitalize">{game.difficulty}</p>
                </div>

                {/* Scores */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Your Score</p>
                  <p className="font-bold text-primary">
                    ₹{game.playerScore.toLocaleString('en-IN')}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">AI Score</p>
                  <p className="font-bold text-destructive">
                    ₹{game.aiScore.toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Margin */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Margin</p>
                  <p className={`font-bold ${
                    game.playerScore > game.aiScore ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {game.playerScore > game.aiScore ? '+' : ''}₹{(game.playerScore - game.aiScore).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-border/30">
                <Link href={`/game-details/${game.gameId}`}>
                  <Button variant="outline" size="sm" className="gap-2">
                    View Details
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadPDF(game)}
                  disabled={downloadingId === game.gameId}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  {downloadingId === game.gameId ? 'Generating...' : 'Download PDF'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteGame(game.gameId)}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Play Again */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          <Link href="/game">
            <Button size="lg" className="gap-2">
              Play Another Game
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
