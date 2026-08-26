"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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
  Legend,
} from "recharts";

import { getPlayer } from "@/services/player-service";
import { getPlayerStatsByPlayer } from "@/services/player-stats-service";
import { getMatches } from "@/services/match-service";

import { Player } from "@/types/player";
import { PlayerMatchStats } from "@/types/player-stats";
import { Match } from "@/types/match";

// =========================================================
// PAGE
// =========================================================

export default function PlayerAnalyticsPage() {
  const params = useParams();

  const playerId = params.playerId as string;

  // =======================================================
  // STATE
  // =======================================================

  const [player, setPlayer] =
    useState<Player | null>(null);

  const [stats, setStats] =
    useState<PlayerMatchStats[]>([]);

  const [matches, setMatches] =
    useState<Match[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

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

      const playerData =
        await getPlayer(playerId);

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
      // GET MATCHES
      // ---------------------------------------------------

      const matchesData =
        await getMatches();

      setMatches(matchesData);

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
  // HELPERS
  // =======================================================

  function average(
    values: number[]
  ): number {
    if (values.length === 0) {
      return 0;
    }

    return (
      values.reduce(
        (sum, value) =>
          sum + value,
        0
      ) / values.length
    );
  }

  function safeNumber(
    value: number | null | undefined
  ): number {
    return typeof value === "number"
      ? value
      : 0;
  }

  function formatAverage(
    value: number
  ): string {
    return value.toFixed(1);
  }

  // =======================================================
  // SUMMARY CALCULATIONS
  // =======================================================

  const summary = useMemo(() => {
    if (stats.length === 0) {
      return {
        averageTotalPoints: 0,
        totalGoals: 0,
        totalAssists: 0,
      };
    }

    const totalGoals =
      stats.reduce(
        (sum, stat) =>
          sum + safeNumber(stat.goals),
        0
      );

    const totalAssists =
      stats.reduce(
        (sum, stat) =>
          sum + safeNumber(stat.assists),
        0
      );

    const averageTotalPoints =
      average(
        stats.map(
          (stat) =>
            safeNumber(
              stat.totalPoints
            )
        )
      );

    return {
      averageTotalPoints,
      totalGoals,
      totalAssists,
    };
  }, [stats]);

  // =======================================================
  // AVERAGE PERFORMANCE CATEGORIES
  // =======================================================

  const performance = useMemo(() => {
    return {
      attackingPositioning:
        average(
          stats.map(
            (stat) =>
              safeNumber(
                stat.attackingPositioning
              )
          )
        ),

      shooting:
        average(
          stats.map(
            (stat) =>
              safeNumber(
                stat.shooting
              )
          )
        ),

      duelling:
        average(
          stats.map(
            (stat) =>
              safeNumber(
                stat.duelling
              )
          )
        ),

      defensivePositioning:
        average(
          stats.map(
            (stat) =>
              safeNumber(
                stat.defensivePositioning
              )
          )
        ),

      passing:
        average(
          stats.map(
            (stat) =>
              safeNumber(
                stat.passing
              )
          )
        ),

      dribbling:
        average(
          stats.map(
            (stat) =>
              safeNumber(
                stat.dribbling
              )
          )
        ),
    };
  }, [stats]);

  // =======================================================
  // RADAR DATA
  // =======================================================

  const radarData = [
    {
      category: "Attacking",
      value:
        performance.attackingPositioning,
    },

    {
      category: "Shooting",
      value:
        performance.shooting,
    },

    {
      category: "Duelling",
      value:
        performance.duelling,
    },

    {
      category: "Defensive",
      value:
        performance.defensivePositioning,
    },

    {
      category: "Passing",
      value:
        performance.passing,
    },

    {
      category: "Dribbling",
      value:
        performance.dribbling,
    },
  ];

  // =======================================================
  // PERFORMANCE TREND DATA
  // =======================================================

  const performanceTrendData = useMemo(() => {
    const data = playerMatches
      .map((match, index) => {
        const matchStat =
          stats.find(
            (stat) =>
              stat.matchId === match.id
          );

        if (!matchStat) {
          return null;
        }

        return {
          matchNumber: index + 1,

          matchLabel: `Match ${
            index + 1
          }`,

          opponent:
            match.opponent || "Unknown",

          date:
            match.matchDate || "",

          totalPoints:
            safeNumber(
              matchStat.totalPoints
            ),

          attacking:
            safeNumber(
              matchStat.attackingPositioning
            ),

          shooting:
            safeNumber(
              matchStat.shooting
            ),

          duelling:
            safeNumber(
              matchStat.duelling
            ),

          defensive:
            safeNumber(
              matchStat.defensivePositioning
            ),

          passing:
            safeNumber(
              matchStat.passing
            ),

          dribbling:
            safeNumber(
              matchStat.dribbling
            ),
        };
      })
      .filter(
        (
          item
        ): item is NonNullable<
          typeof item
        > => item !== null
      )
      .reverse();

    return data;
  }, [playerMatches, stats]);

  // =======================================================
  // 32 STATISTICS
  // =======================================================

  const detailedStats = useMemo(() => {
    return [
      // ---------------------------------------------------
      // OVERALL
      // ---------------------------------------------------

      {
        category: "Overall",
        label: "Total Points",
        value: average(
          stats.map(
            (stat) =>
              safeNumber(
                stat.totalPoints
              )
          )
        ),
        average: true,
      },

      // ---------------------------------------------------
      // MAIN PERFORMANCE
      // ---------------------------------------------------

      {
        category: "Performance",
        label: "Attacking Positioning",
        value:
          performance.attackingPositioning,
      },

      {
        category: "Performance",
        label: "Shooting",
        value:
          performance.shooting,
      },

      {
        category: "Performance",
        label: "Duelling",
        value:
          performance.duelling,
      },

      {
        category: "Performance",
        label: "Defensive Positioning",
        value:
          performance.defensivePositioning,
      },

      {
        category: "Performance",
        label: "Passing",
        value:
          performance.passing,
      },

      {
        category: "Performance",
        label: "Dribbling",
        value:
          performance.dribbling,
      },

      // ---------------------------------------------------
      // SCORING
      // ---------------------------------------------------

      {
        category: "Scoring",
        label: "Goals",
        value: stats.reduce(
          (sum, stat) =>
            sum + safeNumber(stat.goals),
          0
        ),
        total: true,
      },

      {
        category: "Scoring",
        label: "Shots",
        value: stats.reduce(
          (sum, stat) =>
            sum + safeNumber(stat.shots),
          0
        ),
        total: true,
      },

      {
        category: "Scoring",
        label: "Shots on Target",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.shotsOnTarget
            ),
          0
        ),
        total: true,
      },

      {
        category: "Scoring",
        label: "Assists",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(stat.assists),
          0
        ),
        total: true,
      },

      {
        category: "Scoring",
        label: "Key Passes",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.keyPasses
            ),
          0
        ),
        total: true,
      },

      // ---------------------------------------------------
      // PASSING
      // ---------------------------------------------------

      {
        category: "Passing",
        label: "Passes",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.passes
            ),
          0
        ),
        total: true,
      },

      {
        category: "Passing",
        label: "Successful Passes",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.successfulPasses
            ),
          0
        ),
        total: true,
      },

      {
        category: "Passing",
        label: "Instrumental Passes",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.instrumentalPasses
            ),
          0
        ),
        total: true,
      },

      // ---------------------------------------------------
      // DRIBBLING
      // ---------------------------------------------------

      {
        category: "Dribbling",
        label: "Dribbles",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.dribbles
            ),
          0
        ),
        total: true,
      },

      {
        category: "Dribbling",
        label: "Successful Dribbles",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.successfulDribbles
            ),
          0
        ),
        total: true,
      },

      {
        category: "Dribbling",
        label: "Instrumental Dribbles",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.instrumentalDribbles
            ),
          0
        ),
        total: true,
      },

      // ---------------------------------------------------
      // RECEIVING
      // ---------------------------------------------------

      {
        category: "Receiving",
        label: "Receiving",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.receiving
            ),
          0
        ),
        total: true,
      },

      {
        category: "Receiving",
        label: "Good Receives",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.goodReceives
            ),
          0
        ),
        total: true,
      },

      // ---------------------------------------------------
      // ATTACKING MOVEMENT
      // ---------------------------------------------------

      {
        category: "Attacking Movement",
        label: "Overlaps",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.overlaps
            ),
          0
        ),
        total: true,
      },

      {
        category: "Attacking Movement",
        label: "Runs Out Wide",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.runsOutWide
            ),
          0
        ),
        total: true,
      },

      {
        category: "Attacking Movement",
        label: "Forward Runs",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.forwardRuns
            ),
          0
        ),
        total: true,
      },

      {
        category: "Attacking Movement",
        label: "Attacking Receives",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.attackingReceives
            ),
          0
        ),
        total: true,
      },

      // ---------------------------------------------------
      // DEFENSIVE
      // ---------------------------------------------------

      {
        category: "Defensive",
        label: "Intercepts",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.intercepts
            ),
          0
        ),
        total: true,
      },

      {
        category: "Defensive",
        label: "Tackles",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.tackles
            ),
          0
        ),
        total: true,
      },

      {
        category: "Defensive",
        label: "Impactful Steals",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.impactfulSteals
            ),
          0
        ),
        total: true,
      },

      // ---------------------------------------------------
      // PRESSING
      // ---------------------------------------------------

      {
        category: "Pressing",
        label: "Frontal Presses",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.frontalPresses
            ),
          0
        ),
        total: true,
      },

      {
        category: "Pressing",
        label: "Presses From Behind",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.pressesFromBehind
            ),
          0
        ),
        total: true,
      },

      // ---------------------------------------------------
      // POSITIONING
      // ---------------------------------------------------

      {
        category: "Positioning",
        label: "Good Positioning",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.goodPositioning
            ),
          0
        ),
        total: true,
      },

      // ---------------------------------------------------
      // MARKING / DEFENSIVE SUPPORT
      // ---------------------------------------------------

      {
        category: "Marking / Defensive Support",
        label: "Double Marks",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.doubleMarks
            ),
          0
        ),
        total: true,
      },

      {
        category: "Marking / Defensive Support",
        label: "Passes Obstructed",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.passesObstructed
            ),
          0
        ),
        total: true,
      },

      {
        category: "Marking / Defensive Support",
        label: "Players Marked",
        value: stats.reduce(
          (sum, stat) =>
            sum +
            safeNumber(
              stat.playersMarked
            ),
          0
        ),
        total: true,
      },
    ];
  }, [stats, performance]);

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
        <Link
          href="/players"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to Players
        </Link>

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
        <Link
          href="/players"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to Players
        </Link>
      </div>

      {/* ===================================================
          PLAYER SUMMARY
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
          SUMMARY CARDS
      ==================================================== */}

      <section className="mt-6 grid gap-4 md:grid-cols-3">

        {/* AVERAGE TOTAL POINTS */}

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

        {/* TOTAL GOALS */}

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

        {/* TOTAL ASSISTS */}

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

        {/* =================================================
            PERFORMANCE CATEGORIES
        ================================================== */}

        <div className="rounded-xl border bg-card p-6 shadow-sm">

          <div>
            <h2 className="text-xl font-semibold">
              Average Performance
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Average score across the six main performance categories.
            </p>
          </div>

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
                        (item.value / 3) * 100,
                        100
                      )}%`,
                    }}
                  />

                </div>

              </div>

            ))}

          </div>
        </div>

        {/* =================================================
            RADAR CHART
        ================================================== */}

        <div className="rounded-xl border bg-card p-6 shadow-sm">

          <div>

            <h2 className="text-xl font-semibold">
              Performance Radar
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Average performance profile across all analyzed matches.
            </p>

          </div>

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
                    domain={[0, 3]}
                    tickCount={4}
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

      <section className="mt-6">

        <div className="rounded-xl border bg-card p-6 shadow-sm">

          <div>

            <h2 className="text-xl font-semibold">
              Performance Trend
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Performance development across each analyzed match.
            </p>

          </div>

          {performanceTrendData.length === 0 ? (

            <div className="mt-6 flex h-[400px] items-center justify-center rounded-lg bg-muted/30">

              <div className="text-center">

                <p className="text-sm font-medium">
                  No performance trend available.
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Player statistics are required to display the trend.
                </p>

              </div>

            </div>

          ) : (

            <div className="mt-6 h-[420px] w-full">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <LineChart
                  data={performanceTrendData}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 0,
                    bottom: 10,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="matchLabel"
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    domain={[0, 3]}
                    tickLine={false}
                    axisLine={false}
                    tickCount={4}
                  />

                  <Tooltip
                    content={({ active, payload }) => {

                      if (
                        !active ||
                        !payload ||
                        payload.length === 0
                      ) {
                        return null;
                      }

                      const data =
                        payload[0]
                          ?.payload;

                      if (!data) {
                        return null;
                      }

                      return (
                        <div className="rounded-lg border bg-background p-4 shadow-lg">

                          <div className="font-semibold">
                            {data.matchLabel}
                          </div>

                          <div className="mt-1 text-sm text-muted-foreground">
                            vs {data.opponent}
                          </div>

                          {data.date && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {data.date}
                            </div>
                          )}

                          <div className="mt-3 space-y-1 text-sm">

                            <div className="flex justify-between gap-6">
                              <span>
                                Attacking
                              </span>

                              <span className="font-medium">
                                {data.attacking.toFixed(1)}
                              </span>
                            </div>

                            <div className="flex justify-between gap-6">
                              <span>
                                Shooting
                              </span>

                              <span className="font-medium">
                                {data.shooting.toFixed(1)}
                              </span>
                            </div>

                            <div className="flex justify-between gap-6">
                              <span>
                                Duelling
                              </span>

                              <span className="font-medium">
                                {data.duelling.toFixed(1)}
                              </span>
                            </div>

                            <div className="flex justify-between gap-6">
                              <span>
                                Defensive
                              </span>

                              <span className="font-medium">
                                {data.defensive.toFixed(1)}
                              </span>
                            </div>

                            <div className="flex justify-between gap-6">
                              <span>
                                Passing
                              </span>

                              <span className="font-medium">
                                {data.passing.toFixed(1)}
                              </span>
                            </div>

                            <div className="flex justify-between gap-6">
                              <span>
                                Dribbling
                              </span>

                              <span className="font-medium">
                                {data.dribbling.toFixed(1)}
                              </span>
                            </div>

                          </div>

                        </div>
                      );
                    }}
                  />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="attacking"
                    name="Attacking"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="shooting"
                    name="Shooting"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="duelling"
                    name="Duelling"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="defensive"
                    name="Defensive"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="passing"
                    name="Passing"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="dribbling"
                    name="Dribbling"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />

                </LineChart>

              </ResponsiveContainer>

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

                      return (

                        <tr
                          key={match.id}
                          className="border-b last:border-0"
                        >

                          <td className="px-6 py-4">
                            {match.matchDate}
                          </td>

                          <td className="px-6 py-4 font-medium">
                            {match.opponent}
                          </td>

                          <td className="px-6 py-4 text-center font-semibold">
                            {match.scoreFor} -{" "}
                            {match.scoreAgainst}
                          </td>

                          <td className="px-6 py-4 text-center">
                            {matchStat
                              ? matchStat.totalPoints
                              : "-"}
                          </td>

                          <td className="px-6 py-4 text-center">
                            {matchStat
                              ? matchStat.goals
                              : "-"}
                          </td>

                          <td className="px-6 py-4 text-center">
                            {matchStat
                              ? matchStat.assists
                              : "-"}
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
          FOOTER INFORMATION
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