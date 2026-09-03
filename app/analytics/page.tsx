"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Goal, Target, ShieldAlert, BarChart4, Hash, Medal } from "lucide-react";
import Link from "next/link";

import { getMatches } from "@/services/match-service";
import { getPlayers } from "@/services/player-service";
import { getPlayerMatchStats } from "@/services/player-stats-service";
import { calculateEpi } from "@/utils/epi-calculator";
import { Match } from "@/types/match";
import { Player } from "@/types/player";
import { PlayerMatchStats } from "@/types/player-stats";

export default function AnalyticsPage() {
  const router = useRouter();

  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [allStats, setAllStats] = useState<PlayerMatchStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedMatches, fetchedPlayers, fetchedStats] = await Promise.all([
          getMatches(),
          getPlayers(),
          getPlayerMatchStats(),
        ]);

        setMatches(fetchedMatches);
        setPlayers(fetchedPlayers);
        setAllStats(fetchedStats);
      } catch (error) {
        console.error("Failed to load analytics data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // =======================================================
  // TEAM OVERVIEW CALCULATIONS
  // =======================================================

  const teamOverview = useMemo(() => {
    if (matches.length === 0) {
      return { winRate: 0, goalsPerMatch: 0, cleanSheets: 0, totalMatches: 0 };
    }

    let wins = 0;
    let totalGoals = 0;
    let cleanSheets = 0;

    matches.forEach((match) => {
      const ourScore = Number(match.scoreFor) || 0;
      const opponentScore = Number(match.scoreAgainst) || 0;

      if (ourScore > opponentScore) wins++;
      if (opponentScore === 0) cleanSheets++;
      totalGoals += ourScore;
    });

    return {
      totalMatches: matches.length,
      winRate: (wins / matches.length) * 100,
      goalsPerMatch: totalGoals / matches.length,
      cleanSheets,
    };
  }, [matches]);

  // =======================================================
  // LEADERBOARDS CALCULATIONS
  // =======================================================

  const playerRankings = useMemo(() => {
    if (players.length === 0 || allStats.length === 0) return [];

    return players.map((player) => {
      // Find all stats for this specific player
      const playerStats = allStats.filter((stat) => stat.playerId === player.id);
      
      // Calculate aggregate performance
      const { summary, performance, epi } = calculateEpi(playerStats);
      
      const avgGoals = summary.totalGoals / (playerStats.length || 1);
      const avgAssists = summary.totalAssists / (playerStats.length || 1);
      
      // Calculate defensive score (Tackles + Interceptions + Blocks as a raw defensive metric)
      const avgDefensiveScore = (
        performance.defensivePositioning + 
        performance.duelling
      ) / 2;

      return {
        id: player.id,
        name: player.name,
        position: player.position,
        matchesPlayed: playerStats.length,
        epiScore: epi.score,
        avgGoals,
        avgAssists,
        avgDefensiveScore,
      };
    }).filter(p => p.matchesPlayed > 0); // Only rank players who have played at least 1 match
  }, [players, allStats]);

  // Sortings
  const mvpLeaderboard = [...playerRankings].sort((a, b) => b.epiScore - a.epiScore).slice(0, 3);
  const topScorers = [...playerRankings].sort((a, b) => b.avgGoals - a.avgGoals).slice(0, 3);
  const topAssisters = [...playerRankings].sort((a, b) => b.avgAssists - a.avgAssists).slice(0, 3);
  const bestDefenders = [...playerRankings].sort((a, b) => b.avgDefensiveScore - a.avgDefensiveScore).slice(0, 3);

  // =======================================================
  // RENDER
  // =======================================================

  if (loading) {
    return (
      <main className="p-6 md:p-8">
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          Loading comprehensive analytics...
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 md:p-8 space-y-8">
      

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics & Leaderboards</h1>
        <p className="mt-1 text-muted-foreground">
          Big picture overview of team performance and individual player rankings.
        </p>
      </div>

      {/* TEAM OVERVIEW SECTION */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BarChart4 className="h-5 w-5" />
          Team Overview
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamOverview.totalMatches}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{teamOverview.winRate.toFixed(1)}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Goals/Match</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamOverview.goalsPerMatch.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Clean Sheets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamOverview.cleanSheets}</div>
            </CardContent>
          </Card>
        </div>
      </section>


      {/* LEADERBOARDS SECTION */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Medal className="h-5 w-5" />
          Player Leaderboards
        </h2>
        
        {playerRankings.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
            No player stats recorded yet. Play some matches first!
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            
            {/* MVP */}
            <Card className="border-t-4 border-t-yellow-400">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" /> 
                  MVP (Highest EPI)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mvpLeaderboard.map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-muted-foreground">{idx + 1}.</span>
                      <Link href={`/players/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                    </div>
                    <span className="font-bold">{p.epiScore.toFixed(1)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Scorers */}
            <Card className="border-t-4 border-t-blue-400">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                  <Goal className="h-4 w-4 text-blue-500" /> 
                  Top Scorers (Avg)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {topScorers.map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-muted-foreground">{idx + 1}.</span>
                      <Link href={`/players/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                    </div>
                    <span className="font-bold">{p.avgGoals.toFixed(2)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Assisters */}
            <Card className="border-t-4 border-t-green-400">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-500" /> 
                  Top Assisters (Avg)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {topAssisters.map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-muted-foreground">{idx + 1}.</span>
                      <Link href={`/players/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                    </div>
                    <span className="font-bold">{p.avgAssists.toFixed(2)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Best Defenders */}
            <Card className="border-t-4 border-t-red-400">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-500" /> 
                  Best Defenders
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {bestDefenders.map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-muted-foreground">{idx + 1}.</span>
                      <Link href={`/players/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                    </div>
                    <span className="font-bold">{p.avgDefensiveScore.toFixed(0)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>
        )}
      </section>

    </main>
  );
}
