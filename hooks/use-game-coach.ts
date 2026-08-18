import { useEffect, useRef, useState, useCallback } from 'react';
import { generateGameCoachAdvice, generateGameSummary } from '@/lib/groq-client';

export interface CoachAdvice {
  text: string;
  timestamp: number;
  emoji: string;
}

export interface GameSummary {
  text: string;
  isLoading: boolean;
  error?: string;
}

export function useGameCoach() {
  const [advice, setAdvice] = useState<CoachAdvice | null>(null);
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  
  // AbortController for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Request coach advice without blocking the game
  const requestCoachAdvice = useCallback(
    async (gameState: any) => {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Don't request if already loading
      if (isLoadingAdvice) return;

      setIsLoadingAdvice(true);
      abortControllerRef.current = new AbortController();

      try {
        // This happens in background - doesn't block the game
        const adviceText = await generateGameCoachAdvice(gameState, abortControllerRef.current.signal);
        
        if (adviceText) {
          setAdvice({
            text: adviceText,
            timestamp: Date.now(),
            emoji: getCoachEmoji(gameState),
          });
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Failed to get coach advice:', error);
        }
      } finally {
        setIsLoadingAdvice(false);
      }
    },
    [isLoadingAdvice]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    advice,
    isLoadingAdvice,
    requestCoachAdvice,
    clearAdvice: () => setAdvice(null),
  };
}

export function useGameSummary() {
  const [summary, setSummary] = useState<GameSummary>({
    text: '',
    isLoading: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const generateSummary = useCallback(async (gameStats: any) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setSummary((prev) => ({ ...prev, isLoading: true, error: undefined }));
    abortControllerRef.current = new AbortController();

    try {
      const summaryText = await generateGameSummary(gameStats, abortControllerRef.current.signal);
      setSummary({
        text: summaryText,
        isLoading: false,
      });
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Failed to generate summary:', error);
        setSummary({
          text: '',
          isLoading: false,
          error: 'Failed to generate summary',
        });
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    summary,
    generateSummary,
  };
}

function getCoachEmoji(gameState: any): string {
  const margin = gameState.netWorth - gameState.aiNetWorth;
  const netWorthRatio = gameState.netWorth / (gameState.aiNetWorth || 1);

  if (netWorthRatio > 1.5) return '🚀'; // Crushing it
  if (netWorthRatio > 1.1) return '📈'; // Winning
  if (netWorthRatio > 0.95) return '⚖️'; // Close race
  if (netWorthRatio > 0.8) return '⚠️'; // Falling behind
  return '📉'; // Far behind
}
