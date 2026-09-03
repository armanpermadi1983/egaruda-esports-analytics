"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/utils/date-formatter";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

import { getMatch } from "@/services/match-service";
import { getPlayers } from "@/services/player-service";
import {
  getPlayerStatsByMatch,
} from "@/services/player-stats-service";

import { Match } from "@/types/match";
import { Player } from "@/types/player";
import { PlayerMatchStats } from "@/types/player-stats";


// =========================================================
// HELPERS
// =========================================================

function displayValue(
  value: number | null | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "-";
  }

  return value;
}


function calculatePercentage(
  successful: number | null | undefined,
  total: number | null | undefined
) {
  if (
    successful === null ||
    successful === undefined ||
    total === null ||
    total === undefined ||
    total === 0
  ) {
    return null;
  }

  return Math.round(
    (successful / total) * 100
  );
}


// =========================================================
// STAT CARD
// =========================================================

function StatCard({
  label,
  value,
  percentage,
}: {
  label: string;
  value: number | null | undefined;
  percentage?: number | null;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">

      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">

        <div className="text-2xl font-bold">
          {displayValue(value)}
        </div>

        {percentage !== undefined &&
          percentage !== null && (
            <div className="text-xs font-semibold text-muted-foreground">
              {percentage}%
            </div>
          )}

      </div>

    </div>
  );
}


// =========================================================
// PERFORMANCE BAR
// =========================================================

function PerformanceBar({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {

  const numericValue =
    typeof value === "number"
      ? value
      : 0;

  /*
   * eFootball performance values in the
   * current dataset can be larger than 100.
   *
   * We use 400 as a visual reference
   * so that the bar remains useful.
   */

  const width = Math.min(
    Math.max(
      (numericValue / 400) * 100,
      0
    ),
    100
  );

  return (
    <div>

      <div className="flex items-center justify-between text-sm">

        <span>
          {label}
        </span>

        <span className="font-semibold">
          {displayValue(value)}
        </span>

      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">

        <div
          className="h-full rounded-full bg-black transition-all"
          style={{
            width: `${width}%`,
          }}
        />

      </div>

    </div>
  );
}


// =========================================================
// CATEGORY SECTION
// =========================================================

function CategorySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">

      <div className="mb-3 text-sm font-semibold">
        {title}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>

    </div>
  );
}


// =========================================================
// MAIN PAGE
// =========================================================

export default function MatchDetailPage() {
  const router = useRouter();
  const params = useParams();

  const matchId =
    params.matchId as string;


  // =========================================================
  // STATE
  // =========================================================

  const [match, setMatch] =
    useState<Match | null>(null);

  const [players, setPlayers] =
    useState<Player[]>([]);

  const [playerStats, setPlayerStats] =
    useState<PlayerMatchStats[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [analyzing, setAnalyzing] =
    useState(false);

  const [analysisMessage, setAnalysisMessage] =
    useState("");

  // =========================================================
  // LOAD MATCH DETAIL
  // =========================================================

  async function loadMatchDetail() {

    try {

      setLoading(true);
      setError("");

      // -------------------------------------------------------
      // MATCH
      // -------------------------------------------------------

      const matchData =
        await getMatch(matchId);

      if (!matchData) {

        setError(
          "Match tidak ditemukan."
        );

        return;
      }

      setMatch(matchData);


      // -------------------------------------------------------
      // PLAYERS
      // -------------------------------------------------------

      const playerData =
        await getPlayers();

      const matchPlayers =
        playerData.filter(
          (player) =>
            matchData.playerIds?.includes(
              player.id
            )
        );

      setPlayers(matchPlayers);


      // -------------------------------------------------------
      // PLAYER STATS
      // -------------------------------------------------------

      const stats =
        await getPlayerStatsByMatch(
          matchId
        );

      setPlayerStats(stats);

      console.log(
        "Loaded player statistics:",
        stats
      );

    } catch (error) {

      console.error(
        "Failed to load match detail:",
        error
      );

      setError(
        "Gagal memuat detail pertandingan."
      );

    } finally {

      setLoading(false);

    }
  }


  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {

    if (!matchId) {
      return;
    }

    loadMatchDetail();

  }, [matchId]);


  // =========================================================
  // GET PLAYER STATS
  // =========================================================

  function getStatsForPlayer(
    playerId: string
  ) {

    return playerStats.find(
      (stats) =>
        stats.playerId === playerId
    );
  }


  // =========================================================
  // ANALYZE SCREENSHOTS
  // =========================================================

  async function handleAnalyzeScreenshots() {

    if (analyzing) {
      return;
    }


    // -------------------------------------------------------
    // SCREENSHOTS
    // -------------------------------------------------------

    if (
      screenshotUrls.length === 0
    ) {

      alert(
        "Tidak ada screenshot yang dapat dianalisis."
      );

      return;
    }


    // -------------------------------------------------------
    // PLAYERS
    // -------------------------------------------------------

    if (players.length !== 2) {

      alert(
        "Pertandingan harus memiliki tepat 2 pemain."
      );

      return;
    }


    try {

      setAnalyzing(true);

      setAnalysisMessage(
        "Mengirim screenshot ke Gemini..."
      );


      console.log(
        "Starting screenshot analysis..."
      );

      console.log(
        "Match ID:",
        matchId
      );

      console.log(
        "Screenshot count:",
        screenshotUrls.length
      );

      console.log(
        "Players:",
        players
      );


      // -----------------------------------------------------
      // CALL API
      // -----------------------------------------------------

      const response =
        await fetch(
          "/api/analyze-match",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              matchId,

              screenshotUrls,

              players:
                players.map(
                  (player) => ({
                    id: player.id,
                    name: player.name,
                    username:
                      player.username ||
                      "",
                  })
                ),
            }),
          }
        );


      // -----------------------------------------------------
      // RESPONSE
      // -----------------------------------------------------

      const result =
        await response.json();


      console.log(
        "Analyze API response:",
        result
      );


      if (!response.ok) {

        throw new Error(
          result.error ||
            "Gagal menganalisis screenshot."
        );
      }


      if (!result.success) {

        throw new Error(
          result.error ||
            "Gemini gagal menganalisis screenshot."
        );
      }


      // -----------------------------------------------------
      // SUCCESS
      // -----------------------------------------------------

      console.log(
        "Gemini analysis successful:"
      );

      console.log(
        result.players
      );


      setAnalysisMessage(
        `Analisis berhasil. ${result.players.length} pemain berhasil dianalisis dari ${result.screenshotCount} screenshot.`
      );


      // -----------------------------------------------------
      // IMPORTANT
      // Reload Firestore data
      // -----------------------------------------------------

      await loadMatchDetail();


      alert(
        "Analisis screenshot berhasil!\n\nData statistik pemain sudah diperbarui."
      );

    } catch (error) {

      console.error(
        "Failed to analyze screenshots:",
        error
      );


      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menganalisis screenshot.";


      setAnalysisMessage(
        `Gagal: ${message}`
      );


      alert(
        `Gagal menganalisis screenshot.\n\n${message}`
      );

    } finally {

      setAnalyzing(false);

    }
  }


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {

    return (
      <main className="p-6 md:p-8">

        <div className="rounded-xl border bg-card p-8 text-center">

          <p className="text-sm text-muted-foreground">
            Loading match detail...
          </p>

        </div>

      </main>
    );
  }


  // =========================================================
  // ERROR
  // =========================================================

  if (
    error ||
    !match
  ) {

    return (
      <main className="p-6 md:p-8">

        <div className="mb-6">

          <button
            onClick={() => router.back()}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to Matches
          </button>

        </div>


        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">

          <h1 className="text-xl font-semibold text-red-700">
            Match Not Found
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {error ||
              "Match tidak ditemukan."}
          </p>

        </div>

      </main>
    );
  }


  // =========================================================
  // SCREENSHOTS
  // =========================================================

  const screenshotUrls =
    match.screenshotUrls || [];


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="p-6 md:p-8">

      {/* =====================================================
          BACK
      ====================================================== */}

      <div className="mb-6">

        <button
          onClick={() => router.back()}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to Matches
        </button>

      </div>


      {/* =====================================================
          MATCH HEADER
      ====================================================== */}

      <div className="rounded-xl border bg-card shadow-sm">

        <div className="p-6 md:p-8">

          <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Match Detail
          </div>


          <div className="mt-6 flex flex-col items-center justify-center gap-4 md:flex-row md:gap-12">

            {/* OUR TEAM */}

            <div className="text-center">

              <div className="text-lg font-semibold">
                {match.ourTeam}
              </div>

              <div className="mt-1 text-sm text-muted-foreground">
                Indonesia
              </div>

            </div>


            {/* SCORE */}

            <div className="text-center">

              <div className="text-4xl font-bold tracking-tight">
                {match.scoreFor} -{" "}
                {match.scoreAgainst}
              </div>

              <div className="mt-2 text-sm text-muted-foreground">
                {formatDate(match.matchDate)}
              </div>

            </div>


            {/* OPPONENT */}

            <div className="text-center">

              <div className="text-lg font-semibold">
                {match.opponent}
              </div>

              {match.opponentCountry && (
                <div className="mt-1 text-sm text-muted-foreground">
                  {match.opponentCountry}
                </div>
              )}

            </div>

          </div>


          {/* MATCH META */}

          <div className="mt-8 grid gap-4 border-t pt-6 sm:grid-cols-2 lg:grid-cols-4">

            <div>

              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tournament
              </div>

              <div className="mt-1 font-medium">
                {match.tournament || "-"}
              </div>

            </div>


            <div>

              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Competition
              </div>

              <div className="mt-1 font-medium">
                {match.competition || "-"}
              </div>

            </div>


            <div>

              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Players
              </div>

              <div className="mt-1 font-medium">
                {players.length}
              </div>

            </div>


            <div>

              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Screenshots
              </div>

              <div className="mt-1 font-medium">
                {screenshotUrls.length}
              </div>

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          SCREENSHOTS
      ====================================================== */}

      <section className="mt-8">

        <div className="mb-4">

          <h2 className="text-xl font-semibold">
            Match Screenshots
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Statistics screenshots uploaded for this match.
          </p>

        </div>


        {screenshotUrls.length === 0 ? (

          <div className="rounded-xl border border-dashed p-8 text-center">

            <p className="text-sm text-muted-foreground">
              No screenshots uploaded.
            </p>

          </div>

        ) : (

          <div className="grid gap-5 md:grid-cols-2">

            {screenshotUrls.map(
              (url, index) => (

                <div
                  key={url}
                  className="overflow-hidden rounded-xl border bg-card shadow-sm"
                >

                  <div className="border-b px-4 py-3">

                    <div className="text-sm font-medium">
                      Screenshot {index + 1}
                    </div>

                  </div>


                  <div className="bg-muted/20 p-3">

                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >

                      <img
                        src={url}
                        alt={`Match screenshot ${index + 1}`}
                        className="max-h-[700px] w-full rounded-lg object-contain"
                      />

                    </a>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </section>


      {/* =====================================================
          PLAYERS
      ====================================================== */}

      <section className="mt-8">

        <div className="mb-4">

          <h2 className="text-xl font-semibold">
            Players
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Indonesian players who participated in this match.
          </p>

        </div>


        {players.length === 0 ? (

          <div className="rounded-xl border border-dashed p-8 text-center">

            <p className="text-sm text-muted-foreground">
              No players assigned to this match.
            </p>

          </div>

        ) : (

          <div className="grid gap-5 lg:grid-cols-2">

            {players.map(
              (player) => {

                const stats =
                  getStatsForPlayer(
                    player.id
                  );


                return (

                  <div
                    key={player.id}
                    className="rounded-xl border bg-card p-5 shadow-sm"
                  >

                    {/* =================================================
                        PLAYER HEADER
                    ================================================== */}

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <div className="text-xl font-bold">
                          {player.name}
                        </div>

                        <div className="mt-1 text-sm text-muted-foreground">
                          {player.username ||
                            "No username"}
                        </div>

                        {player.position && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {player.position}
                          </div>
                        )}

                      </div>


                      <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                        Player
                      </div>

                    </div>


                    {/* =================================================
                        NO STATS
                    ================================================== */}

                    {!stats ? (

                      <div className="mt-5 rounded-lg border border-dashed p-5">

                        <div className="text-sm font-medium">
                          Player Statistics
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground">
                          Statistics will appear after screenshot analysis.
                        </div>

                      </div>

                    ) : (

                      <div className="mt-6">

                        {/* =================================================
                            OVERALL
                        ================================================== */}

                        <div className="rounded-xl bg-muted/50 p-5">

                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Total Points
                          </div>

                          <div className="mt-1 text-4xl font-bold">
                            {displayValue(
                              stats.totalPoints
                            )}
                          </div>

                        </div>


                        {/* =================================================
                            SCORING
                        ================================================== */}

                        <CategorySection
                          title="Scoring"
                        >

                          <StatCard
                            label="Goals"
                            value={stats.goals}
                          />

                          <StatCard
                            label="Shots"
                            value={stats.shots}
                          />

                          <StatCard
                            label="Shots on Target"
                            value={stats.shotsOnTarget}
                            percentage={calculatePercentage(
                              stats.shotsOnTarget,
                              stats.shots
                            )}
                          />

                          <StatCard
                            label="Assists"
                            value={stats.assists}
                          />

                          <StatCard
                            label="Key Passes"
                            value={stats.keyPasses}
                          />

                        </CategorySection>


                        {/* =================================================
                            PASSING
                        ================================================== */}

                        <CategorySection
                          title="Passing"
                        >

                          <StatCard
                            label="Passes"
                            value={stats.passes}
                          />

                          <StatCard
                            label="Successful Passes"
                            value={
                              stats.successfulPasses
                            }
                            percentage={calculatePercentage(
                              stats.successfulPasses,
                              stats.passes
                            )}
                          />

                          <StatCard
                            label="Instrumental Passes"
                            value={
                              stats.instrumentalPasses
                            }
                          />

                        </CategorySection>


                        {/* =================================================
                            DRIBBLING
                        ================================================== */}

                        <CategorySection
                          title="Dribbling"
                        >

                          <StatCard
                            label="Dribbles"
                            value={stats.dribbles}
                          />

                          <StatCard
                            label="Successful Dribbles"
                            value={
                              stats.successfulDribbles
                            }
                            percentage={calculatePercentage(
                              stats.successfulDribbles,
                              stats.dribbles
                            )}
                          />

                          <StatCard
                            label="Instrumental Dribbles"
                            value={
                              stats.instrumentalDribbles
                            }
                          />

                        </CategorySection>


                        {/* =================================================
                            RECEIVING
                        ================================================== */}

                        <CategorySection
                          title="Receiving"
                        >

                          <StatCard
                            label="Receiving"
                            value={
                              stats.receiving
                            }
                          />

                          <StatCard
                            label="Good Receives"
                            value={
                              stats.goodReceives
                            }
                          />

                          <StatCard
                            label="Receive Efficiency"
                            value={
                              calculatePercentage(
                                stats.goodReceives,
                                stats.receiving
                              )
                            }
                          />

                        </CategorySection>


                        {/* =================================================
                            ATTACKING MOVEMENT
                        ================================================== */}

                        <CategorySection
                          title="Attacking Movement"
                        >

                          <StatCard
                            label="Overlaps"
                            value={
                              stats.overlaps
                            }
                          />

                          <StatCard
                            label="Runs Out Wide"
                            value={
                              stats.runsOutWide
                            }
                          />

                          <StatCard
                            label="Forward Runs"
                            value={
                              stats.forwardRuns
                            }
                          />

                          <StatCard
                            label="Attacking Receives"
                            value={
                              stats.attackingReceives
                            }
                          />

                        </CategorySection>


                        {/* =================================================
                            DEFENSIVE
                        ================================================== */}

                        <CategorySection
                          title="Defensive"
                        >

                          <StatCard
                            label="Intercepts"
                            value={
                              stats.intercepts
                            }
                          />

                          <StatCard
                            label="Tackles"
                            value={
                              stats.tackles
                            }
                          />

                          <StatCard
                            label="Impactful Steals"
                            value={
                              stats.impactfulSteals
                            }
                          />

                        </CategorySection>


                        {/* =================================================
                            PRESSING
                        ================================================== */}

                        <CategorySection
                          title="Pressing"
                        >

                          <StatCard
                            label="Frontal Presses"
                            value={
                              stats.frontalPresses
                            }
                          />

                          <StatCard
                            label="Presses From Behind"
                            value={
                              stats.pressesFromBehind
                            }
                          />

                        </CategorySection>


                        {/* =================================================
                            POSITIONING
                        ================================================== */}

                        <CategorySection
                          title="Positioning"
                        >

                          <StatCard
                            label="Good Positioning"
                            value={
                              stats.goodPositioning
                            }
                          />

                        </CategorySection>


                        {/* =================================================
                            MARKING
                        ================================================== */}

                        <CategorySection
                          title="Marking / Defensive Support"
                        >

                          <StatCard
                            label="Double Marks"
                            value={
                              stats.doubleMarks
                            }
                          />

                          <StatCard
                            label="Passes Obstructed"
                            value={
                              stats.passesObstructed
                            }
                          />

                          <StatCard
                            label="Players Marked"
                            value={
                              stats.playersMarked
                            }
                          />

                        </CategorySection>


                        {/* =================================================
                            TEAM EVALUATION
                        ================================================== */}

                        <div className="mt-8">

                          <div className="mb-4 text-sm font-semibold">
                            Team Evaluation
                          </div>

                          <div className="space-y-4">

                            <PerformanceBar
                              label="Attacking Positioning"
                              value={
                                stats.attackingPositioning
                              }
                            />

                            <PerformanceBar
                              label="Shooting"
                              value={
                                stats.shooting
                              }
                            />

                            <PerformanceBar
                              label="Duelling"
                              value={
                                stats.duelling
                              }
                            />

                            <PerformanceBar
                              label="Defensive Positioning"
                              value={
                                stats.defensivePositioning
                              }
                            />

                            <PerformanceBar
                              label="Passing"
                              value={
                                stats.passing
                              }
                            />

                            <PerformanceBar
                              label="Dribbling"
                              value={
                                stats.dribbling
                              }
                            />

                          </div>

                        </div>

                      </div>

                    )}

                  </div>

                );

              }
            )}

          </div>

        )}

      </section>


      {/* =====================================================
          ANALYSIS
      ====================================================== */}

      <section className="mt-8">

        <div className="rounded-xl border bg-card p-6 shadow-sm">

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>

              <h2 className="text-xl font-semibold">
                Screenshot Analysis
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Analyze the uploaded screenshots to extract player performance statistics.
              </p>

            </div>


            <button
              type="button"
              onClick={
                handleAnalyzeScreenshots
              }
              disabled={
                analyzing ||
                screenshotUrls.length === 0 ||
                players.length !== 2
              }
              className={`rounded-md px-5 py-2 text-sm font-medium text-white ${
                analyzing ||
                screenshotUrls.length === 0 ||
                players.length !== 2
                  ? "cursor-not-allowed bg-gray-400"
                  : "bg-black hover:bg-gray-800"
              }`}
            >

              {analyzing
                ? "Analyzing Screenshots..."
                : "Analyze Screenshots"}

            </button>

          </div>


          <div className="mt-4 rounded-lg bg-muted/50 p-4">

            {analysisMessage ? (

              <p className="text-xs text-muted-foreground">
                {analysisMessage}
              </p>

            ) : (

              <p className="text-xs text-muted-foreground">
                Click "Analyze Screenshots" to analyze
                the uploaded match statistics using Gemini AI.
              </p>

            )}

          </div>

        </div>

      </section>

    </main>
  );
}