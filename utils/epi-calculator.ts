import { PlayerMatchStats } from "@/types/player-stats";

export function safeNumber(value: any): number {
  if (value === undefined || value === null) {
    return 0;
  }
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

export function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatAverage(value: number): string {
  return value.toFixed(1);
}

export interface EpiCalculationResult {
  summary: {
    averageTotalPoints: number;
    totalGoals: number;
    totalAssists: number;
  };
  performance: {
    attackingPositioning: number;
    shooting: number;
    duelling: number;
    defensivePositioning: number;
    passing: number;
    dribbling: number;
  };
  epi: {
    score: number;
    totalPointsScore: number;
    performanceScore: number;
  };
  epiLabel: string;
}

export function calculateEpi(stats: PlayerMatchStats[]): EpiCalculationResult {
  // SUMMARY
  const totalGoals = stats.reduce((sum, stat) => sum + safeNumber(stat.goals), 0);
  const totalAssists = stats.reduce((sum, stat) => sum + safeNumber(stat.assists), 0);
  const averageTotalPoints = average(stats.map((stat) => safeNumber(stat.totalPoints)));

  const summary = { averageTotalPoints, totalGoals, totalAssists };

  // PERFORMANCE CATEGORIES
  const performance = {
    attackingPositioning: average(stats.map((stat) => safeNumber(stat.attackingPositioning))),
    shooting: average(stats.map((stat) => safeNumber(stat.shooting))),
    duelling: average(stats.map((stat) => safeNumber(stat.duelling))),
    defensivePositioning: average(stats.map((stat) => safeNumber(stat.defensivePositioning))),
    passing: average(stats.map((stat) => safeNumber(stat.passing))),
    dribbling: average(stats.map((stat) => safeNumber(stat.dribbling))),
  };

  // EPI
  let score = 0;
  let totalPointsScore = 0;
  let performanceScore = 0;

  if (stats.length > 0) {
    totalPointsScore = clamp((summary.averageTotalPoints / 1500) * 100, 0, 100);

    const categoryValues = [
      performance.attackingPositioning,
      performance.shooting,
      performance.duelling,
      performance.defensivePositioning,
      performance.passing,
      performance.dribbling,
    ];

    const performanceAverage = average(categoryValues);
    performanceScore = clamp((performanceAverage / 500) * 100, 0, 100);

    // 40% Total Points, 60% Performance Categories
    score = totalPointsScore * 0.4 + performanceScore * 0.6;
  }

  const epi = { score, totalPointsScore, performanceScore };

  // EPI LABEL
  let epiLabel = "Needs Improvement";
  if (epi.score >= 90) epiLabel = "Elite";
  else if (epi.score >= 80) epiLabel = "Excellent";
  else if (epi.score >= 70) epiLabel = "Very Good";
  else if (epi.score >= 60) epiLabel = "Good";
  else if (epi.score >= 50) epiLabel = "Developing";

  return {
    summary,
    performance,
    epi,
    epiLabel,
  };
}
