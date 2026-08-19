"use client"

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Loader2, AlertCircle } from 'lucide-react'
import { generateGameSummary } from '@/lib/groq-client'
import { generateGameSummaryPDF } from '@/lib/pdf-generator'
import { Button } from '@/components/ui/button'

import { InvestmentTransactionReport } from '@/components/ui/investment-transaction-report'

interface GameResultsSummaryProps {
  gameStats: {
    playerScore: number
    aiScore: number
    result: 'win' | 'loss'
    yearsPlayed: number
    difficulty: 'easy' | 'medium' | 'hard'
    investmentBreakdown: Record<string, number>
    bestPerformingAsset: string
    worstPerformingAsset: string
    totalInvested: number
    totalReturns: number
    transactionHistory?: any[] // Add transaction history
    investmentProfits?: Record<string, number> // Add investment profits
  }
}

export function GameResultsSummary({ gameStats }: GameResultsSummaryProps) {
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        setLoading(true)
        console.log('Loading game analysis for stats:', gameStats)
        const result = await generateGameSummary(gameStats)
        console.log('Received analysis:', result)
        setAnalysis(result)
      } catch (err) {
        console.error('Error loading analysis:', err)
        setError('Failed to generate AI analysis')
      } finally {
        setLoading(false)
      }
    }

    if (gameStats) {
      loadAnalysis()
    }
  }, [gameStats])

  const handleDownloadPDF = async () => {
    try {
      setGenerating(true)
      if (!analysis) {
        setError('Analysis not ready')
        return
      }

      const pdfBlob = await generateGameSummaryPDF(analysis, gameStats)

      // Create download link
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invesim-summary-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error generating PDF:', err)
      setError('Failed to generate PDF')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
        <span>Generating AI analysis...</span>
      </div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3"
      >
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-900">Error</h3>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </motion.div>
    )
  }

  if (!analysis) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Summary */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-indigo-900 mb-3">AI Analysis</h2>
        <p className="text-indigo-800 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Strengths */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-green-900 mb-3 flex items-center">
          <span className="text-2xl mr-2">✅</span> Key Strengths
        </h3>
        <ul className="space-y-2">
          {analysis.strengths.map((strength: string, idx: number) => (
            <li key={idx} className="flex items-start gap-3 text-green-800">
              <span className="text-green-600 font-bold flex-shrink-0 mt-0.5">•</span>
              <span>{strength}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Mistakes */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-red-900 mb-3 flex items-center">
          <span className="text-2xl mr-2">❌</span> Mistakes Made
        </h3>
        <ul className="space-y-2">
          {analysis.mistakes.map((mistake: string, idx: number) => (
            <li key={idx} className="flex items-start gap-3 text-red-800">
              <span className="text-red-600 font-bold flex-shrink-0 mt-0.5">•</span>
              <span>{mistake}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Missed Opportunities */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-yellow-900 mb-3 flex items-center">
          <span className="text-2xl mr-2">🎯</span> Missed Opportunities
        </h3>
        <ul className="space-y-2">
          {analysis.opportunities.map((opp: string, idx: number) => (
            <li key={idx} className="flex items-start gap-3 text-yellow-800">
              <span className="text-yellow-600 font-bold flex-shrink-0 mt-0.5">•</span>
              <span>{opp}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center">
          <span className="text-2xl mr-2">💡</span> Recommendations
        </h3>
        <ul className="space-y-2">
          {analysis.recommendations.map((rec: string, idx: number) => (
            <li key={idx} className="flex items-start gap-3 text-blue-800">
              <span className="text-blue-600 font-bold flex-shrink-0 mt-0.5">•</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Investment Tips */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-purple-900 mb-3">📊 Investment Strategy Tips</h3>
        <p className="text-purple-800 leading-relaxed">{analysis.investmentTips}</p>
      </div>

      {/* Detailed Investment Transaction Report */}
      {gameStats.transactionHistory && gameStats.transactionHistory.length > 0 && (
        <div>
          <InvestmentTransactionReport
            transactions={gameStats.transactionHistory}
            finalInvestments={gameStats.investmentBreakdown}
            finalProfits={gameStats.investmentProfits || {}}
          />
        </div>
      )}

      {/* Download PDF Button */}
      <div className="flex gap-4">
        <Button
          onClick={handleDownloadPDF}
          disabled={generating}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download Summary as PDF
            </>
          )}
        </Button>
      </div>
    </motion.div>
  )
}
