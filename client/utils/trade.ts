export const getStrategyName = (strategy: number): string => {
  switch (strategy) {
    case 1:
      return 'Best LST';
    case 2:
      return 'Best LST + Liquidity';
    case 3:
      return 'Best LRT';
    case 4:
      return 'Best LRT + Liquidity';
    case 5:
      return 'Arbitrage';
    default:
      return `Strategy ${strategy}`;
  }
};

export const getRiskLevelName = (level: number): string => {
  switch (level) {
    case 1:
      return 'Very Low';
    case 2:
      return 'Low';
    case 3:
      return 'Medium';
    case 4:
      return 'High';
    default:
      return `Risk ${level}`;
  }
};

export const getRiskLevelColor = (level: number): string => {
  switch (level) {
    case 1:
      return 'text-green-500';
    case 2:
      return 'text-blue-500';
    case 3:
      return 'text-yellow-500';
    case 4:
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}; 