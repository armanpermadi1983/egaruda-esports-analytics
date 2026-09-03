"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { getPlayer, getPlayers } from "@/services/player-service";
import { getPlayerStatsByPlayer } from "@/services/player-stats-service";
import { getMatches } from "@/services/match-service";

import { Player } from "@/types/player";
import { PlayerMatchStats } from "@/types/player-stats";
import { calculateEpi, safeNumber, average, formatAverage, clamp } from "@/utils/epi-calculator";
import { formatDate } from "@/utils/date-formatter";
import { Match } from "@/types/match";
import ReactMarkdown from "react-markdown";
import { getAiCache, setAiCache, getPlayerCacheId } from "@/services/ai-cache-service";


// =========================================================
// PAGE
// =========================================================

export default function PlayerAnalyticsPage() {
  const router = useRouter();
  const params = useParams();

  const playerId = params.playerId as string;

  // =======================================================
  // STATE
  // =======================================================

  const [player, setPlayer] = useState<Player | null>(null);

  const [stats, setStats] = useState<PlayerMatchStats[]>([]);

  const [matches, setMatches] = useState<Match[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiError, setAiError] = useState("");
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedTeammateId, setSelectedTeammateId] = useState<string>("");
  
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [cachedMatchCount, setCachedMatchCount] = useState<number | null>(null);


  // =======================================================
  // LOAD PLAYER ANALYTICS
  // =======================================================

  async function loadPlayerAnalytics() {
    try {
      setLoading(true);
      setError("");

      // ---------------------------------------------------
      // GET PLAYER
      // ---------------------------------------------------

      const playerData = await getPlayer(playerId);

      if (!playerData) {
        setError("Player tidak ditemukan.");
        return;
      }

      setPlayer(playerData);


      // ---------------------------------------------------
      // GET PLAYER STATS
      // ---------------------------------------------------

      const statsData =
        await getPlayerStatsByPlayer(playerId);

      setStats(statsData);


      // ---------------------------------------------------
      // GET MATCHES & ALL PLAYERS
      // ---------------------------------------------------

      const matchesData = await getMatches();
      setMatches(matchesData);

      const allPlayersData = await getPlayers();
      setAllPlayers(allPlayersData);

    } catch (error) {
      console.error(
        "Failed to load player analytics:",
        error
      );

      setError(
        "Gagal memuat player analytics."
      );

    } finally {
      setLoading(false);
    }
  }


  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {
    if (!playerId) {
      return;
    }

    loadPlayerAnalytics();
  }, [playerId]);

  useEffect(() => {
    async function loadAiCache() {
      if (!playerId || stats.length === 0) return;
      const cacheId = getPlayerCacheId(playerId, selectedTeammateId);
      const cache = await getAiCache(cacheId);
      if (cache) {
        setAiAnalysis(cache.analysis);
        setCachedMatchCount(cache.matchCount);
        setIsUpdateAvailable(stats.length > cache.matchCount);
      } else {
        setAiAnalysis("");
        setCachedMatchCount(null);
        setIsUpdateAvailable(false);
      }
    }
    loadAiCache();
  }, [playerId, selectedTeammateId, stats.length]);


  // =======================================================
  // EPI CALCULATION
  // =======================================================

  const { summary, performance, epi, epiLabel } = useMemo(() => {
    return calculateEpi(stats);
  }, [stats]);


  // =======================================================
  // MATCH LOOKUP
  // =======================================================

  const playerMatches = useMemo(() => {
    return matches
      .filter((match) =>
        stats.some(
          (stat) =>
            stat.matchId === match.id
        )
      )
      .sort((a, b) => {
        return (
          new Date(b.matchDate).getTime() -
          new Date(a.matchDate).getTime()
        );
      });
  }, [matches, stats]);


  // =======================================================
  // RADAR DATA
  // =======================================================

  const radarData = [
    {
      category: "Attacking",
      value: performance.attackingPositioning,
    },

    {
      category: "Shooting",
      value: performance.shooting,
    },

    {
      category: "Duelling",
      value: performance.duelling,
    },

    {
      category: "Defensive",
      value: performance.defensivePositioning,
    },

    {
      category: "Passing",
      value: performance.passing,
    },

    {
      category: "Dribbling",
      value: performance.dribbling,
    },
  ];


  // =======================================================
  // PERFORMANCE TREND
  // =======================================================

  const performanceTrend = useMemo(() => {

    const sortedStats =
      [...stats].sort((a, b) => {

        const matchA =
          matches.find(
            (match) =>
              match.id === a.matchId
          );

        const matchB =
          matches.find(
            (match) =>
              match.id === b.matchId
          );

        if (!matchA || !matchB) {
          return 0;
        }

        return (
          new Date(
            matchA.matchDate
          ).getTime() -
          new Date(
            matchB.matchDate
          ).getTime()
        );

      });


    return sortedStats.map(
      (stat, index) => {

        const match =
          matches.find(
            (item) =>
              item.id === stat.matchId
          );


        return {
          match:
            `Match ${index + 1}`,

          opponent:
            match?.opponent ||
            "Unknown",

          totalPoints:
            safeNumber(
              stat.totalPoints
            ),

          attacking:
            safeNumber(
              stat.attackingPositioning
            ),

          shooting:
            safeNumber(
              stat.shooting
            ),

          duelling:
            safeNumber(
              stat.duelling
            ),

          defensive:
            safeNumber(
              stat.defensivePositioning
            ),

          passing:
            safeNumber(
              stat.passing
            ),

          dribbling:
            safeNumber(
              stat.dribbling
            ),
        };

      }
    );

  }, [stats, matches]);


  // =======================================================
  // AI ANALYSIS
  // =======================================================

  async function handleAIAnalysis() {

    if (!player) {
      return;
    }

    if (stats.length === 0) {
      setAiError(
        "Belum ada data pertandingan untuk dianalisa AI."
      );
      return;
    }


    try {

      setAiLoading(true);
      setAiError("");
      setAiAnalysis("");


      /*
       * NOTE:
       *
       * Endpoint /api/player-analysis akan kita buat
       * pada langkah berikutnya.
       *
       * API key Gemini/OpenAI TIDAK disimpan di halaman ini.
       */

      let teammateData = null;
      if (selectedTeammateId) {
        const teammateProfile = allPlayers.find((p) => p.id === selectedTeammateId);
        if (teammateProfile) {
          const teammateStats = await getPlayerStatsByPlayer(selectedTeammateId);
          const sharedMatches = teammateStats.filter((ts) =>
            stats.some((s) => s.matchId === ts.matchId)
          );

          teammateData = {
            player: {
              name: teammateProfile.name,
              position: teammateProfile.position || "-",
            },
            matchesPlayedTogether: sharedMatches.length,
            averageTotalPointsWhenTogether: average(
              sharedMatches.map((s) => safeNumber(s.totalPoints))
            ),
            totalGoalsWhenTogether: sharedMatches.reduce(
              (sum, s) => sum + safeNumber(s.goals),
              0
            ),
            totalAssistsWhenTogether: sharedMatches.reduce(
              (sum, s) => sum + safeNumber(s.assists),
              0
            ),
          };
        }
      }

      const response = await fetch(
        "/api/player-analysis",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            player,
            epi: epi.score,
            summary,
            performance,
            detailedStats,
            matchHistory: performanceTrend,
            teammateData,
          }),
        }
      );


      if (!response.ok) {

        const errorData =
          await response.json()
            .catch(() => null);

        throw new Error(
          errorData?.error ||
          "AI analysis failed."
        );
      }


      const data =
        await response.json();


      const analysisResult = data.analysis || "AI tidak memberikan hasil analisa.";
      setAiAnalysis(analysisResult);
      setCachedMatchCount(stats.length);
      setIsUpdateAvailable(false);

      if (data.analysis) {
        const cacheId = getPlayerCacheId(playerId, selectedTeammateId);
        await setAiCache(cacheId, "player", data.analysis, stats.length);
      }

    } catch (error) {

      console.error(
        "AI analysis error:",
        error
      );

      setAiError(
        error instanceof Error
          ? error.message
          : "Gagal melakukan AI analysis."
      );

    } finally {

      setAiLoading(false);

    }

  }


  // =======================================================
  // DETAILED 32 STATISTICS
  // =======================================================

  const detailedStats = useMemo(() => {

    const total = (
      selector:
        (stat: PlayerMatchStats) =>
          number
    ) => {

      return stats.reduce(
        (sum, stat) =>
          sum + safeNumber(
            selector(stat)
          ),
        0
      );

    };


    return [

      // ---------------------------------------------------
      // OVERALL
      // ---------------------------------------------------

      {
        category: "Overall",
        label: "Total Points",
        value:
          summary.averageTotalPoints,
        average: true,
      },


      // ---------------------------------------------------
      // PERFORMANCE
      // ---------------------------------------------------

      {
        category: "Performance",
        label: "Attacking Positioning",
        value:
          performance.attackingPositioning,
        average: true,
      },

      {
        category: "Performance",
        label: "Shooting",
        value:
          performance.shooting,
        average: true,
      },

      {
        category: "Performance",
        label: "Duelling",
        value:
          performance.duelling,
        average: true,
      },

      {
        category: "Performance",
        label: "Defensive Positioning",
        value:
          performance.defensivePositioning,
        average: true,
      },

      {
        category: "Performance",
        label: "Passing",
        value:
          performance.passing,
        average: true,
      },

      {
        category: "Performance",
        label: "Dribbling",
        value:
          performance.dribbling,
        average: true,
      },


      // ---------------------------------------------------
      // SCORING
      // ---------------------------------------------------

      {
        category: "Scoring",
        label: "Goals",
        value: total(
          (stat) => stat.goals
        ),
      },

      {
        category: "Scoring",
        label: "Shots",
        value: total(
          (stat) => stat.shots
        ),
      },

      {
        category: "Scoring",
        label: "Shots on Target",
        value: total(
          (stat) =>
            stat.shotsOnTarget
        ),
      },

      {
        category: "Scoring",
        label: "Assists",
        value: total(
          (stat) => stat.assists
        ),
      },

      {
        category: "Scoring",
        label: "Key Passes",
        value: total(
          (stat) => stat.keyPasses
        ),
      },


      // ---------------------------------------------------
      // PASSING
      // ---------------------------------------------------

      {
        category: "Passing",
        label: "Passes",
        value: total(
          (stat) => stat.passes
        ),
      },

      {
        category: "Passing",
        label: "Successful Passes",
        value: total(
          (stat) =>
            stat.successfulPasses
        ),
      },

      {
        category: "Passing",
        label: "Instrumental Passes",
        value: total(
          (stat) =>
            stat.instrumentalPasses
        ),
      },


      // ---------------------------------------------------
      // DRIBBLING
      // ---------------------------------------------------

      {
        category: "Dribbling",
        label: "Dribbles",
        value: total(
          (stat) => stat.dribbles
        ),
      },

      {
        category: "Dribbling",
        label: "Successful Dribbles",
        value: total(
          (stat) =>
            stat.successfulDribbles
        ),
      },

      {
        category: "Dribbling",
        label: "Instrumental Dribbles",
        value: total(
          (stat) =>
            stat.instrumentalDribbles
        ),
      },


      // ---------------------------------------------------
      // RECEIVING
      // ---------------------------------------------------

      {
        category: "Receiving",
        label: "Receiving",
        value: total(
          (stat) => stat.receiving
        ),
      },

      {
        category: "Receiving",
        label: "Good Receives",
        value: total(
          (stat) =>
            stat.goodReceives
        ),
      },


      // ---------------------------------------------------
      // ATTACKING MOVEMENT
      // ---------------------------------------------------

      {
        category: "Attacking Movement",
        label: "Overlaps",
        value: total(
          (stat) => stat.overlaps
        ),
      },

      {
        category: "Attacking Movement",
        label: "Runs Out Wide",
        value: total(
          (stat) =>
            stat.runsOutWide
        ),
      },

      {
        category: "Attacking Movement",
        label: "Forward Runs",
        value: total(
          (stat) =>
            stat.forwardRuns
        ),
      },

      {
        category: "Attacking Movement",
        label: "Attacking Receives",
        value: total(
          (stat) =>
            stat.attackingReceives
        ),
      },


      // ---------------------------------------------------
      // DEFENSIVE
      // ---------------------------------------------------

      {
        category: "Defensive",
        label: "Intercepts",
        value: total(
          (stat) =>
            stat.intercepts
        ),
      },

      {
        category: "Defensive",
        label: "Tackles",
        value: total(
          (stat) =>
            stat.tackles
        ),
      },

      {
        category: "Defensive",
        label: "Impactful Steals",
        value: total(
          (stat) =>
            stat.impactfulSteals
        ),
      },


      // ---------------------------------------------------
      // PRESSING
      // ---------------------------------------------------

      {
        category: "Pressing",
        label: "Frontal Presses",
        value: total(
          (stat) =>
            stat.frontalPresses
        ),
      },

      {
        category: "Pressing",
        label: "Presses From Behind",
        value: total(
          (stat) =>
            stat.pressesFromBehind
        ),
      },


      // ---------------------------------------------------
      // POSITIONING
      // ---------------------------------------------------

      {
        category: "Positioning",
        label: "Good Positioning",
        value: total(
          (stat) =>
            stat.goodPositioning
        ),
      },


      // ---------------------------------------------------
      // MARKING
      // ---------------------------------------------------

      {
        category:
          "Marking / Defensive Support",

        label: "Double Marks",

        value: total(
          (stat) =>
            stat.doubleMarks
        ),
      },

      {
        category:
          "Marking / Defensive Support",

        label: "Passes Obstructed",

        value: total(
          (stat) =>
            stat.passesObstructed
        ),
      },

      {
        category:
          "Marking / Defensive Support",

        label: "Players Marked",

        value: total(
          (stat) =>
            stat.playersMarked
        ),
      },

    ];

  }, [
    stats,
    summary,
    performance,
  ]);


  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {

    return (
      <main className="p-6 md:p-8">

        <div className="rounded-xl border bg-card p-8 text-center">

          <p className="text-sm text-muted-foreground">
            Loading player analytics...
          </p>

        </div>

      </main>
    );

  }


  // =======================================================
  // ERROR
  // =======================================================

  if (error || !player) {

    return (
      <main className="p-6 md:p-8">

        <button
          onClick={() => router.back()}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to Players
        </button>

        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-8 text-center">

          <h1 className="text-xl font-semibold text-red-700">
            Player Not Found
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {error ||
              "Player tidak ditemukan."}
          </p>

        </div>

      </main>
    );

  }


  // =======================================================
  // RENDER
  // =======================================================

  return (
    <main className="p-6 md:p-8">

      {/* ===================================================
          BACK
      ==================================================== */}

      <div className="mb-6">

        <button
          onClick={() => router.back()}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to Players
        </button>

      </div>


      {/* ===================================================
          PLAYER HEADER
      ==================================================== */}

      <section className="rounded-xl border bg-card shadow-sm">

        <div className="p-6 md:p-8">

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div>

              <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Player Analytics
              </div>

              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                {player.name}
              </h1>

              <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">

                {player.username && (
                  <span>
                    @{player.username}
                  </span>
                )}

                {player.position && (
                  <>
                    <span>•</span>

                    <span>
                      {player.position}
                    </span>
                  </>
                )}

                <span>•</span>

                <span>
                  {player.team}
                </span>

              </div>

            </div>


            <div className="rounded-xl bg-muted/50 px-6 py-4 text-center">

              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Matches Analyzed
              </div>

              <div className="mt-1 text-3xl font-bold">
                {stats.length}
              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ===================================================
          EPI
      ==================================================== */}

      <section className="mt-6 rounded-xl border bg-card shadow-sm">

        <div className="p-6 md:p-8">

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">

            {/* SCORE */}

            <div className="flex min-w-[220px] flex-col items-center justify-center">

              <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                eGARUDA Performance Index
              </div>

              <div className="mt-3 text-7xl font-bold tracking-tight">
                {epi.score.toFixed(1)}
              </div>

              <div className="mt-2 rounded-full bg-muted px-4 py-1 text-sm font-semibold">
                {epiLabel}
              </div>

              <div className="mt-2 text-xs text-muted-foreground">
                Performance Index • 0–100
              </div>

            </div>


            {/* EPI BAR */}

            <div className="flex-1">

              <div className="flex items-center justify-between">

                <div>
                  <h2 className="text-xl font-semibold">
                    EPI Performance
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Composite performance score based on match statistics.
                  </p>
                </div>

                <div className="text-2xl font-bold">
                  {epi.score.toFixed(1)}
                </div>

              </div>


              <div className="mt-5 h-4 overflow-hidden rounded-full bg-muted">

                <div
                  className="h-full rounded-full bg-black transition-all"
                  style={{
                    width: `${epi.score}%`,
                  }}
                />

              </div>


              <div className="mt-4 grid gap-4 sm:grid-cols-2">

                <div className="rounded-lg border p-4">

                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Total Points Component
                  </div>

                  <div className="mt-1 text-xl font-bold">
                    {epi.totalPointsScore.toFixed(1)}
                  </div>

                  <div className="mt-1 text-xs text-muted-foreground">
                    Weight: 40%
                  </div>

                </div>


                <div className="rounded-lg border p-4">

                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Performance Component
                  </div>

                  <div className="mt-1 text-xl font-bold">
                    {epi.performanceScore.toFixed(1)}
                  </div>

                  <div className="mt-1 text-xs text-muted-foreground">
                    Weight: 60%
                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ===================================================
          SUMMARY CARDS
      ==================================================== */}

      <section className="mt-6 grid gap-4 md:grid-cols-3">

        <div className="rounded-xl border bg-card p-6 shadow-sm">

          <div className="text-sm font-medium text-muted-foreground">
            Average Total Points
          </div>

          <div className="mt-2 text-3xl font-bold">
            {formatAverage(
              summary.averageTotalPoints
            )}
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            Across {stats.length} analyzed matches
          </div>

        </div>


        <div className="rounded-xl border bg-card p-6 shadow-sm">

          <div className="text-sm font-medium text-muted-foreground">
            Total Goals
          </div>

          <div className="mt-2 text-3xl font-bold">
            {summary.totalGoals}
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            All analyzed matches
          </div>

        </div>


        <div className="rounded-xl border bg-card p-6 shadow-sm">

          <div className="text-sm font-medium text-muted-foreground">
            Total Assists
          </div>

          <div className="mt-2 text-3xl font-bold">
            {summary.totalAssists}
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            All analyzed matches
          </div>

        </div>

      </section>


      {/* ===================================================
          PERFORMANCE + RADAR
      ==================================================== */}

      <section className="mt-6 grid gap-6 lg:grid-cols-2">

        {/* PERFORMANCE */}

        <div className="rounded-xl border bg-card p-6 shadow-sm">

          <h2 className="text-xl font-semibold">
            Average Performance
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Average score across the six main performance categories.
          </p>


          <div className="mt-6 space-y-5">

            {[
              {
                label: "Attacking Positioning",
                value:
                  performance.attackingPositioning,
              },

              {
                label: "Shooting",
                value:
                  performance.shooting,
              },

              {
                label: "Duelling",
                value:
                  performance.duelling,
              },

              {
                label: "Defensive Positioning",
                value:
                  performance.defensivePositioning,
              },

              {
                label: "Passing",
                value:
                  performance.passing,
              },

              {
                label: "Dribbling",
                value:
                  performance.dribbling,
              },
            ].map((item) => (

              <div key={item.label}>

                <div className="flex items-center justify-between text-sm">

                  <span>
                    {item.label}
                  </span>

                  <span className="font-semibold">
                    {formatAverage(
                      item.value
                    )}
                  </span>

                </div>


                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">

                  <div
                    className="h-full rounded-full bg-black"
                    style={{
                      width: `${Math.min(
                        (item.value / 500) * 100,
                        100
                      )}%`,
                    }}
                  />

                </div>

              </div>

            ))}

          </div>

        </div>


        {/* RADAR */}

        <div className="rounded-xl border bg-card p-6 shadow-sm">

          <h2 className="text-xl font-semibold">
            Performance Radar
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Average performance profile across all analyzed matches.
          </p>


          <div className="mt-4 h-[350px] w-full">

            {stats.length === 0 ? (

              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No statistics available.
              </div>

            ) : (

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <RadarChart
                  data={radarData}
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                >

                  <PolarGrid />

                  <PolarAngleAxis
                    dataKey="category"
                  />

                  <PolarRadiusAxis
                    domain={[0, 500]}
                    tickCount={6}
                  />

                  <Radar
                    name={player.name}
                    dataKey="value"
                    fill="currentColor"
                    fillOpacity={0.25}
                    stroke="currentColor"
                  />

                  <Tooltip />

                </RadarChart>

              </ResponsiveContainer>

            )}

          </div>

        </div>

      </section>


      {/* ===================================================
          PERFORMANCE TREND
      ==================================================== */}

      <section className="mt-6 rounded-xl border bg-card shadow-sm">

        <div className="border-b p-6">

          <h2 className="text-xl font-semibold">
            Performance Trend
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Performance development across each analyzed match.
          </p>

        </div>


        {performanceTrend.length === 0 ? (

          <div className="p-6 text-sm text-muted-foreground">
            No performance trend available.
          </div>

        ) : (

          <div className="p-6">

            <div className="h-[400px] w-full">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <LineChart
                  data={performanceTrend}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 10,
                    bottom: 10,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="match"
                  />

                  <YAxis />

                  <Tooltip
                    formatter={(value) =>
                      typeof value === "number"
                        ? value.toFixed(1)
                        : value
                    }
                  />

                  <Line
                    type="monotone"
                    dataKey="totalPoints"
                    name="Total Points"
                    stroke="currentColor"
                    strokeWidth={3}
                    dot
                  />

                  <Line
                    type="monotone"
                    dataKey="attacking"
                    name="Attacking"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />

                  <Line
                    type="monotone"
                    dataKey="shooting"
                    name="Shooting"
                    stroke="currentColor"
                    strokeWidth={2}
                  />

                  <Line
                    type="monotone"
                    dataKey="passing"
                    name="Passing"
                    stroke="currentColor"
                    strokeWidth={2}
                  />

                  <Line
                    type="monotone"
                    dataKey="dribbling"
                    name="Dribbling"
                    stroke="currentColor"
                    strokeWidth={2}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          </div>

        )}

      </section>


      {/* ===================================================
          AI COACH ANALYSIS
      ==================================================== */}

      <section className="mt-6 rounded-xl border bg-card shadow-sm">

        <div className="border-b p-6">

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>

              <h2 className="text-xl font-semibold">
                AI Coach Analysis
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Use AI to identify strengths, weaknesses and training priorities.
              </p>

            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedTeammateId}
                onChange={(e) => setSelectedTeammateId(e.target.value)}
                className="rounded-md border p-2 text-sm"
                disabled={aiLoading}
              >
                <option value="">-- Analisa Tunggal --</option>
                {allPlayers
                  .filter((p) => p.id !== playerId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      Bandingkan dengan {p.name}
                    </option>
                  ))}
              </select>

              <button
                type="button"
                onClick={handleAIAnalysis}
                disabled={aiLoading || stats.length === 0}
                className="rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aiLoading ? "Analyzing..." : isUpdateAvailable ? "Perbarui Analisa AI" : "Analyze with AI"}
              </button>
            </div>

          </div>

        </div>


        <div className="p-6">

          {aiError && (

            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {aiError}
            </div>

          )}

          {isUpdateAvailable && aiAnalysis && !aiLoading && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong>⚠️ Update Tersedia:</strong> Terdapat pertandingan baru sejak analisa ini dibuat. Klik "Perbarui Analisa AI" untuk membuat ulang laporan.
            </div>
          )}

          {!aiError &&
            !aiAnalysis &&
            !aiLoading && (

              <div className="rounded-lg bg-muted/40 p-6 text-center">

                <div className="text-sm font-medium">
                  AI analysis belum dijalankan
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  Klik "Analyze with AI" untuk mendapatkan analisa pemain.
                </div>

              </div>

            )}


          {aiLoading && (

            <div className="rounded-lg bg-muted/40 p-6 text-center">

              <div className="text-sm font-medium">
                AI sedang menganalisa data pemain...
              </div>

              <div className="mt-1 text-xs text-muted-foreground">
                Analisa mencakup performa, konsistensi, strengths dan training focus.
              </div>

            </div>

          )}


          {aiAnalysis && (

            <div className="rounded-xl border p-6">

              <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                AI Coach Report
              </div>

              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-sm leading-7">
                <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
              </div>

            </div>

          )}

        </div>

      </section>


      {/* ===================================================
          MATCH HISTORY
      ==================================================== */}

      <section className="mt-6">

        <div className="rounded-xl border bg-card shadow-sm">

          <div className="border-b p-6">

            <h2 className="text-xl font-semibold">
              Match History
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Matches where this player has recorded statistics.
            </p>

          </div>


          {playerMatches.length === 0 ? (

            <div className="p-6 text-sm text-muted-foreground">
              No match history available.
            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead className="border-b bg-muted/50">

                  <tr>

                    <th className="px-6 py-3 text-left font-medium">
                      Date
                    </th>

                    <th className="px-6 py-3 text-left font-medium">
                      Opponent
                    </th>

                    <th className="px-6 py-3 text-center font-medium">
                      Score
                    </th>

                    <th className="px-6 py-3 text-center font-medium">
                      EPI
                    </th>

                    <th className="px-6 py-3 text-center font-medium">
                      Points
                    </th>

                    <th className="px-6 py-3 text-center font-medium">
                      Goals
                    </th>

                    <th className="px-6 py-3 text-center font-medium">
                      Assists
                    </th>

                    <th className="px-6 py-3 text-right font-medium">
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {playerMatches.map(
                    (match) => {

                      const matchStat =
                        stats.find(
                          (stat) =>
                            stat.matchId ===
                            match.id
                        );


                      if (!matchStat) {
                        return null;
                      }


                      /*
                       * Match-level EPI.
                       *
                       * Same weighting as overall EPI:
                       * 40% total points
                       * 60% six performance categories
                       */

                      const matchPerformance =
                        average([
                          safeNumber(
                            matchStat.attackingPositioning
                          ),

                          safeNumber(
                            matchStat.shooting
                          ),

                          safeNumber(
                            matchStat.duelling
                          ),

                          safeNumber(
                            matchStat.defensivePositioning
                          ),

                          safeNumber(
                            matchStat.passing
                          ),

                          safeNumber(
                            matchStat.dribbling
                          ),
                        ]);


                      const matchTotalScore =
                        clamp(
                          (
                            safeNumber(
                              matchStat.totalPoints
                            ) / 1500
                          ) * 100,
                          0,
                          100
                        );


                      const matchPerformanceScore =
                        clamp(
                          (
                            matchPerformance / 500
                          ) * 100,
                          0,
                          100
                        );


                      const matchEpi =
                        matchTotalScore * 0.4 +
                        matchPerformanceScore * 0.6;


                      return (

                        <tr
                          key={match.id}
                          className="border-b last:border-0"
                        >

                          <td className="px-6 py-4">
                            {formatDate(match.matchDate)}
                          </td>


                          <td className="px-6 py-4 font-medium">
                            {match.opponent}
                          </td>


                          <td className="px-6 py-4 text-center font-semibold">

                            {match.scoreFor} -{" "}
                            {match.scoreAgainst}

                          </td>


                          <td className="px-6 py-4 text-center">

                            <span className="font-bold">
                              {matchEpi.toFixed(1)}
                            </span>

                          </td>


                          <td className="px-6 py-4 text-center">
                            {matchStat.totalPoints}
                          </td>


                          <td className="px-6 py-4 text-center">
                            {matchStat.goals}
                          </td>


                          <td className="px-6 py-4 text-center">
                            {matchStat.assists}
                          </td>


                          <td className="px-6 py-4 text-right">

                            <Link
                              href={`/matches/${match.id}`}
                              className="inline-flex rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                            >
                              View Match
                            </Link>

                          </td>

                        </tr>

                      );

                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </section>


      {/* ===================================================
          DETAILED 32 STATISTICS
      ==================================================== */}

      <section className="mt-6">

        <div className="rounded-xl border bg-card shadow-sm">

          <div className="border-b p-6">

            <h2 className="text-xl font-semibold">
              Detailed 32 Statistics
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Complete performance statistics across all analyzed matches.
            </p>

          </div>


          {stats.length === 0 ? (

            <div className="p-6 text-sm text-muted-foreground">
              No statistics available yet.
            </div>

          ) : (

            <div className="grid gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">

              {[
                "Overall",
                "Performance",
                "Scoring",
                "Passing",
                "Dribbling",
                "Receiving",
                "Attacking Movement",
                "Defensive",
                "Pressing",
                "Positioning",
                "Marking / Defensive Support",
              ].map((category) => {

                const categoryStats =
                  detailedStats.filter(
                    (stat) =>
                      stat.category ===
                      category
                  );


                if (
                  categoryStats.length === 0
                ) {
                  return null;
                }


                return (

                  <div
                    key={category}
                    className="rounded-xl border p-5"
                  >

                    <h3 className="font-semibold">
                      {category}
                    </h3>


                    <div className="mt-4 space-y-3">

                      {categoryStats.map(
                        (stat) => (

                          <div
                            key={stat.label}
                            className="flex items-center justify-between border-b pb-2 last:border-0"
                          >

                            <span className="text-sm text-muted-foreground">
                              {stat.label}
                            </span>

                            <span className="font-semibold">

                              {stat.average
                                ? formatAverage(
                                    stat.value
                                  )
                                : stat.value}

                            </span>

                          </div>

                        )
                      )}

                    </div>

                  </div>

                );

              })}

            </div>

          )}

        </div>

      </section>


      {/* ===================================================
          FOOTER
      ==================================================== */}

      <div className="mt-6 pb-8 text-center text-xs text-muted-foreground">

        Player analytics calculated from{" "}
        {stats.length} analyzed match
        {stats.length !== 1
          ? "es"
          : ""}.

      </div>

    </main>
  );
}