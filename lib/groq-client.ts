import Groq from 'groq-sdk';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true, // Allow browser usage since this is a public app with public API key
});

export const groqClient = groq;

export async function generateGameCoachAdvice(
  gameState: {
    cash: number;
    netWorth: number;
    aiNetWorth: number;
    year: number;
    investments: Record<string, number>;
    stocks: Record<string, any>;
    cryptos: Record<string, any>;
    monthlyNetIncome: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }
): Promise<string> {
  // Static advice based on game state - no API calls needed
  const margin = gameState.netWorth - gameState.aiNetWorth;
  const isWinning = margin > 0;
  
  const adviceOptions = {
    winning: [
      "Great momentum! Keep diversifying to stay ahead. Consider adding real estate to your portfolio.",
      "You're crushing it! Lock in gains on high-performers and rebalance into stable assets.",
      "Leading by example! Don't get complacent - the AI is always watching for opportunities.",
      "Solid strategy! Your portfolio mix is working well. Maintain discipline.",
      "You're on fire! Consider taking calculated risks since you have a cushion.",
    ],
    close: [
      "It's a close race! Focus on consistent monthly investing rather than chasing trends.",
      "The gap is narrowing - time to reassess your strategy and find high-conviction bets.",
      "Neck and neck! Every decision matters now. Play smart, not aggressive.",
      "Stay focused! Small advantages compound over time. Don't panic.",
      "Competitive match! Look for undervalued assets before the AI finds them.",
    ],
    losing: [
      "Comeback time! Focus on building cash reserves and making strategic picks.",
      "You're behind but not out. Stick to your long-term plan - volatility creates opportunity.",
      "Time to get aggressive with your remaining capital. Calculated risks pay off.",
      "Don't chase losses. Focus on steady monthly contributions and patience.",
      "Reset your mindset. The best investors recover from setbacks by staying disciplined.",
    ]
  };
  
  let category: keyof typeof adviceOptions;
  if (isWinning) {
    category = Math.abs(margin) > gameState.aiNetWorth * 0.2 ? 'winning' : 'close';
  } else {
    category = Math.abs(margin) > gameState.aiNetWorth * 0.2 ? 'losing' : 'close';
  }
  
  const advice = adviceOptions[category];
  return advice[Math.floor(Math.random() * advice.length)];
}

export async function generateGameSummary(
  gameStats: {
    playerScore: number;
    aiScore: number;
    result: 'win' | 'loss';
    yearsPlayed: number;
    difficulty: 'easy' | 'medium' | 'hard';
    investmentBreakdown: Record<string, number>;
    bestPerformingAsset: string;
    worstPerformingAsset: string;
    totalInvested: number;
    totalReturns: number;
  }
): Promise<any> {
  try {
    const response = await fetch('/api/generate-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameStats }),
    })

    if (!response.ok) {
      throw new Error('Failed to generate summary')
    }

    const data = await response.json()
    return data.analysis
  } catch (error) {
    console.error('Error generating summary:', error)
    // Return default analysis if API fails
    return {
      summary: 'Game completed! Check your investment performance above.',
      strengths: ['Completed the full 10-year simulation', 'Managed multiple asset classes'],
      mistakes: ['Review your best and worst performing assets'],
      opportunities: ['Analyze what could have been done differently'],
      recommendations: ['Play again to improve your strategy'],
      investmentTips: 'Focus on diversification and consistency.',
    }
  }
}
