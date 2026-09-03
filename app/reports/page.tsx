"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Printer, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { getMatches } from "@/services/match-service";
import { getPlayers } from "@/services/player-service";
import { getPlayerMatchStats } from "@/services/player-stats-service";

import { Match } from "@/types/match";
import { Player } from "@/types/player";
import { PlayerMatchStats } from "@/types/player-stats";
import { calculateEpi } from "@/utils/epi-calculator";
import { getAiCache, setAiCache, getMonthlyCacheId } from "@/services/ai-cache-service";

export default function ReportsPage() {

  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [allStats, setAllStats] = useState<PlayerMatchStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Default to current month
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [cachedMatchCount, setCachedMatchCount] = useState<number | null>(null);

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
        console.error("Failed to load reports data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Filter matches by selected month
  const filteredMatches = useMemo(() => {
    if (!selectedMonth) return [];
    return matches.filter(m => m.matchDate && m.matchDate.startsWith(selectedMonth));
  }, [matches, selectedMonth]);

  // Aggregate stats
  const aggregateStats = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    filteredMatches.forEach(m => {
      goalsFor += m.scoreFor;
      goalsAgainst += m.scoreAgainst;
      if (m.scoreFor > m.scoreAgainst) wins++;
      else if (m.scoreFor < m.scoreAgainst) losses++;
      else draws++;
    });

    const totalMatches = filteredMatches.length;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    return { totalMatches, wins, losses, draws, goalsFor, goalsAgainst, winRate };
  }, [filteredMatches]);

  // Top performers
  const topPerformers = useMemo(() => {
    if (filteredMatches.length === 0 || players.length === 0) return [];
    
    const matchIds = new Set(filteredMatches.map(m => m.id));
    const statsInMonth = allStats.filter(s => matchIds.has(s.matchId));

    const playerPerformance = players.map(player => {
      const playerStats = statsInMonth.filter(s => s.playerId === player.id);
      if (playerStats.length === 0) return null;
      
      const epiResult = calculateEpi(playerStats);
      return {
        id: player.id,
        name: player.name,
        averageEpi: epiResult.epi.score,
        matchesPlayed: playerStats.length,
      };
    }).filter(Boolean) as { id: string, name: string, averageEpi: number, matchesPlayed: number }[];

    // Sort by EPI descending
    playerPerformance.sort((a, b) => b.averageEpi - a.averageEpi);
    
    return playerPerformance.slice(0, 3);
  }, [filteredMatches, players, allStats]);

  // Load AI cache
  useEffect(() => {
    async function loadCache() {
      if (!selectedMonth) return;
      const cacheId = getMonthlyCacheId(selectedMonth);
      const cache = await getAiCache(cacheId);
      if (cache) {
        setAiSummary(cache.analysis);
        setCachedMatchCount(cache.matchCount);
      } else {
        setAiSummary(null);
        setCachedMatchCount(null);
      }
    }
    loadCache();
  }, [selectedMonth]);

  // Check if update is available
  useEffect(() => {
    if (cachedMatchCount !== null && filteredMatches.length > cachedMatchCount) {
      setIsUpdateAvailable(true);
    } else {
      setIsUpdateAvailable(false);
    }
  }, [filteredMatches.length, cachedMatchCount]);

  const handleGenerateAI = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch("/api/executive-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthYear: selectedMonth,
          matches: filteredMatches,
          topPlayers: topPerformers,
          aggregateStats
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghubungi AI");

      setAiSummary(data.summary);
      setCachedMatchCount(filteredMatches.length);
      setIsUpdateAvailable(false);

      const cacheId = getMonthlyCacheId(selectedMonth);
      await setAiCache(cacheId, "monthly", data.summary, filteredMatches.length);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading reports data...</div>;
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header section - Hidden when printing */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monthly Reports</h1>
          <p className="text-muted-foreground">Executive summary and performance overview.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-md border p-2"
          />
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-md border bg-white px-4 py-2 hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>

      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block border-b-2 border-black pb-4 mb-6">
        <h1 className="text-4xl font-bold">Esports Analytics Report</h1>
        <p className="text-xl mt-2 text-gray-600">Period: {selectedMonth}</p>
      </div>

      {filteredMatches.length === 0 ? (
        <Card className="print:hidden">
          <CardContent className="p-8 text-center text-muted-foreground">
            No matches found for {selectedMonth}. Try selecting another month.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Performance Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="print:shadow-none print:border-black">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold">{aggregateStats.winRate}%</span>
                  {aggregateStats.winRate >= 50 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {aggregateStats.wins}W - {aggregateStats.draws}D - {aggregateStats.losses}L
                </p>
              </CardContent>
            </Card>
            
            <Card className="print:shadow-none print:border-black">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Matches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{aggregateStats.totalMatches}</div>
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border-black">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Goals For</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{aggregateStats.goalsFor}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg {(aggregateStats.goalsFor / aggregateStats.totalMatches).toFixed(1)} / match
                </p>
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border-black">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Goals Against</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{aggregateStats.goalsAgainst}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg {(aggregateStats.goalsAgainst / aggregateStats.totalMatches).toFixed(1)} / match
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Top Performers */}
            <Card className="md:col-span-1 print:shadow-none print:border-black">
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                {topPerformers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Not enough data.</p>
                ) : (
                  <div className="space-y-4">
                    {topPerformers.map((player, index) => (
                      <div key={player.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{player.name}</p>
                            <p className="text-xs text-muted-foreground">{player.matchesPlayed} matches</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{player.averageEpi.toFixed(1)}</p>
                          <p className="text-xs text-muted-foreground">EPI</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Executive Summary */}
            <Card className="md:col-span-2 print:shadow-none print:border-black print:col-span-3">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  AI Executive Summary
                </CardTitle>
                {(!aiSummary || isUpdateAvailable) && !aiLoading && (
                  <button 
                    onClick={handleGenerateAI}
                    className="rounded bg-black px-3 py-1 text-sm text-white hover:bg-gray-800 print:hidden"
                  >
                    {isUpdateAvailable ? "Perbarui Analisa AI" : "Generate"}
                  </button>
                )}
              </CardHeader>
              <CardContent>
                {isUpdateAvailable && aiSummary && !aiLoading && (
                  <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 print:hidden">
                    <strong>⚠️ Update Tersedia:</strong> Terdapat data pertandingan baru yang belum masuk ke dalam rangkuman ini. Klik "Perbarui Analisa AI" untuk membuat ulang laporan.
                  </div>
                )}
                {aiLoading ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Sparkles className="mx-auto mb-2 h-6 w-6 animate-pulse text-amber-500" />
                    <p>AI is analyzing {aggregateStats.totalMatches} matches...</p>
                  </div>
                ) : aiError ? (
                  <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
                    {aiError}
                    <button onClick={handleGenerateAI} className="ml-4 underline">Try Again</button>
                  </div>
                ) : aiSummary ? (
                  <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-muted-foreground">
                    <ReactMarkdown>{aiSummary}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground print:hidden">
                    <p>Generate an AI Executive Summary for {selectedMonth} to get actionable insights.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
