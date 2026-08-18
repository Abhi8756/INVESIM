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
): Promise<string> {
  // Static summary based on game results
  const margin = Math.abs(gameStats.playerScore - gameStats.aiScore);
  const marginPercent = (margin / gameStats.aiScore) * 100;
  
  const summaries = {
    winByLarge: [
      `Outstanding performance! You dominated by ₹${margin.toLocaleString('en-IN')} (${marginPercent.toFixed(1)}%). Your ${gameStats.bestPerformingAsset} strategy was flawless. In the next game, diversify earlier to compound gains faster.`,
      `Masterful investing! You crushed the AI with smart decisions across all asset classes. Your key strength was timing entries into ${gameStats.bestPerformingAsset}. Next time, try adding more volatility for even bigger returns.`,
      `Exceptional portfolio management! You beat the AI convincingly. The secret was disciplined rebalancing and avoiding ${gameStats.worstPerformingAsset}. Keep this winning formula going!`,
    ],
    winBySmall: [
      `Victory! You edged out the AI by ₹${margin.toLocaleString('en-IN')}. Your ${gameStats.bestPerformingAsset} picks were solid, but you hesitated too much on ${gameStats.worstPerformingAsset}. Be bolder next time!`,
      `Close match, but you won! Your consistency paid off. Focus on learning why ${gameStats.worstPerformingAsset} underperformed—avoiding one bad asset class cost you ₹${margin.toLocaleString('en-IN')}. Next game, diversify fully.`,
      `Narrow victory! You beat the odds with smart monthly contributions. You've got the fundamentals down—now work on tactical timing to increase your winning margin.`,
    ],
    lossBySmall: [
      `Tough loss by just ₹${margin.toLocaleString('en-IN')}! You were so close. Your ${gameStats.bestPerformingAsset} bets were great, but you missed growth in other sectors. Next game, rebalance more aggressively when down.`,
      `Nearly there! Just ₹${margin.toLocaleString('en-IN')} separated you from victory. You had strong fundamentals—just needed more conviction in volatile bets when trailing the AI.`,
      `Close call! You played it too safe. Your ₹${gameStats.totalInvested.toLocaleString('en-IN')} investment generated solid returns, but the AI took more calculated risks. Be more aggressive on your next run!`,
    ],
    lossByLarge: [
      `The AI outpaced you significantly. You played defensively, which is smart for learning, but next time take more calculated risks. Focus on understanding why ${gameStats.bestPerformingAsset} worked—that's your edge.`,
      `Big gap between you and the AI, but don't be discouraged. You learned valuable lessons. Next game, commit to a clear investment thesis and stick with it.`,
      `The market favored the AI's strategy this time. Analyze your best and worst performers—${gameStats.bestPerformingAsset} vs ${gameStats.worstPerformingAsset}—and swap your approach next time!`,
    ]
  };
  
  let category: keyof typeof summaries;
  if (gameStats.result === 'win') {
    category = marginPercent > 10 ? 'winByLarge' : 'winBySmall';
  } else {
    category = marginPercent > 10 ? 'lossByLarge' : 'lossBySmall';
  }
  
  const summary = summaries[category];
  return summary[Math.floor(Math.random() * summary.length)];
}
