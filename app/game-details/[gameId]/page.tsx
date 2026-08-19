"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@clerk/nextjs"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GameResultsSummary } from "@/components/game-results-summary"
import { Download, ArrowLeft, Loader2 } from "lucide-react"
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
  transactionHistory?: any[] // Add transaction history
  bestPerformingAsset: string
  worstPerformingAsset: string
  totalInvested: number
  totalReturns: number
}

export default function GameDetails() {
  const { user: clerkUser, isLoaded } = useAuth()
  const params = useParams()
  const gameId = params.gameId as string
  
  const [game, setGame] = useState<GameResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!isLoaded || !clerkUser) return

    const userResultsKey = `gameResults_${clerkUser.id}`
    const storedResults = localStorage.getItem(userResultsKey)

    if (storedResults) {
      const results = JSON.parse(storedResults)
      const foundGame = results.find((g: GameResult) => g.gameId === gameId)
      setGame(foundGame || null)
    }
    setLoading(false)
  }, [clerkUser, isLoaded, gameId])

  const handleDownloadPDF = async () => {
    if (!game) return
    try {
      setDownloading(true)

      const analysis = await generateGameSummary({
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

      const pdfBlob = await generateGameSummaryPDF(analysis, game)

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
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold mb-4">Game Not Found</h1>
          <Link href="/past-results">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Results
            </Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  const gameStats = {
    playerScore: game.playerScore,
    aiScore: game.aiScore,
    result: game.result,
    yearsPlayed: 10,
    difficulty: game.difficulty,
    investmentBreakdown: game.investments,
    investmentProfits: game.investmentProfits,
    transactionHistory: game.transactionHistory || [], // Add transaction history
    bestPerformingAsset: game.bestPerformingAsset,
    worstPerformingAsset: game.worstPerformingAsset,
    totalInvested: game.totalInvested,
    totalReturns: game.totalReturns,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10 text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/past-results">
            <Button variant="outline" size="sm" className="gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to Results
            </Button>
          </Link>
          <h1 className="text-4xl font-black mb-2 font-orbitron">
            {game.result === 'win' ? '🏆 Victory!' : '💔 Game Over'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {new Date(game.date).toLocaleString('en-IN')} • Difficulty: <span className="font-semibold text-primary capitalize">{game.difficulty}</span>
          </p>
        </motion.div>

        {/* Score Comparison */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-card/50 backdrop-blur-sm border border-blue-500/30 rounded-lg p-6 text-center">
            <p className="text-muted-foreground text-sm mb-2">YOUR SCORE</p>
            <p className="text-3xl font-bold text-primary">₹{game.playerScore.toLocaleString('en-IN')}</p>
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-muted-foreground text-sm mb-2">AI SCORE</p>
            <p className="text-3xl font-bold text-destructive">₹{game.aiScore.toLocaleString('en-IN')}</p>
          </div>

          <div className={`bg-card/50 backdrop-blur-sm border rounded-lg p-6 text-center ${
            game.playerScore > game.aiScore
              ? 'border-green-500/30'
              : 'border-red-500/30'
          }`}>
            <p className="text-muted-foreground text-sm mb-2">MARGIN</p>
            <p className={`text-3xl font-bold ${
              game.playerScore > game.aiScore ? 'text-green-600' : 'text-red-600'
            }`}>
              {game.playerScore > game.aiScore ? '+' : ''}₹{(game.playerScore - game.aiScore).toLocaleString('en-IN')}
            </p>
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

        {/* Download Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 flex gap-4 justify-center"
        >
          <Button
            onClick={handleDownloadPDF}
            disabled={downloading}
            size="lg"
            className="gap-2"
          >
            {downloading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download Full Report as PDF
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
