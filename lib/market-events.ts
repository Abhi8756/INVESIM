// Market-moving events that affect asset prices predictably
// These are RARE but when they happen, they cause predictable market reactions

export interface MarketEvent {
  id: string;
  name: string;
  description: string;
  year: number; // Which year this happens (0-10)
  affectedAssets: Record<string, number>; // Asset symbol -> price multiplier (1.2 = +20%)
  probability: number; // 0-1, higher = more likely at that year
}

// Market events that create predictable price movements
export const marketEvents: MarketEvent[] = [
  {
    id: 'monsoon-failure',
    name: '☔ Monsoon Failure',
    description: 'Poor monsoons affect agricultural sector and related commodities',
    year: 3,
    affectedAssets: {
      'gold': 1.15, // +15% (safe haven demand)
      'nifty50': 0.95, // -5% (agriculture exposure)
    },
    probability: 0.25,
  },
  {
    id: 'rate-cut',
    name: '📉 RBI Rate Cut',
    description: 'Central bank reduces interest rates to stimulate economy',
    year: 2,
    affectedAssets: {
      'savings': 0.90, // -10% (lower returns)
      'fixedDeposit': 0.88, // -12% (FD returns fall)
      'nifty50': 1.08, // +8% (stocks rally)
      'reliance': 1.10, // +10%
      'tcs': 1.09, // +9%
    },
    probability: 0.35,
  },
  {
    id: 'rate-hike',
    name: '📈 RBI Rate Hike',
    description: 'Central bank increases interest rates to combat inflation',
    year: 5,
    affectedAssets: {
      'savings': 1.12, // +12% (higher returns)
      'fixedDeposit': 1.15, // +15% (better FD rates)
      'nifty50': 0.93, // -7% (equity weakness)
      'bitcoin': 0.85, // -15% (risk-off sentiment)
    },
    probability: 0.30,
  },
  {
    id: 'geopolitical-crisis',
    name: '⚔️ Geopolitical Crisis',
    description: 'Global conflict increases demand for safe-haven assets',
    year: 4,
    affectedAssets: {
      'gold': 1.35, // +35% (major safe haven surge)
      'nifty50': 0.92, // -8% (risk off)
      'bitcoin': 0.88, // -12% (still seen as risky)
      'bangalore': 0.96, // -4% (real estate weakens slightly)
      'delhi': 0.95, // -5%
    },
    probability: 0.20,
  },
  {
    id: 'tech-boom',
    name: '🚀 Tech Sector Boom',
    description: 'Surge in technology stocks and digital economy',
    year: 6,
    affectedAssets: {
      'tcs': 1.25, // +25% (TCS leads)
      'infosys': 1.22, // +22%
      'nifty50': 1.15, // +15% (tech-heavy index)
      'ethereum': 1.30, // +30% (crypto rally)
      'bitcoin': 1.25, // +25%
    },
    probability: 0.25,
  },
  {
    id: 'inflation-surge',
    name: '🔥 Inflation Surge',
    description: 'Unexpected jump in consumer price index affects all markets',
    year: 3,
    affectedAssets: {
      'gold': 1.20, // +20% (inflation hedge)
      'mumbai': 1.12, // +12% (real estate hedge)
      'bangalore': 1.12,
      'delhi': 1.12,
      'pune': 1.12,
      'fixedDeposit': 0.98, // -2% (real returns fall)
      'savings': 0.97, // -3%
    },
    probability: 0.30,
  },
  {
    id: 'real-estate-boom',
    name: '🏗️ Real Estate Boom',
    description: 'Urban development and FDI drive property prices up',
    year: 7,
    affectedAssets: {
      'mumbai': 1.30, // +30%
      'bangalore': 1.28, // +28%
      'delhi': 1.25, // +25%
      'pune': 1.22, // +22%
      'nifty50': 1.10, // +10% (positive sentiment)
      'gold': 0.98, // -2% (shift from safe havens)
    },
    probability: 0.25,
  },
  {
    id: 'crypto-regulation',
    name: '⚖️ Crypto Regulation',
    description: 'Government announces framework for cryptocurrency trading',
    year: 5,
    affectedAssets: {
      'bitcoin': 1.40, // +40% (clarity = bullish)
      'ethereum': 1.38, // +38%
      'cardano': 1.35, // +35%
      'polygon': 1.32, // +32%
    },
    probability: 0.22,
  },
  {
    id: 'manufacturing-push',
    name: '🏭 Manufacturing Push',
    description: 'Make in India initiative boosts industrial stocks',
    year: 4,
    affectedAssets: {
      'reliance': 1.18, // +18%
      'tcs': 1.12, // +12% (IT services benefit)
      'nifty50': 1.10, // +10%
    },
    probability: 0.25,
  },
  {
    id: 'corporate-earnings',
    name: '💼 Strong Corporate Earnings',
    description: 'Quarterly earnings beat expectations across sectors',
    year: 8,
    affectedAssets: {
      'nifty50': 1.20, // +20%
      'reliance': 1.18,
      'tcs': 1.22,
      'hdfc': 1.15,
      'infosys': 1.19,
    },
    probability: 0.30,
  },
];

export function getMarketEventForYear(
  year: number,
  difficultyEventFrequency: { easy: number; medium: number; hard: number }
) {
  // Easy mode: more events, better predictability
  // Hard mode: fewer events, less predictability
  
  const eventsForYear = marketEvents.filter((event) => event.year === year);
  
  if (eventsForYear.length === 0) return null;
  
  // Filter based on difficulty
  const difficultyMultiplier = difficultyEventFrequency['medium']; // default
  
  // Check if event triggers
  for (const event of eventsForYear) {
    if (Math.random() < event.probability * difficultyMultiplier) {
      return event;
    }
  }
  
  return null;
}

export function applyMarketEventEffects(
  event: MarketEvent,
  currentPrices: Record<string, number>,
  basePrice?: Record<string, number>
): Record<string, number> {
  const updatedPrices = { ...currentPrices };
  
  Object.entries(event.affectedAssets).forEach(([asset, multiplier]) => {
    if (updatedPrices[asset]) {
      updatedPrices[asset] = updatedPrices[asset] * multiplier;
    }
  });
  
  return updatedPrices;
}
