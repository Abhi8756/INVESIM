"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface InvestmentTransaction {
  id: string
  timestamp: number
  year: number
  month: number
  type: "buy" | "sell"
  asset: string
  assetName: string
  amount: number
  quantity?: number
  rate: number
  marketConditions?: {
    currentEvent?: string
    aiNetWorth: number
    playerNetWorth: number
  }
}

interface InvestmentTransactionReportProps {
  transactions: InvestmentTransaction[]
  finalInvestments: Record<string, number>
  finalProfits: Record<string, number>
}

export function InvestmentTransactionReport({ 
  transactions, 
  finalInvestments, 
  finalProfits 
}: InvestmentTransactionReportProps) {
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'time' | 'amount' | 'asset'>('time')

  // Debug logging
  console.log('🔍 InvestmentTransactionReport Debug:')
  console.log('📊 Transactions received:', transactions)
  console.log('💰 Final investments:', finalInvestments)
  console.log('📈 Final profits:', finalProfits)

  // Group transactions by asset
  const transactionsByAsset = transactions.reduce((acc, transaction) => {
    if (!acc[transaction.asset]) {
      acc[transaction.asset] = []
    }
    acc[transaction.asset].push(transaction)
    return acc
  }, {} as Record<string, InvestmentTransaction[]>)

  console.log('📋 Transactions by asset:', transactionsByAsset)

  // Calculate performance metrics per asset
  const assetPerformance = Object.keys(transactionsByAsset).map(asset => {
    const assetTransactions = transactionsByAsset[asset]
    const totalInvested = assetTransactions
      .filter(t => t.type === 'buy')
      .reduce((sum, t) => sum + t.amount, 0)
    const totalWithdrawn = assetTransactions
      .filter(t => t.type === 'sell')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const currentValue = (finalInvestments[asset] || 0) + (finalProfits[asset] || 0)
    const netInvested = totalInvested - totalWithdrawn
    const totalReturn = currentValue - netInvested
    const returnPercentage = netInvested > 0 ? (totalReturn / netInvested) * 100 : 0

    return {
      asset,
      assetName: assetTransactions[0]?.assetName || asset,
      totalInvested,
      totalWithdrawn,
      netInvested,
      currentValue,
      totalReturn,
      returnPercentage,
      transactionCount: assetTransactions.length,
      transactions: assetTransactions
    }
  })

  // Sort assets by performance
  const sortedAssets = assetPerformance
    .filter(asset => asset.transactionCount > 0)
    .sort((a, b) => b.returnPercentage - a.returnPercentage)

  console.log('🎯 Asset performance calculated:', assetPerformance)
  console.log('✅ Sorted assets (after filtering):', sortedAssets)

  const toggleAssetExpansion = (asset: string) => {
    const newExpanded = new Set(expandedAssets)
    if (newExpanded.has(asset)) {
      newExpanded.delete(asset)
    } else {
      newExpanded.add(asset)
    }
    setExpandedAssets(newExpanded)
  }

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return months[month] || 'Unknown'
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No investment transactions recorded</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2" />
          Detailed Investment Analysis
        </h3>
        
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-sm text-blue-700 mb-1">Total Transactions</p>
            <p className="text-2xl font-bold text-blue-900">{transactions.length}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-blue-700 mb-1">Assets Traded</p>
            <p className="text-2xl font-bold text-blue-900">{Object.keys(transactionsByAsset).length}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-blue-700 mb-1">Avg Transaction</p>
            <p className="text-2xl font-bold text-blue-900">
              ₹{formatCurrency(transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length)}
            </p>
          </div>
        </div>

        <p className="text-sm text-blue-700">
          Click on each asset below to see your complete transaction history, including rates and market conditions at the time of each trade.
        </p>
      </div>

      {/* Asset Performance Summary */}
      <div className="space-y-3">
        {sortedAssets.map((assetData, idx) => (
          <motion.div
            key={assetData.asset}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden"
          >
            {/* Asset Header */}
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleAssetExpansion(assetData.asset)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    assetData.returnPercentage >= 0 ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <h4 className="font-semibold text-gray-900">{assetData.assetName}</h4>
                    <p className="text-sm text-gray-600">{assetData.transactionCount} transactions</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Current Value</p>
                    <p className="font-bold">₹{formatCurrency(assetData.currentValue)}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Return</p>
                    <p className={`font-bold flex items-center ${
                      assetData.returnPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {assetData.returnPercentage >= 0 ? (
                        <TrendingUp className="w-4 h-4 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 mr-1" />
                      )}
                      {assetData.returnPercentage.toFixed(1)}%
                    </p>
                  </div>
                  
                  <div className="text-gray-400">
                    {expandedAssets.has(assetData.asset) ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Transaction Details */}
            {expandedAssets.has(assetData.asset) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="border-t border-gray-200"
              >
                <div className="p-4 bg-gray-50">
                  <div className="grid md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Invested:</span>
                      <p className="font-semibold">₹{formatCurrency(assetData.totalInvested)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Withdrawn:</span>
                      <p className="font-semibold">₹{formatCurrency(assetData.totalWithdrawn)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Net Investment:</span>
                      <p className="font-semibold">₹{formatCurrency(assetData.netInvested)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Return:</span>
                      <p className={`font-semibold ${
                        assetData.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ₹{formatCurrency(assetData.totalReturn)}
                      </p>
                    </div>
                  </div>

                  {/* Transaction List */}
                  <div className="space-y-2">
                    <h5 className="font-semibold text-gray-800 mb-2">Transaction History:</h5>
                    {assetData.transactions
                      .sort((a, b) => a.timestamp - b.timestamp)
                      .map((transaction, txnIdx) => (
                        <div
                          key={transaction.id}
                          className="bg-white border border-gray-200 rounded p-3 text-sm"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                transaction.type === 'buy'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {transaction.type === 'buy' ? 'BUY' : 'SELL'}
                              </span>
                              <span className="text-gray-600 flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                Year {transaction.year}, {getMonthName(transaction.month)}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">₹{formatCurrency(transaction.amount)}</p>
                              {transaction.rate && (
                                <p className="text-gray-500 text-xs">
                                  @ ₹{formatCurrency(transaction.rate)} rate
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {transaction.marketConditions && (
                            <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                              <p>Market Context: Your worth: ₹{formatCurrency(transaction.marketConditions.playerNetWorth)} | AI worth: ₹{formatCurrency(transaction.marketConditions.aiNetWorth)}</p>
                              {transaction.marketConditions.currentEvent && (
                                <p>Active Event: {transaction.marketConditions.currentEvent}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {sortedAssets.length === 0 && (
        <div className="text-center py-8 text-gray-600">
          <p>No investment transactions found</p>
        </div>
      )}
    </div>
  )
}