"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore, Asset, GameEvent } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { CashChangeNotification } from "@/components/ui/cash-change-notification";
import { toast } from 'react-toastify';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

// Base return rates for investment options - Traditional investments only (4 cards)
const baseInvestmentOptions: { name: string; asset: Asset; baseReturnRate: number }[] = [
  { name: "Savings", asset: "savings", baseReturnRate: 4 },
  { name: "Fixed Deposit", asset: "fixedDeposit", baseReturnRate: 6 },
  { name: "Nifty 50", asset: "nifty50", baseReturnRate: 10 },
  { name: "Gold", asset: "gold", baseReturnRate: 8 },
];

const baseGoldPrice = 5000; // Base price of gold per gram

export default function GamePlay() {
  const {
    currentTime,
    startTime,
    cash,
    netWorth,
    aiNetWorth,
    investments,
    investmentProfits,
    stocks,
    cryptos,
    realEstates,
    stockQuantities,
    cryptoQuantities,
    realEstateQuantities,
    events,
    isGameOver,
    monthlyNetIncome,
    currentEvent,
    showEventModal,
    initializeGame,
    advanceTime,
    invest,
    withdraw,
    buyStock,
    sellStock,
    buyCrypto,
    sellCrypto,
    buyRealEstate,
    sellRealEstate,
    updateNetWorth,
    handleEvent,
    setCurrentEvent,
    setShowEventModal,
    payExpenseWithCash,
    payExpenseWithInvestments,
    gameTime,
    setPaused,
    difficulty,
  } = useGameStore();

  const { user } = useUser();
  const router = useRouter();

  const animationFrameRef = useRef<number>();
  const [amounts, setAmounts] = useState<{ [key in Asset]?: number }>({});
  const [stockBuyQuantities, setStockBuyQuantities] = useState<{ [key: string]: number }>({});
  const [cryptoBuyQuantities, setCryptoBuyQuantities] = useState<{ [key: string]: number }>({});
  const [realEstateBuyQuantities, setRealEstateBuyQuantities] = useState<{ [key: string]: number }>({});
  const [customSellAmounts, setCustomSellAmounts] = useState<{ [key: string]: number }>({});
  const [showCustomAmountFor, setShowCustomAmountFor] = useState<string | null>(null);
  const [goldQuantity, setGoldQuantity] = useState<number>(0);
  const [investmentOptions, setInvestmentOptions] = useState(baseInvestmentOptions);
  const [previousRates, setPreviousRates] = useState<{ [key in Asset]?: number }>({});
  const [currentYear, setCurrentYear] = useState<number>(0);
  const [showCashNotification, setShowCashNotification] = useState(false);
  const [cashChange, setCashChange] = useState(0);
  const [previousCash, setPreviousCash] = useState(cash);
  const [gameStarted, setGameStarted] = useState(false);
  const [showInvestmentSelector, setShowInvestmentSelector] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);

  // Function to save game results for signed-in users
  const saveGameResults = async () => {
    if (!user) return; // Don't save if user is not signed in

    const playerWon = netWorth > aiNetWorth;
    const gameResult = {
      userId: user.id,
      date: new Date().toISOString(),
      playerScore: netWorth,
      aiScore: aiNetWorth,
      result: playerWon ? 'win' : 'loss',
      difficulty: difficulty,
    };

    try {
      // Save to localStorage with user ID as key for now
      // In a real app, this would be saved to a database
      const userResultsKey = `gameResults_${user.id}`;
      const existingResults = localStorage.getItem(userResultsKey);
      const results = existingResults ? JSON.parse(existingResults) : [];
      results.push(gameResult);
      localStorage.setItem(userResultsKey, JSON.stringify(results));
      
      toast.success(`🎯 Game results saved! You ${playerWon ? 'won' : 'lost'} with ₹${formatCurrency(netWorth)} vs AI's ₹${formatCurrency(aiNetWorth)}`);
    } catch (error) {
      console.error('Failed to save game results:', error);
      toast.error('❌ Failed to save game results');
    }
  };

  // Handle game over state
  useEffect(() => {
    if (isGameOver && !showGameOverModal) {
      saveGameResults();
      setShowGameOverModal(true);
    }
  }, [isGameOver, showGameOverModal]);

  useEffect(() => {
    initializeGame();
    setGameStarted(true); // Trigger the starting animation

    let logCounter = 0;
    function gameLoop() {
      // Always call advanceTime - it will handle pause logic internally
      advanceTime();
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []); // Keep empty dependency array

  const progress = Math.min(1, gameTime / (10 * 60 * 1000)); // 10 minutes total
  const year = Math.floor(progress * 10); // 10 years total
  const currentMonth = Math.floor((progress * 10 * 12) % 12); // Current month (0-11)
  
  // Debug logging for time tracking
  useEffect(() => {
    console.log(`🕐 UI Update - GameTime: ${Math.floor(gameTime/1000)}s, Year: ${year}, Month: ${currentMonth}, Modal: ${showEventModal}`);
  }, [gameTime, year, currentMonth, showEventModal]);

  useEffect(() => {
    if (year > currentYear) {
      updateInvestmentRates();
      setCurrentYear(year);
    }
  }, [year, currentYear]);

  // Track cash changes for notifications
  useEffect(() => {
    if (cash > previousCash) {
      const change = cash - previousCash;
      setCashChange(change);
      setShowCashNotification(true);
    }
    setPreviousCash(cash);
  }, [cash, previousCash]);

  // Reset investment selector when modal closes and handle pause state
  useEffect(() => {
    setPaused(showEventModal);
    if (showEventModal) {
      console.log(`🛑 Game PAUSED - Modal opened`);
    } else {
      console.log(`▶️ Game RESUMED - Modal closed`);
    }
    
    if (!showEventModal) {
      setShowInvestmentSelector(false);
    }
  }, [showEventModal, setPaused]);

  const goldReturnRate = investmentOptions.find((option) => option.asset === "gold")?.baseReturnRate || 0;
  const currentGoldRate = baseGoldPrice * Math.pow(1 + goldReturnRate / 100, year);

  const updateInvestmentRates = () => {
    setPreviousRates((prevRates) =>
      investmentOptions.reduce((acc, option) => {
        acc[option.asset] = option.baseReturnRate;
        return acc;
      }, {} as { [key in Asset]?: number })
    );

    setInvestmentOptions((prevOptions) =>
      prevOptions.map((option) => {
        const change = (Math.random() - 0.5) * 0.2; // Random change between -10% and +10%
        return {
          ...option,
          baseReturnRate: Math.max(0, option.baseReturnRate * (1 + change)), // Ensure rate doesn't go negative
        };
      })
    );
  };

  const handleInvest = (asset: Asset, amount: number) => {
    if (amount <= 0 || amount > cash) {
      toast.error("💸 Invalid investment amount or insufficient cash!");
      return;
    }
    invest(asset, amount);
    setAmounts((prev) => ({ ...prev, [asset]: 0 }));
    updateNetWorth();
    toast.success(`🎯 Invested ₹${formatCurrency(amount)} in ${asset}!`);
  };

  const handleWithdraw = (asset: Asset, amount: number) => {
    const totalValue = getTotalValue(asset);
    if (totalValue < amount || amount <= 0) {
      toast.error("❌ Insufficient funds in this investment!");
      return;
    }
    withdraw(asset, amount);
    setAmounts((prev) => ({ ...prev, [asset]: 0 }));
    updateNetWorth();
    toast.success(`💰 Withdrew ₹${formatCurrency(amount)} from ${asset}`);
  };

  const handleGoldInvest = (quantity: number) => {
    const amount = quantity * currentGoldRate;
    handleInvest("gold", amount);
  };

  const handleGoldWithdraw = (quantity: number) => {
    const amount = quantity * currentGoldRate;
    const totalGoldValue = getTotalValue("gold");
    if (totalGoldValue < amount || amount <= 0) {
      toast.error("🥇 Insufficient gold investment!");
      return;
    }
    handleWithdraw("gold", amount);
  };

  const handleExpense = (event: GameEvent) => {
    setCurrentEvent(event);
    setShowEventModal(true);
  };

  const getTotalValue = (asset: Asset) => {
    const principal = investments[asset] || 0;
    const profits = investmentProfits[asset] || 0;
    return principal + profits;
  };

  const getProfitPercentage = (asset: Asset) => {
    const principal = investments[asset] || 0;
    const profits = investmentProfits[asset] || 0;
    if (principal === 0) return 0;
    return (profits / principal) * 100;
  };

  const hasAnyInvestments = () => {
    return Object.values(investments).some(amount => amount > 0) || 
           Object.values(investmentProfits).some(amount => amount > 0);
  };

  const getTotalInvestmentValue = () => {
    const totalPrincipal = Object.values(investments).reduce((sum, amount) => sum + amount, 0);
    const totalProfits = Object.values(investmentProfits).reduce((sum, amount) => sum + amount, 0);
    return totalPrincipal + totalProfits;
  };

  // Stock trading handlers
  const handleStockBuy = (stockSymbol: string, quantity: number) => {
    const stock = stocks[stockSymbol];
    if (!stock || quantity <= 0) {
      toast.error("📈 Invalid stock or quantity!");
      return;
    }
    
    const totalCost = stock.currentPrice * quantity;
    if (totalCost > cash) {
      toast.error("💸 Insufficient cash to buy stocks!");
      return;
    }
    
    buyStock(stockSymbol, quantity);
    setStockBuyQuantities((prev) => ({ ...prev, [stockSymbol]: 0 }));
    toast.success(`🎯 Bought ${quantity} shares of ${stock.name} for ₹${formatCurrency(totalCost)}`);
  };

  const handleStockSell = (stockSymbol: string, quantity: number) => {
    const stock = stocks[stockSymbol];
    if (!stock || quantity <= 0) {
      toast.error("📈 Invalid stock or quantity!");
      return;
    }
    
    const asset = stockSymbol as Asset;
    const totalValue = getTotalValue(asset);
    const currentShares = Math.floor(totalValue / stock.currentPrice); // Approximate shares owned
    
    if (quantity > currentShares) {
      toast.error("❌ You don't own enough shares!");
      return;
    }
    
    sellStock(stockSymbol, quantity);
    setStockBuyQuantities((prev) => ({ ...prev, [stockSymbol]: 0 }));
    
    const saleValue = stock.currentPrice * quantity;
    toast.success(`💰 Sold ${quantity} shares of ${stock.name} for ₹${formatCurrency(saleValue)}`);
  };

  const getOwnedShares = (stockSymbol: string) => {
    return stockQuantities[stockSymbol] || 0;
  };

  // Crypto trading handlers
  const handleCryptoBuy = (cryptoSymbol: string, quantity: number) => {
    const crypto = cryptos[cryptoSymbol];
    if (!crypto || quantity <= 0) {
      toast.error("₿ Invalid crypto or quantity!");
      return;
    }
    
    const totalCost = crypto.currentPrice * quantity;
    if (totalCost > cash) {
      toast.error("💸 Insufficient cash to buy crypto!");
      return;
    }
    
    buyCrypto(cryptoSymbol, quantity);
    setCryptoBuyQuantities((prev) => ({ ...prev, [cryptoSymbol]: 0 }));
    toast.success(`🚀 Bought ${quantity} ${crypto.name} for ₹${formatCurrency(totalCost)}`);
  };

  const handleCryptoSell = (cryptoSymbol: string, quantity: number) => {
    const crypto = cryptos[cryptoSymbol];
    if (!crypto || quantity <= 0) {
      toast.error("₿ Invalid crypto or quantity!");
      return;
    }
    
    const asset = cryptoSymbol as Asset;
    const totalValue = getTotalValue(asset);
    const currentCoins = Math.floor(totalValue / crypto.currentPrice); // Approximate coins owned
    
    if (quantity > currentCoins) {
      toast.error("❌ You don't own enough crypto!");
      return;
    }
    
    sellCrypto(cryptoSymbol, quantity);
    setCryptoBuyQuantities((prev) => ({ ...prev, [cryptoSymbol]: 0 }));
    
    const saleValue = crypto.currentPrice * quantity;
    toast.success(`💰 Sold ${quantity} ${crypto.name} for ₹${formatCurrency(saleValue)}`);
  };

  const getOwnedCoins = (cryptoSymbol: string) => {
    return cryptoQuantities[cryptoSymbol] || 0;
  };

  // Real Estate trading handlers
  const handleRealEstateBuy = (realEstateSymbol: string, quantity: number) => {
    const realEstate = realEstates[realEstateSymbol];
    if (!realEstate || quantity <= 0) {
      toast.error("🏠 Invalid real estate property or quantity!");
      return;
    }
    
    const totalCost = realEstate.currentPrice * quantity;
    if (totalCost > cash) {
      toast.error("💸 Insufficient cash to buy real estate!");
      return;
    }
    
    buyRealEstate(realEstateSymbol, quantity);
    setRealEstateBuyQuantities((prev) => ({ ...prev, [realEstateSymbol]: 0 }));
    toast.success(`🏡 Bought ${quantity} ${realEstate.name} for ₹${formatCurrency(totalCost)}`);
  };

  const handleRealEstateSell = (realEstateSymbol: string, quantity: number) => {
    const realEstate = realEstates[realEstateSymbol];
    if (!realEstate || quantity <= 0) {
      toast.error("🏠 Invalid real estate property or quantity!");
      return;
    }
    
    const asset = realEstateSymbol as Asset;
    const totalValue = getTotalValue(asset);
    const currentProperties = Math.floor(totalValue / realEstate.currentPrice); // Approximate properties owned
    
    if (quantity > currentProperties) {
      toast.error("❌ You don't own enough properties!");
      return;
    }
    
    sellRealEstate(realEstateSymbol, quantity);
    setRealEstateBuyQuantities((prev) => ({ ...prev, [realEstateSymbol]: 0 }));
    
    const saleValue = realEstate.currentPrice * quantity;
    toast.success(`💰 Sold ${quantity} ${realEstate.name} for ₹${formatCurrency(saleValue)}`);
  };

  const getOwnedProperties = (realEstateSymbol: string) => {
    return realEstateQuantities[realEstateSymbol] || 0;
  };

  const handleSellInvestment = (asset: Asset, amount: number) => {
    const totalValue = getTotalValue(asset);
    if (amount > totalValue || amount <= 0) {
      toast.error("⚠️ Invalid amount to sell!");
      return;
    }
    
    // Withdraw the investment
    withdraw(asset, amount);
    
    // Check if we've covered the expense
    const expenseCost = currentEvent?.cost || 0;
    if (cash + amount >= expenseCost) {
      // Hide investment selector and auto-pay the expense
      setShowInvestmentSelector(false);
      setTimeout(() => {
        if (currentEvent) {
          payExpenseWithCash(currentEvent);
        }
      }, 100);
    }
  };

  return (
    <div className="bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10 text-foreground font-poppins min-h-screen">
      <header className="p-6 bg-gradient-to-r from-background/90 to-background/95 backdrop-blur-xl border-b border-border/50 flex flex-col items-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20"></div>
        </div>
        
        <h1 className="text-5xl font-orbitron font-bold relative z-10 mb-4 tracking-wider bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">InveSim</h1>
        
        {/* Enhanced Year Progress Section */}
        <div className="relative z-10 w-full max-w-4xl">
          {/* Year Display with Status and Month */}
          <div className="flex justify-between items-center mb-3">
            <div className="text-2xl font-orbitron font-semibold flex items-center">
              <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Year {year}
              </span>
              <span className="text-muted-foreground mx-2">/</span>
              <span className="text-muted-foreground">10</span>
              
              {/* Current Month Display */}
              <span className="ml-4 text-lg text-primary font-jetbrains font-medium">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][currentMonth]}
              </span>
              
              {showEventModal && (
                <span className="ml-3 text-yellow-500 dark:text-yellow-400 animate-pulse flex items-center font-poppins">
                  ⏸️ <span className="ml-1 text-sm font-medium">PAUSED</span>
                </span>
              )}
            </div>
            
            {/* Time remaining */}
            <div className="text-sm font-jetbrains text-gray-300 font-medium">
              {10 - year} years remaining
            </div>
          </div>
          
          {/* Enhanced Progress Bar */}
          <div className="relative">
            {/* Background track with gradient */}
            <div className="w-full bg-gradient-to-r from-gray-800 to-gray-700 rounded-full h-4 shadow-inner">
              {/* Year markers for 10 years */}
              <div className="absolute inset-0 flex justify-between items-center px-1">
                {Array.from({ length: 11 }, (_, i) => i * 2).map((yearMark) => (
                  <div
                    key={yearMark}
                    className="w-0.5 h-3 bg-gray-500 opacity-60"
                    style={{ marginLeft: yearMark === 0 ? 0 : 'auto' }}
                  />
                ))}
              </div>
              
              {/* Progress fill with performance-based colors */}
              <div
                className={`h-4 rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${
                  netWorth > aiNetWorth 
                    ? 'bg-gradient-to-r from-green-400 via-emerald-500 to-green-600' // Winning
                    : netWorth > aiNetWorth * 0.8 
                    ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600' // Close competition
                    : 'bg-gradient-to-r from-red-400 via-pink-500 to-red-600' // Losing
                }`}
                style={{ width: `${Math.min(100, progress * 100)}%` }}
              >
                {/* Animated shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                
                {/* Performance glow */}
                <div className={`absolute inset-0 rounded-full blur-sm opacity-50 ${
                  netWorth > aiNetWorth 
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                    : netWorth > aiNetWorth * 0.8 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                    : 'bg-gradient-to-r from-red-400 to-pink-500'
                }`}></div>
              </div>
              
              {/* Current position indicator with performance color */}
              <div
                className="absolute top-0 h-4 w-1 bg-white shadow-lg transition-all duration-1000"
                style={{ left: `${Math.min(100, progress * 100)}%`, transform: 'translateX(-50%)' }}
              >
                {/* Pulsing dot with performance color */}
                <div className={`absolute -top-2 -left-1 w-3 h-3 rounded-full animate-ping ${
                  netWorth > aiNetWorth ? 'bg-green-400' : netWorth > aiNetWorth * 0.8 ? 'bg-yellow-400' : 'bg-red-400'
                }`}></div>
                <div className={`absolute -top-2 -left-1 w-3 h-3 rounded-full ${
                  netWorth > aiNetWorth ? 'bg-green-300' : netWorth > aiNetWorth * 0.8 ? 'bg-yellow-300' : 'bg-red-300'
                }`}></div>
              </div>
            </div>
            
            {/* Year labels with milestones for 10 years */}
            <div className="flex justify-between text-xs text-gray-400 mt-9">
              <div className="flex flex-col items-center">
                <span className="font-jetbrains">Year 0</span>
                <span className="text-blue-400 font-poppins font-medium">START</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-jetbrains">Year 2</span>
                {year >= 2 && <span className="text-yellow-400 font-poppins font-medium">EARLY</span>}
              </div>
              <div className="flex flex-col items-center">
                <span className="font-jetbrains">Year 4</span>
                {year >= 4 && <span className="text-orange-400 font-poppins font-medium">GROWTH</span>}
              </div>
              <div className="flex flex-col items-center">
                <span className="font-jetbrains">Year 6</span>
                {year >= 6 && <span className="text-purple-400 font-poppins font-medium">ADVANCED</span>}
              </div>
              <div className="flex flex-col items-center">
                <span className="font-jetbrains">Year 8</span>
                {year >= 8 && <span className="text-red-400 font-poppins font-medium">SPRINT</span>}
              </div>
              <div className="flex flex-col items-center">
                <span className="font-jetbrains">Year 10</span>
                {year >= 10 && <span className="text-green-400 font-poppins font-medium">FINISH</span>}
              </div>
            </div>
          </div>
          
          {/* Progress Stats with Performance Indicators */}
          <div className="flex justify-between items-center mt-3 text-sm">
            <div className="text-gray-300 flex items-center">
              <span className="font-semibold">{Math.round(progress * 100)}%</span> 
              <span className="ml-1">Complete</span>
              {year >= 2 && (
                <span className={`ml-3 px-2 py-1 rounded-full text-xs font-bold transition-all duration-500 ${
                  netWorth > aiNetWorth * 1.5
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black animate-bounce' // Dominating
                    : netWorth > aiNetWorth 
                    ? 'bg-green-500 text-white' // Winning
                    : netWorth > aiNetWorth * 0.8 
                    ? 'bg-yellow-500 text-black'  // Close
                    : 'bg-red-500 text-white' // Behind
                }`}>
                  {netWorth > aiNetWorth * 1.5 ? '👑 DOMINATING' 
                   : netWorth > aiNetWorth ? '🏆 WINNING' 
                   : netWorth > aiNetWorth * 0.8 ? '⚡ CLOSE' 
                   : '📉 BEHIND'}
                </span>
              )}
            </div>
            <div className="text-gray-300 flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 animate-pulse ${
                showEventModal ? 'bg-yellow-400' : 'bg-green-400'
              }`}></div>
              {showEventModal ? 'Event Active' : 'Game in Progress'}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-[300px,1fr,300px] min-h-[calc(100vh-120px)]">
        {/* Pause overlay */}
        {showEventModal && (
          <div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-10 pointer-events-none">
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 dark:bg-yellow-500 text-black px-4 py-2 rounded-lg font-bebas text-lg shadow-lg">
              ⏸️ GAME PAUSED - Handle the expense to continue
            </div>
          </div>
        )}
        
        {/* Left Sidebar - Game Info */}
        <div className="bg-card/50 backdrop-blur-sm p-6 border-r border-border/50">
          <div className="space-y-6">
            <div>
              <div className="text-2xl font-orbitron font-bold text-foreground">Year {year} of 10</div>
              <div className="text-lg font-jetbrains text-muted-foreground font-medium">
                {['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'][currentMonth]}
              </div>
              
              {/* Month Progress Bar */}
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Jan</span>
                  <span>Jun</span>
                  <span>Dec</span>
                </div>
                <div className="w-full bg-gray-400 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${(currentMonth / 11) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="space-y-2 relative">
              <h2 className="font-orbitron font-semibold tracking-wide">POCKET CASH</h2>
              <div className="text-2xl font-jetbrains font-bold">
                <AnimatedCounter 
                  value={cash} 
                  duration={2000} 
                  prefix="₹" 
                  className="text-green-400"
                  isCurrency={true}
                  startFromZero={gameStarted}
                />
              </div>
              <CashChangeNotification 
                amount={cashChange}
                show={showCashNotification}
                onComplete={() => setShowCashNotification(false)}
              />
            </div>

            <div className="space-y-2">
              <h2 className="font-orbitron font-semibold tracking-wide">NET WORTH</h2>
              <div className="text-2xl font-jetbrains font-bold">
                <AnimatedCounter 
                  value={netWorth} 
                  duration={2000} 
                  prefix="₹" 
                  className="text-blue-400"
                  isCurrency={true}
                  startFromZero={gameStarted}
                />
              </div>
            </div>

            {/* Monthly Income Display with Warning */}
            <div className="space-y-2">
              <h2 className="font-orbitron font-semibold tracking-wide">MONTHLY INCOME</h2>
              <div className={`text-lg font-jetbrains font-bold ${monthlyNetIncome < 1000 ? 'text-red-400' : 'text-green-400'}`}>
                <AnimatedCounter 
                  value={monthlyNetIncome} 
                  duration={800} 
                  prefix="₹" 
                  isCurrency={true}
                />
              </div>
              {monthlyNetIncome < 1000 && (
                <div className="text-xs text-red-400 animate-pulse font-poppins">
                  ⚠️ Low monthly income! Invest wisely.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h2 className="font-orbitron font-semibold tracking-wide">AI COMPETITOR</h2>
              <div className="text-xl font-jetbrains font-bold">
                <AnimatedCounter 
                  value={aiNetWorth} 
                  duration={2000} 
                  prefix="₹" 
                  className="text-red-400"
                  isCurrency={true}
                  startFromZero={gameStarted}
                />
              </div>
              <div className="text-xs text-muted-foreground font-poppins">
                {netWorth > aiNetWorth ? "You're winning! 🎉" : "AI is ahead 🤖"}
              </div>
              
              {/* Progress comparison bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${Math.min(100, Math.max(0, (netWorth / (netWorth + aiNetWorth)) * 100))}%` 
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>You</span>
                <span>AI</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 relative bg-gradient-to-br from-background/95 to-background min-h-full backdrop-blur-sm">
          {/* Investment Section */}
          <div className="mt-8 grid grid-cols-4 gap-4">
            {investmentOptions.map((option) => {
              const previousRate = previousRates[option.asset] || option.baseReturnRate;
              const rateColor = year === 0 || option.baseReturnRate > previousRate ? "text-green-500" : "text-red-500";

              return (                  <motion.div
                    key={option.asset}
                    className="bg-card/60 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-border/50 hover:border-primary/50 transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <h3 className="text-base font-poppins font-bold text-foreground">{option.name}</h3>
                    <p className={`text-xs font-jetbrains ${rateColor}`}>{option.baseReturnRate.toFixed(2)}% annual return</p>
                    <p className="mt-2 text-xs font-poppins text-muted-foreground">Total Invested: ₹{formatCurrency(getTotalValue(option.asset))}</p>                    {option.asset === "gold" ? (
                      <div className="space-y-2">
                        <div className="text-xs font-jetbrains font-semibold text-black mt-2">₹{formatCurrency(currentGoldRate)} per gram</div>
                      <input
                        type="number"
                        className="w-full p-1 border-2 border-black rounded mt-2 bg-white text-black text-sm"
                        placeholder="Qty (grams)"
                        value={goldQuantity}
                        onChange={(e) => setGoldQuantity(Number(e.target.value))}
                      />
                      <div className="flex space-x-1 mt-2">
                        <button
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs transition duration-300 border-2 border-black"
                          onClick={() => handleGoldInvest(goldQuantity)}
                        >
                          Buy Gold
                        </button>
                        <button
                          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition duration-300 border-2 border-black"
                          onClick={() => {
                            const maxGrams = Math.floor(cash / currentGoldRate);
                            setGoldQuantity(maxGrams);
                          }}
                          title="Set maximum gold quantity in input field"
                        >
                          MAX
                        </button>
                      </div>
                      <div className="flex space-x-1 mt-1">
                        <button
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition duration-300 border-2 border-black"
                          onClick={() => handleGoldWithdraw(goldQuantity)}
                        >
                          Sell Gold
                        </button>                          <button
                            className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition duration-300 border-2 border-black"
                            onClick={() => {
                              const totalGold = getTotalValue(option.asset) / currentGoldRate;
                              setGoldQuantity(Math.floor(totalGold));
                            }}
                            title="Set all owned gold quantity in input field"
                          >
                            ALL
                          </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        type="number"
                        className="w-full p-1 border-2 border-black rounded mt-2 bg-white text-black text-sm"
                        placeholder="Amount"
                        step="1000"
                        value={amounts[option.asset] || ""}
                        onChange={(e) =>
                          setAmounts((prev) => ({ ...prev, [option.asset]: Number(e.target.value) }))
                        }
                      />

                      <div className="flex space-x-1 mt-2">
                        <button
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs transition duration-300 border-2 border-black"
                          onClick={() => handleInvest(option.asset, amounts[option.asset] || 0)}
                        >
                          Invest
                        </button>
                        <button
                          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition duration-300 border-2 border-black"
                          onClick={() => setAmounts((prev) => ({ ...prev, [option.asset]: cash }))}
                          title="Set maximum investment amount in input field"
                        >
                          MAX
                        </button>
                      </div>

                      <div className="flex space-x-1 mt-1">
                        <button
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition duration-300 border-2 border-black"
                          onClick={() => handleWithdraw(option.asset, amounts[option.asset] || 0)}
                        >
                          Withdraw
                        </button>
                        <button
                          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition duration-300 border-2 border-black"
                          onClick={() => setAmounts((prev) => ({ ...prev, [option.asset]: getTotalValue(option.asset) }))}
                          title="Set total investment value in input field"
                        >
                          ALL
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
          
          {/* Stock Trading Section */}
          <div className="mt-12">
            <h2 className="text-3xl font-orbitron font-bold mb-4 text-center text-white tracking-wider">STOCK MARKET</h2>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(stocks).map(([symbol, stock]) => {
                const ownedShares = getOwnedShares(symbol);
                const stockValue = getTotalValue(symbol as Asset);
                const profitPercentage = getProfitPercentage(symbol as Asset);
                
                return (
                  <motion.div
                    key={symbol}
                    className="bg-white p-4 rounded-lg shadow-lg border-4 border-black"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="text-center">
                      <h3 className="text-lg font-poppins font-bold text-black">{stock.symbol}</h3>
                      <p className="text-xs text-gray-600 mb-2 font-poppins">{stock.name}</p>
                      
                      <div className="space-y-1">
                        <div className="text-xl font-jetbrains font-bold text-black">
                          ₹{stock.currentPrice.toFixed(2)}
                        </div>
                        <div className={`text-sm font-semibold ${stock.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {stock.change24h >= 0 ? '↗' : '↘'} {stock.change24h.toFixed(2)}%
                        </div>
                        
                        {ownedShares > 0 && (
                          <div className="text-xs text-blue-600 mt-2">
                            Owned: {ownedShares} shares
                            <div className="text-xs">
                              Value: ₹{formatCurrency(stockValue)}
                            </div>
                            {profitPercentage !== 0 && (
                              <div className={`text-xs ${profitPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3 space-y-2">
                        <input
                          type="number"
                          className="w-full p-1 border-2 border-black rounded text-black text-sm"
                          placeholder="Qty"
                          min="1"
                          value={stockBuyQuantities[symbol] || ""}
                          onChange={(e) =>
                            setStockBuyQuantities((prev) => ({ ...prev, [symbol]: Number(e.target.value) }))
                          }
                        />
                        
                        <div className="flex space-x-1">
                          <button
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs transition duration-300 border-2 border-black"
                            onClick={() => handleStockBuy(symbol, stockBuyQuantities[symbol] || 0)}
                          >
                            BUY
                          </button>
                          <button
                            className="bg-green-600 hover:bg-green-700 text-white px-1 py-1 rounded text-xs transition duration-300 border-2 border-black"
                            onClick={() => {
                              const maxShares = Math.floor(cash / stock.currentPrice);
                              setStockBuyQuantities((prev) => ({ ...prev, [symbol]: maxShares }));
                            }}
                            title="Set maximum shares quantity in input field"
                          >
                            MAX
                          </button>
                        </div>
                        <div className="flex space-x-1 mt-1">
                          <button
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition duration-300 border-2 border-black"
                            onClick={() => handleStockSell(symbol, stockBuyQuantities[symbol] || 0)}
                            disabled={ownedShares === 0}
                          >
                            SELL
                          </button>
                          <button
                            className="bg-red-600 hover:bg-red-700 text-white px-1 py-1 rounded text-xs transition duration-300 border-2 border-black"
                            onClick={() => {
                              setStockBuyQuantities((prev) => ({ ...prev, [symbol]: ownedShares }));
                            }}
                            disabled={ownedShares === 0}
                            title="Set all owned shares quantity in input field"
                          >
                            ALL
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
          
          {/* Crypto Trading Section */}
          <div className="mt-12">
            <h2 className="text-3xl font-orbitron font-bold mb-4 text-center text-white tracking-wider">CRYPTO MARKET</h2>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(cryptos).map(([symbol, crypto]) => {
                const ownedCoins = getOwnedCoins(symbol);
                const cryptoValue = getTotalValue(symbol as Asset);
                const profitPercentage = getProfitPercentage(symbol as Asset);
                
                return (
                  <motion.div
                    key={symbol}
                    className="bg-gradient-to-br from-purple-100 to-blue-100 p-4 rounded-lg shadow-lg border-4 border-purple-800"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="text-center">
                      <h3 className="text-lg font-poppins font-bold text-purple-800">{crypto.symbol}</h3>
                      <p className="text-xs text-gray-700 mb-2 font-poppins">{crypto.name}</p>
                      
                      <div className="space-y-1">
                        <div className="text-xl font-jetbrains font-bold text-purple-800">
                          ₹{crypto.currentPrice.toFixed(2)}
                        </div>
                        <div className={`text-sm font-semibold ${crypto.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {crypto.change24h >= 0 ? '🚀' : '📉'} {crypto.change24h.toFixed(2)}%
                        </div>
                        
                        {ownedCoins > 0 && (
                          <div className="text-xs text-purple-700 mt-2">
                            Owned: {ownedCoins} coins
                            <div className="text-xs">
                              Value: ₹{formatCurrency(cryptoValue)}
                            </div>
                            {profitPercentage !== 0 && (
                              <div className={`text-xs ${profitPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3 space-y-2">
                        <input
                          type="number"
                          className="w-full p-1 border-2 border-purple-800 rounded text-purple-800 text-sm"
                          placeholder="Qty"
                          min="0.1"
                          step="0.1"
                          value={cryptoBuyQuantities[symbol] || ""}
                          onChange={(e) =>
                            setCryptoBuyQuantities((prev) => ({ ...prev, [symbol]: Number(e.target.value) }))
                          }
                        />
                        
                        <div className="flex space-x-1">
                          <button
                            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-2 py-1 rounded text-xs transition duration-300 border-2 border-green-800"
                            onClick={() => handleCryptoBuy(symbol, cryptoBuyQuantities[symbol] || 0)}
                          >
                            BUY
                          </button>
                          <button
                            className="bg-green-600 hover:bg-green-700 text-white px-1 py-1 rounded text-xs transition duration-300 border-2 border-green-800"
                            onClick={() => {
                              const maxCoins = Math.floor((cash / crypto.currentPrice) * 10) / 10; // Round to 1 decimal
                              setCryptoBuyQuantities((prev) => ({ ...prev, [symbol]: maxCoins }));
                            }}
                            title="Set maximum coins quantity in input field"
                          >
                            MAX
                          </button>
                        </div>
                        <div className="flex space-x-1 mt-1">
                          <button
                            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-2 py-1 rounded text-xs transition duration-300 border-2 border-red-800"
                            onClick={() => handleCryptoSell(symbol, cryptoBuyQuantities[symbol] || 0)}
                            disabled={ownedCoins === 0}
                          >
                            SELL
                          </button>
                          <button
                            className="bg-red-600 hover:bg-red-700 text-white px-1 py-1 rounded text-xs transition duration-300 border-2 border-red-800"
                            onClick={() => {
                              setCryptoBuyQuantities((prev) => ({ ...prev, [symbol]: ownedCoins }));
                            }}
                            disabled={ownedCoins === 0}
                            title="Set all owned coins quantity in input field"
                          >
                            ALL
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
          
          {/* Real Estate Market Section */}
          <div className="mt-12">
            <h2 className="text-3xl font-orbitron font-bold mb-4 text-center text-white tracking-wider">REAL ESTATE MARKET</h2>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(realEstates).map(([symbol, realEstate]) => {
                const ownedProperties = getOwnedProperties(symbol);
                const realEstateValue = getTotalValue(symbol as Asset);
                const profitPercentage = getProfitPercentage(symbol as Asset);
                
                return (
                  <motion.div
                    key={symbol}
                    className="bg-gradient-to-br from-green-100 to-emerald-100 p-4 rounded-lg shadow-lg border-4 border-green-800"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="text-center">
                      <h3 className="text-lg font-poppins font-bold text-green-800">{realEstate.symbol}</h3>
                      <p className="text-xs text-gray-700 mb-2 font-poppins">{realEstate.name}</p>
                      
                      <div className="space-y-1">
                        <div className="text-xl font-jetbrains font-bold text-green-800">
                          ₹{(realEstate.currentPrice / 100000).toFixed(1)}L
                        </div>
                        <div className={`text-sm font-semibold ${realEstate.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {realEstate.change24h >= 0 ? '🏗️' : '📉'} {realEstate.change24h.toFixed(2)}%
                        </div>
                        
                        {ownedProperties > 0 && (
                          <div className="text-xs text-green-700 mt-2">
                            Owned: {ownedProperties} properties
                            <div className="text-xs">
                              Value: ₹{formatCurrency(realEstateValue)}
                            </div>
                            {profitPercentage !== 0 && (
                              <div className={`text-xs ${profitPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3 space-y-2">
                        <input
                          type="number"
                          className="w-full p-1 border-2 border-green-800 rounded text-green-800 text-sm"
                          placeholder="Qty"
                          min="1"
                          value={realEstateBuyQuantities[symbol] || ""}
                          onChange={(e) =>
                            setRealEstateBuyQuantities((prev) => ({ ...prev, [symbol]: Number(e.target.value) }))
                          }
                        />
                        
                        <div className="flex space-x-1">
                          <button
                            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-2 py-1 rounded text-xs transition duration-300 border-2 border-green-800"
                            onClick={() => handleRealEstateBuy(symbol, realEstateBuyQuantities[symbol] || 0)}
                          >
                            BUY
                          </button>
                          <button
                            className="bg-green-600 hover:bg-green-700 text-white px-1 py-1 rounded text-xs transition duration-300 border-2 border-green-800"
                            onClick={() => {
                              const maxProperties = Math.floor(cash / realEstate.currentPrice);
                              setRealEstateBuyQuantities((prev) => ({ ...prev, [symbol]: maxProperties }));
                            }}
                            title="Set maximum properties quantity in input field"
                          >
                            MAX
                          </button>
                        </div>
                        <div className="flex space-x-1 mt-1">
                          <button
                            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-2 py-1 rounded text-xs transition duration-300 border-2 border-red-800"
                            onClick={() => handleRealEstateSell(symbol, realEstateBuyQuantities[symbol] || 0)}
                            disabled={ownedProperties === 0}
                          >
                            SELL
                          </button>
                          <button
                            className="bg-red-600 hover:bg-red-700 text-white px-1 py-1 rounded text-xs transition duration-300 border-2 border-red-800"
                            onClick={() => {
                              setRealEstateBuyQuantities((prev) => ({ ...prev, [symbol]: ownedProperties }));
                            }}
                            disabled={ownedProperties === 0}
                            title="Set all owned properties quantity in input field"
                          >
                            ALL
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Investments */}
        <div className="bg-card/50 backdrop-blur-sm p-6 border-l border-border/50">
          <h2 className="text-2xl font-orbitron font-bold tracking-wide text-foreground">Your Investments</h2>
          <div className="space-y-4">
            {investmentOptions.map((option) => {
              const principal = investments[option.asset] || 0;
              const profits = investmentProfits[option.asset] || 0;
              const totalValue = getTotalValue(option.asset);
              const profitPercentage = getProfitPercentage(option.asset);
              const profitColor = profits >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

              return (
                <div key={option.asset} className="bg-card/60 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-border/50 hover:border-primary/30 transition-all duration-300">
                  <h3 className="text-xl font-poppins font-semibold text-foreground">{option.name}</h3>
                  <div className="space-y-1 text-sm font-poppins">
                    <p className="text-blue-600 dark:text-blue-400">Principal: ₹{formatCurrency(principal)}</p>
                    <p className={profitColor}>
                      Profits: ₹{formatCurrency(profits)} 
                      {principal > 0 && (
                        <span className="text-xs ml-1">
                          ({profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}%)
                        </span>
                      )}
                    </p>
                    <p className="font-semibold border-t border-gray-300 pt-1">
                      Total Value: ₹{formatCurrency(totalValue)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Stock Holdings */}
          <div className="mt-6">
            <h3 className="text-xl font-orbitron font-semibold mb-3 tracking-wide">Stock Holdings</h3>
            <div className="space-y-3">
              {(() => {
                const ownedStocks = Object.entries(stocks).filter(([symbol, stock]) => {
                  const totalValue = getTotalValue(symbol as Asset);
                  return totalValue > 0;
                });
                
                if (ownedStocks.length === 0) {
                  return (
                    <div className="bg-gray-100 p-4 rounded-lg shadow-lg border-4 border-gray-400 text-center">
                      <div className="text-gray-500 mb-2 text-2xl">📈</div>
                      <h4 className="text-sm font-poppins font-semibold text-gray-600 mb-1">No Stock Investments</h4>
                      <p className="text-xs text-gray-500 font-poppins">Start investing in stocks to see your holdings here!</p>
                    </div>
                  );
                }
                
                return ownedStocks.map(([symbol, stock]) => {
                  const principal = investments[symbol as Asset] || 0;
                  const profits = investmentProfits[symbol as Asset] || 0;
                  const totalValue = getTotalValue(symbol as Asset);
                  const profitPercentage = getProfitPercentage(symbol as Asset);
                  const profitColor = profits >= 0 ? "text-green-600" : "text-red-600";
                  const ownedShares = getOwnedShares(symbol);
                
                  return (
                    <div key={symbol} className="bg-white p-3 rounded-lg shadow-lg border-4 border-black">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-sm font-bebas">{stock.symbol}</h4>
                          <p className="text-xs text-gray-600">{ownedShares} shares</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            ₹{stock.currentPrice.toFixed(2)}
                          </div>
                          <div className={`text-xs ${stock.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stock.change24h >= 0 ? '↗' : '↘'} {stock.change24h.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-sm mt-2">
                        <p className="text-blue-600">Principal: ₹{formatCurrency(principal)}</p>
                        <p className={profitColor}>
                          Profits: ₹{formatCurrency(profits)} 
                          {principal > 0 && (
                            <span className="text-xs ml-1">
                              ({profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}%)
                            </span>
                          )}
                        </p>
                        <p className="font-semibold border-t border-gray-300 pt-1">
                          Total Value: ₹{formatCurrency(totalValue)}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          
          {/* Crypto Holdings */}
          <div className="mt-6">
            <h3 className="text-xl font-orbitron font-semibold mb-3 tracking-wide">Crypto Holdings</h3>
            <div className="space-y-3">
              {(() => {
                const ownedCryptos = Object.entries(cryptos).filter(([symbol, crypto]) => {
                  const totalValue = getTotalValue(symbol as Asset);
                  return totalValue > 0;
                });
                
                if (ownedCryptos.length === 0) {
                  return (
                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-lg shadow-lg border-4 border-purple-400 text-center">
                      <div className="text-purple-500 mb-2 text-2xl">₿</div>
                      <h4 className="text-sm font-poppins font-semibold text-purple-600 mb-1">No Crypto Investments</h4>
                      <p className="text-xs text-purple-500 font-poppins">Start investing in cryptocurrency to see your holdings here!</p>
                    </div>
                  );
                }
                
                return ownedCryptos.map(([symbol, crypto]) => {
                  const principal = investments[symbol as Asset] || 0;
                  const profits = investmentProfits[symbol as Asset] || 0;
                  const totalValue = getTotalValue(symbol as Asset);
                  const profitPercentage = getProfitPercentage(symbol as Asset);
                  const profitColor = profits >= 0 ? "text-green-600" : "text-red-600";
                  const ownedCoins = getOwnedCoins(symbol);
                
                  return (
                    <div key={symbol} className="bg-gradient-to-br from-purple-50 to-blue-50 p-3 rounded-lg shadow-lg border-4 border-purple-800">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-sm font-bebas text-purple-800">{crypto.symbol}</h4>
                          <p className="text-xs text-purple-600">{ownedCoins} coins</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-purple-800">
                            ₹{crypto.currentPrice.toFixed(2)}
                          </div>
                          <div className={`text-xs ${crypto.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {crypto.change24h >= 0 ? '🚀' : '📉'} {crypto.change24h.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-sm mt-2">
                        <p className="text-blue-600">Principal: ₹{formatCurrency(principal)}</p>
                        <p className={profitColor}>
                          Profits: ₹{formatCurrency(profits)} 
                          {principal > 0 && (
                            <span className="text-xs ml-1">
                              ({profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}%)
                            </span>
                          )}
                        </p>
                        <p className="font-semibold border-t border-purple-300 pt-1">
                          Total Value: ₹{formatCurrency(totalValue)}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          
          {/* Real Estate Holdings */}
          <div className="mt-6">
            <h3 className="text-xl font-orbitron font-semibold mb-3 tracking-wide">Real Estate Holdings</h3>
            <div className="space-y-3">
              {(() => {
                const ownedRealEstates = Object.entries(realEstates).filter(([symbol, realEstate]) => {
                  const totalValue = getTotalValue(symbol as Asset);
                  return totalValue > 0;
                });
                
                if (ownedRealEstates.length === 0) {
                  return (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg shadow-lg border-4 border-green-400 text-center">
                      <div className="text-green-500 mb-2 text-2xl">🏠</div>
                      <h4 className="text-sm font-poppins font-semibold text-green-600 mb-1">No Real Estate Investments</h4>
                      <p className="text-xs text-green-500 font-poppins">Start investing in real estate to see your holdings here!</p>
                    </div>
                  );
                }
                
                return ownedRealEstates.map(([symbol, realEstate]) => {
                  const principal = investments[symbol as Asset] || 0;
                  const profits = investmentProfits[symbol as Asset] || 0;
                  const totalValue = getTotalValue(symbol as Asset);
                  const profitPercentage = getProfitPercentage(symbol as Asset);
                  const profitColor = profits >= 0 ? "text-green-600" : "text-red-600";
                  const ownedProperties = getOwnedProperties(symbol);
                
                  return (
                    <div key={symbol} className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg shadow-lg border-4 border-green-800">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-sm font-bebas text-green-800">{realEstate.symbol}</h4>
                          <p className="text-xs text-green-600">{ownedProperties} properties</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-800">
                            ₹{(realEstate.currentPrice / 100000).toFixed(1)}L
                          </div>
                          <div className={`text-xs ${realEstate.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {realEstate.change24h >= 0 ? '🏗️' : '📉'} {realEstate.change24h.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-sm mt-2">
                        <p className="text-blue-600">Principal: ₹{formatCurrency(principal)}</p>
                        <p className={profitColor}>
                          Profits: ₹{formatCurrency(profits)} 
                          {principal > 0 && (
                            <span className="text-xs ml-1">
                              ({profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}%)
                            </span>
                          )}
                        </p>
                        <p className="font-semibold border-t border-green-300 pt-1">
                          Total Value: ₹{formatCurrency(totalValue)}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal - Handles both Income and Expense Events */}
      <AnimatePresence>
        {showEventModal && currentEvent && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className={`bg-white p-6 rounded-lg shadow-lg max-w-md mx-4 ${
              currentEvent.type === 'income' ? 'border-2 border-green-400' : 'border-2 border-red-400'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">
                  {currentEvent.type === 'income' ? '🎉' : '💸'}
                </span>
                <h2 className="text-xl font-poppins font-bold">{currentEvent.title}</h2>
              </div>
              <p className="mt-2 font-poppins">{currentEvent.description}</p>
              <p className={`mt-2 font-semibold font-jetbrains ${
                currentEvent.type === 'income' ? 'text-green-600' : 'text-red-600'
              }`}>
                {currentEvent.type === 'income' ? 'Amount Received:' : 'Cost:'} {currentEvent.type === 'income' ? '+' : ''}₹{formatCurrency(currentEvent.cost)}
              </p>
              
              {/* For Income Events - Just show acknowledgment */}
              {currentEvent.type === 'income' && (
                <div className="mt-4">
                  <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
                    <p className="text-sm text-green-700">
                      💰 Your cash has been increased by ₹{formatCurrency(currentEvent.cost)}!
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      New cash balance: ₹{formatCurrency(cash)}
                    </p>
                  </div>
                  <button
                    className="w-full px-4 py-2 rounded bg-green-500 hover:bg-green-600 text-white"
                    onClick={() => {
                      setShowEventModal(false);
                      setCurrentEvent(null);
                    }}
                  >
                    🎉 Awesome! Continue Playing
                  </button>
                </div>
              )}
              
              {/* For Expense Events - Show payment options */}
              {currentEvent.type === 'expense' && (
                <>
                  {/* Show investment value if player has investments */}
                  {hasAnyInvestments() && (
                    <p className="mt-1 text-sm text-gray-600">
                      Total Investment Value: ₹{formatCurrency(getTotalInvestmentValue())}
                    </p>
                  )}
                  
                  <div className="mt-4 space-y-2">
                    <button
                      className={`w-full px-4 py-2 rounded ${
                        cash >= (currentEvent?.cost || 0)
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                      onClick={() => currentEvent && payExpenseWithCash(currentEvent)}
                      title={cash < (currentEvent?.cost || 0) ? 'You don\'t have enough cash, but you can still try to pay' : ''}
                    >
                      💰 Pay with Cash (₹{formatCurrency(cash)} available)
                      {cash < (currentEvent?.cost || 0) && (
                        <span className="block text-xs">⚠️ Insufficient cash - will go negative</span>
                      )}
                    </button>
                    
                    {hasAnyInvestments() && !showInvestmentSelector && (
                      <button
                        className="w-full px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white"
                        onClick={() => setShowInvestmentSelector(true)}
                      >
                        📈 Choose Investments to Sell (₹{formatCurrency(getTotalInvestmentValue())} available)
                      </button>
                    )}
                    
                    {hasAnyInvestments() && showInvestmentSelector && (
                      <div className="bg-gray-50 border rounded p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold text-sm">Select investments to sell:</h4>
                          <button 
                            onClick={() => setShowInvestmentSelector(false)}
                            className="text-gray-500 hover:text-gray-700"
                            >
                            ✕
                          </button>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {/* Traditional Investments */}
                          {investmentOptions
                            .filter(option => getTotalValue(option.asset) > 0)
                            .map((option) => {
                              const principal = investments[option.asset] || 0;
                              const profits = investmentProfits[option.asset] || 0;
                              const totalValue = getTotalValue(option.asset);
                              
                              return (
                                <div key={option.asset} className="bg-white border rounded p-2">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="font-semibold text-xs">{option.name}</p>
                                      <p className="text-xs text-gray-600">
                                        Principal: ₹{formatCurrency(principal)} | 
                                        Profits: ₹{formatCurrency(profits)}
                                      </p>
                                      <p className="text-xs font-semibold">Total: ₹{formatCurrency(totalValue)}</p>
                                    </div>
                                    <div className="ml-2">
                                      <div className="flex space-x-1 mb-1">
                                        <button
                                          className="bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded text-xs"
                                          onClick={() => handleSellInvestment(option.asset, totalValue * 0.25)}
                                          title="Sell 25%"
                                        >
                                          25%
                                        </button>
                                        <button
                                          className="bg-red-200 hover:bg-red-300 text-red-700 px-2 py-1 rounded text-xs"
                                          onClick={() => handleSellInvestment(option.asset, totalValue * 0.5)}
                                          title="Sell 50%"
                                        >
                                          50%
                                        </button>
                                        <button
                                          className="bg-red-300 hover:bg-red-400 text-red-700 px-2 py-1 rounded text-xs"
                                          onClick={() => handleSellInvestment(option.asset, totalValue)}
                                          title="Sell All"
                                        >
                                          ALL
                                        </button>
                                      </div>
                                      <div className="flex space-x-1">
                                        <button
                                          className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs"
                                          onClick={() => setShowCustomAmountFor(showCustomAmountFor === option.asset ? null : option.asset)}
                                          title="Custom Amount"
                                        >
                                          Custom
                                        </button>
                                      </div>
                                      {showCustomAmountFor === option.asset && (
                                        <div className="mt-2 flex space-x-1">
                                          <input
                                            type="number"
                                            placeholder="Amount"
                                            value={customSellAmounts[option.asset] || ''}
                                            onChange={(e) => setCustomSellAmounts({...customSellAmounts, [option.asset]: parseInt(e.target.value) || 0})}
                                            className="w-20 px-1 py-1 border rounded text-xs"
                                            max={totalValue}
                                          />
                                          <button
                                            className="bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded text-xs"
                                            onClick={() => {
                                              const amount = customSellAmounts[option.asset] || 0;
                                              if (amount > 0 && amount <= totalValue) {
                                                handleSellInvestment(option.asset, amount);
                                                setShowCustomAmountFor(null);
                                              }
                                            }}
                                          >
                                            Sell
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          
                          {/* Stock Investments */}
                          {Object.entries(stocks)
                            .filter(([symbol, stock]) => getTotalValue(symbol as Asset) > 0)
                            .map(([symbol, stock]) => {
                              const asset = symbol as Asset;
                              const principal = investments[asset] || 0;
                              const profits = investmentProfits[asset] || 0;
                              const totalValue = getTotalValue(asset);
                              const ownedShares = getOwnedShares(symbol);
                              
                              return (
                                <div key={symbol} className="bg-blue-50 border border-blue-200 rounded p-2">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="font-semibold text-xs">📈 {stock.name}</p>
                                      <p className="text-xs text-gray-600">
                                        {ownedShares} shares @ ₹{stock.currentPrice.toFixed(2)}
                                      </p>
                                      <p className="text-xs font-semibold">Total: ₹{formatCurrency(totalValue)}</p>
                                    </div>
                                    <div className="ml-2 space-x-1">
                                      <button
                                        className="bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded text-xs"
                                        onClick={() => handleSellInvestment(asset, totalValue * 0.25)}
                                        title="Sell 25%"
                                      >
                                        25%
                                      </button>
                                      <button
                                        className="bg-red-200 hover:bg-red-300 text-red-700 px-2 py-1 rounded text-xs"
                                        onClick={() => handleSellInvestment(asset, totalValue * 0.5)}
                                        title="Sell 50%"
                                      >
                                        50%
                                      </button>
                                      <button
                                        className="bg-red-300 hover:bg-red-400 text-red-700 px-2 py-1 rounded text-xs"
                                        onClick={() => handleSellInvestment(asset, totalValue)}
                                        title="Sell All"
                                      >
                                        ALL
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          
                          {/* Crypto Investments */}
                          {Object.entries(cryptos)
                            .filter(([symbol, crypto]) => getTotalValue(symbol as Asset) > 0)
                            .map(([symbol, crypto]) => {
                              const asset = symbol as Asset;
                              const principal = investments[asset] || 0;
                              const profits = investmentProfits[asset] || 0;
                              const totalValue = getTotalValue(asset);
                              const ownedCoins = getOwnedCoins(symbol);
                              
                              return (
                                <div key={symbol} className="bg-purple-50 border border-purple-200 rounded p-2">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="font-semibold text-xs">🪙 {crypto.name}</p>
                                      <p className="text-xs text-gray-600">
                                        {ownedCoins} coins @ ₹{crypto.currentPrice.toFixed(2)}
                                      </p>
                                      <p className="text-xs font-semibold">Total: ₹{formatCurrency(totalValue)}</p>
                                    </div>
                                    <div className="ml-2 space-x-1">
                                      <button
                                        className="bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded text-xs"
                                        onClick={() => handleSellInvestment(asset, totalValue * 0.25)}
                                        title="Sell 25%"
                                      >
                                        25%
                                      </button>
                                      <button
                                        className="bg-red-200 hover:bg-red-300 text-red-700 px-2 py-1 rounded text-xs"
                                        onClick={() => handleSellInvestment(asset, totalValue * 0.5)}
                                        title="Sell 50%"
                                      >
                                        50%
                                      </button>
                                      <button
                                        className="bg-red-300 hover:bg-red-400 text-red-700 px-2 py-1 rounded text-xs"
                                        onClick={() => handleSellInvestment(asset, totalValue)}
                                        title="Sell All"
                                      >
                                        ALL
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          
                          {/* Real Estate Investments */}
                          {Object.entries(realEstates)
                            .filter(([symbol, realEstate]) => getTotalValue(symbol as Asset) > 0)
                            .map(([symbol, realEstate]) => {
                              const asset = symbol as Asset;
                              const principal = investments[asset] || 0;
                              const profits = investmentProfits[asset] || 0;
                              const totalValue = getTotalValue(asset);
                              const ownedProperties = getOwnedProperties(symbol);
                              
                              return (
                                <div key={symbol} className="bg-green-50 border border-green-200 rounded p-2">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="font-semibold text-xs">🏠 {realEstate.name}</p>
                                      <p className="text-xs text-gray-600">
                                        {ownedProperties} properties @ ₹{(realEstate.currentPrice / 100000).toFixed(1)}L
                                      </p>
                                      <p className="text-xs font-semibold">Total: ₹{formatCurrency(totalValue)}</p>
                                    </div>
                                    <div className="ml-2 space-x-1">
                                      <button
                                        className="bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded text-xs"
                                        onClick={() => handleSellInvestment(asset, totalValue * 0.25)}
                                        title="Sell 25%"
                                      >
                                        25%
                                      </button>
                                      <button
                                        className="bg-red-200 hover:bg-red-300 text-red-700 px-2 py-1 rounded text-xs"
                                        onClick={() => handleSellInvestment(asset, totalValue * 0.5)}
                                        title="Sell 50%"
                                      >
                                        50%
                                      </button>
                                      <button
                                        className="bg-red-300 hover:bg-red-400 text-red-700 px-2 py-1 rounded text-xs"
                                        onClick={() => handleSellInvestment(asset, totalValue)}
                                        title="Sell All"
                                      >
                                        ALL
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                        <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                          💡 Current cash: ₹{formatCurrency(cash)} | Need: ₹{formatCurrency(Math.max(0, (currentEvent?.cost || 0) - cash))} more
                          {cash >= (currentEvent?.cost || 0) && (
                            <div className="text-green-600 font-semibold mt-1">
                              ✅ You now have enough cash to pay the expense!
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {!hasAnyInvestments() && cash < (currentEvent?.cost || 0) && (
                      <div className="bg-yellow-100 border border-yellow-400 rounded p-3 text-sm">
                        <p className="text-yellow-800 font-semibold">⚠️ Emergency Situation!</p>
                        <p className="text-yellow-700">You have insufficient funds. You'll need to pay with available cash and go into debt.</p>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 text-center mt-2">
                      💡 You must pay this expense to continue the game
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {showGameOverModal && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-card/95 backdrop-blur-sm border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="text-6xl mb-4">
                {netWorth > aiNetWorth ? '🏆' : '💔'}
              </div>
              
              <h2 className="text-3xl font-bold mb-4 font-orbitron">
                {netWorth > aiNetWorth ? 'Victory!' : 'Game Over'}
              </h2>
              
              <div className="space-y-4 mb-6">
                <div className="bg-background/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">Your Final Score</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(netWorth)}</p>
                </div>
                
                <div className="bg-background/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">AI Final Score</p>
                  <p className="text-2xl font-bold text-destructive">{formatCurrency(aiNetWorth)}</p>
                </div>
                
                <div className="bg-background/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">Margin</p>
                  <p className={`text-xl font-bold ${netWorth > aiNetWorth ? 'text-green-600' : 'text-red-600'}`}>
                    {netWorth > aiNetWorth ? '+' : ''}{formatCurrency(netWorth - aiNetWorth)}
                  </p>
                </div>
              </div>

              {user && (
                <p className="text-sm text-muted-foreground mb-4">
                  ✅ Your result has been saved to your game history!
                </p>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => router.push('/results')}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  View Game History
                </button>
                
                <button
                  onClick={() => router.push('/game')}
                  className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Play Again
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}