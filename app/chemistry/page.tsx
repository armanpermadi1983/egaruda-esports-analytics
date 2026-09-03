"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPlayers } from "@/services/player-service";
import { getPlayerStatsByPlayer } from "@/services/player-stats-service";
import { Player } from "@/types/player";
import { PlayerMatchStats } from "@/types/player-stats";
import ReactMarkdown from "react-markdown";
import { getAiCache, setAiCache, getChemistryCacheId } from "@/services/ai-cache-service";

export default function ChemistryPage() {
  const router = useRouter();
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const [playerAId, setPlayerAId] = useState("");
  const [playerBId, setPlayerBId] = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiError, setAiError] = useState("");
  
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [cachedMatchCount, setCachedMatchCount] = useState<number | null>(null);
  const [commonMatches, setCommonMatches] = useState<number>(0);
  const [sharedStatsA, setSharedStatsA] = useState<PlayerMatchStats[]>([]);
  const [sharedStatsB, setSharedStatsB] = useState<PlayerMatchStats[]>([]);

  useEffect(() => {
    async function init() {
      try {
        const players = await getPlayers();
        setAllPlayers(players);
      } catch (error) {
        console.error("Failed to fetch players", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    async function loadChemistryData() {
      if (!playerAId || !playerBId || playerAId === playerBId) {
        setAiAnalysis("");
        setAiError("");
        setIsUpdateAvailable(false);
        setCommonMatches(0);
        return;
      }

      try {
        const [statsA, statsB] = await Promise.all([
          getPlayerStatsByPlayer(playerAId),
          getPlayerStatsByPlayer(playerBId)
        ]);

        const commonMatchIds = statsA
          .filter((sa) => statsB.some((sb) => sb.matchId === sa.matchId))
          .map((sa) => sa.matchId);

        setSharedStatsA(statsA.filter((s) => commonMatchIds.includes(s.matchId)));
        setSharedStatsB(statsB.filter((s) => commonMatchIds.includes(s.matchId)));
        
        const count = commonMatchIds.length;
        setCommonMatches(count);

        const cacheId = getChemistryCacheId(playerAId, playerBId);
        const cache = await getAiCache(cacheId);

        if (cache) {
          setAiAnalysis(cache.analysis);
          setCachedMatchCount(cache.matchCount);
          setIsUpdateAvailable(count > cache.matchCount);
        } else {
          setAiAnalysis("");
          setCachedMatchCount(null);
          setIsUpdateAvailable(false);
        }
      } catch (error) {
        console.error(error);
      }
    }
    loadChemistryData();
  }, [playerAId, playerBId]);

  async function handleAnalyze() {
    if (!playerAId || !playerBId) {
      setAiError("Mohon pilih kedua pemain terlebih dahulu.");
      return;
    }

    if (playerAId === playerBId) {
      setAiError("Pemain A dan Pemain B tidak boleh sama.");
      return;
    }

    setAiLoading(true);
    setAiError("");

    try {
      const playerA = allPlayers.find((p) => p.id === playerAId);
      const playerB = allPlayers.find((p) => p.id === playerBId);

      const response = await fetch("/api/chemistry-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerA,
          playerB,
          playerAStats: sharedStatsA,
          playerBStats: sharedStatsB,
          matchesPlayed: commonMatches,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to analyze chemistry");
      }

      const data = await response.json();
      setAiAnalysis(data.analysis);
      setCachedMatchCount(commonMatches);
      setIsUpdateAvailable(false);

      const cacheId = getChemistryCacheId(playerAId, playerBId);
      await setAiCache(cacheId, "chemistry", data.analysis, commonMatches);
    } catch (error) {
      console.error(error);
      setAiError(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading players...</div>;
  }

  return (
    <div className="container mx-auto p-6">


      <h1 className="mb-6 text-3xl font-bold">Team Chemistry Analysis</h1>

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        {/* Player A */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Player A</h2>
          <select
            value={playerAId}
            onChange={(e) => setPlayerAId(e.target.value)}
            className="w-full rounded-md border p-2 text-sm"
          >
            <option value="">-- Pilih Pemain --</option>
            {allPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.position || "Unknown"})
              </option>
            ))}
          </select>
        </div>

        {/* Player B */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Player B</h2>
          <select
            value={playerBId}
            onChange={(e) => setPlayerBId(e.target.value)}
            className="w-full rounded-md border p-2 text-sm"
          >
            <option value="">-- Pilih Pemain --</option>
            {allPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.position || "Unknown"})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-8 flex justify-center">
        {(!aiAnalysis || isUpdateAvailable) && playerAId && playerBId && playerAId !== playerBId && (
          <button
            onClick={handleAnalyze}
            disabled={aiLoading || commonMatches === 0}
            className="rounded-md bg-black px-8 py-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {aiLoading ? "Menganalisa Chemistry..." : isUpdateAvailable ? "Perbarui Analisa Chemistry" : "Analyze Chemistry with AI"}
          </button>
        )}
      </div>

      {isUpdateAvailable && aiAnalysis && !aiLoading && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>⚠️ Update Tersedia:</strong> Terdapat pertandingan baru (total {commonMatches} match bersama). Klik "Perbarui Analisa Chemistry" untuk membuat ulang laporan.
        </div>
      )}

      {aiError && (
        <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {aiError}
        </div>
      )}

      {aiAnalysis && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">AI Chemistry Report</h2>
          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-muted-foreground">
            <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
