"use client";

import { useEffect, useState } from "react";

import { getMatches } from "@/services/match-service";
import { getPlayers } from "@/services/player-service";

import {
  savePlayerMatchStats,
  getStatsByMatch,
} from "@/services/player-stats-service";

import { Match } from "@/types/match";
import { Player } from "@/types/player";
import { PlayerMatchStats } from "@/types/player-stats";

// ============================================================
// STATISTIC GROUPS
// ============================================================

const statisticGroups = [
  {
    title: "Overall",
    fields: [
      {
        key: "totalPoints",
        label: "Total Points",
      },
    ],
  },

  {
    title: "Main Performance",
    fields: [
      {
        key: "attackingPositioning",
        label: "Attacking Positioning",
      },
      {
        key: "shooting",
        label: "Shooting",
      },
      {
        key: "duelling",
        label: "Duelling",
      },
      {
        key: "defensivePositioning",
        label: "Defensive Positioning",
      },
      {
        key: "passing",
        label: "Passing",
      },
      {
        key: "dribbling",
        label: "Dribbling",
      },
    ],
  },

  {
    title: "Scoring",
    fields: [
      {
        key: "goals",
        label: "Goals",
      },
      {
        key: "shots",
        label: "Shots",
      },
      {
        key: "shotsOnTarget",
        label: "Shots on Target",
      },
      {
        key: "assists",
        label: "Assists",
      },
      {
        key: "keyPasses",
        label: "Key Passes",
      },
    ],
  },

  {
    title: "Passing",
    fields: [
      {
        key: "passes",
        label: "Passes",
      },
      {
        key: "successfulPasses",
        label: "Successful Passes",
      },
      {
        key: "instrumentalPasses",
        label: "Instrumental Passes",
      },
    ],
  },

  {
    title: "Dribbling",
    fields: [
      {
        key: "dribbles",
        label: "Dribbles",
      },
      {
        key: "successfulDribbles",
        label: "Successful Dribbles",
      },
      {
        key: "instrumentalDribbles",
        label: "Instrumental Dribbles",
      },
    ],
  },

  {
    title: "Receiving",
    fields: [
      {
        key: "receiving",
        label: "Receiving",
      },
      {
        key: "goodReceives",
        label: "Good Receives",
      },
    ],
  },

  {
    title: "Attacking Movement",
    fields: [
      {
        key: "overlaps",
        label: "Overlaps",
      },
      {
        key: "runsOutWide",
        label: "Runs Out Wide",
      },
      {
        key: "forwardRuns",
        label: "Forward Runs",
      },
      {
        key: "attackingReceives",
        label: "Attacking Receives",
      },
    ],
  },

  {
    title: "Defensive",
    fields: [
      {
        key: "intercepts",
        label: "Intercepts",
      },
      {
        key: "tackles",
        label: "Tackles",
      },
      {
        key: "impactfulSteals",
        label: "Impactful Steals",
      },
    ],
  },

  {
    title: "Pressing",
    fields: [
      {
        key: "frontalPresses",
        label: "Frontal Presses",
      },
      {
        key: "pressesFromBehind",
        label: "Presses from Behind",
      },
    ],
  },

  {
    title: "Positioning",
    fields: [
      {
        key: "goodPositioning",
        label: "Good Positioning",
      },
    ],
  },

  {
    title: "Marking / Defensive Support",
    fields: [
      {
        key: "doubleMarks",
        label: "Double Marks",
      },
      {
        key: "passesObstructed",
        label: "Passes Obstructed",
      },
      {
        key: "playersMarked",
        label: "Players Marked",
      },
    ],
  },
] as const;

// ============================================================
// EMPTY STATS
// ============================================================

function createEmptyStats(): Record<string, number> {
  return {
    totalPoints: 0,

    attackingPositioning: 0,
    shooting: 0,
    duelling: 0,
    defensivePositioning: 0,
    passing: 0,
    dribbling: 0,

    goals: 0,
    shots: 0,
    shotsOnTarget: 0,
    assists: 0,
    keyPasses: 0,

    passes: 0,
    successfulPasses: 0,
    instrumentalPasses: 0,

    dribbles: 0,
    successfulDribbles: 0,
    instrumentalDribbles: 0,

    receiving: 0,
    goodReceives: 0,

    overlaps: 0,
    runsOutWide: 0,
    forwardRuns: 0,
    attackingReceives: 0,

    intercepts: 0,
    tackles: 0,
    impactfulSteals: 0,

    frontalPresses: 0,
    pressesFromBehind: 0,

    goodPositioning: 0,

    doubleMarks: 0,
    passesObstructed: 0,
    playersMarked: 0,
  };
}

// ============================================================
// COMPONENT
// ============================================================

export default function PlayerStatsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const [selectedMatchId, setSelectedMatchId] =
    useState("");

  const [selectedMatch, setSelectedMatch] =
    useState<Match | null>(null);

  const [stats, setStats] =
    useState<PlayerMatchStats[]>([]);

  const [playerForms, setPlayerForms] =
    useState<Record<string, Record<string, number>>>({});

  const [loading, setLoading] = useState(true);

  const [savingPlayerId, setSavingPlayerId] =
    useState<string | null>(null);

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  async function loadData() {
    try {
      setLoading(true);

      const [matchData, playerData] =
        await Promise.all([
          getMatches(),
          getPlayers(),
        ]);

      setMatches(matchData);
      setPlayers(playerData);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ==========================================================
  // FIND PLAYER
  // ==========================================================

  function getPlayer(playerId: string) {
    return players.find(
      (player) => player.id === playerId
    );
  }

  // ==========================================================
  // SELECT MATCH
  // ==========================================================

  async function handleMatchChange(
    matchId: string
  ) {
    setSelectedMatchId(matchId);

    const match =
      matches.find(
        (item) => item.id === matchId
      ) || null;

    setSelectedMatch(match);

    setPlayerForms({});

    if (!matchId || !match) {
      setStats([]);
      return;
    }

    try {
      const existingStats =
        await getStatsByMatch(matchId);

      setStats(existingStats);

      // Create form values for both players
      const forms: Record<
        string,
        Record<string, number>
      > = {};

      match.playerIds?.forEach((playerId) => {
        const existing =
          existingStats.find(
            (item) =>
              item.playerId === playerId
          );

        if (existing) {
          forms[playerId] = {
            totalPoints: existing.totalPoints,

            attackingPositioning:
              existing.attackingPositioning,

            shooting: existing.shooting,

            duelling: existing.duelling,

            defensivePositioning:
              existing.defensivePositioning,

            passing: existing.passing,

            dribbling: existing.dribbling,

            goals: existing.goals,

            shots: existing.shots,

            shotsOnTarget:
              existing.shotsOnTarget,

            assists: existing.assists,

            keyPasses: existing.keyPasses,

            passes: existing.passes,

            successfulPasses:
              existing.successfulPasses,

            instrumentalPasses:
              existing.instrumentalPasses,

            dribbles: existing.dribbles,

            successfulDribbles:
              existing.successfulDribbles,

            instrumentalDribbles:
              existing.instrumentalDribbles,

            receiving: existing.receiving,

            goodReceives:
              existing.goodReceives,

            overlaps: existing.overlaps,

            runsOutWide:
              existing.runsOutWide,

            forwardRuns:
              existing.forwardRuns,

            attackingReceives:
              existing.attackingReceives,

            intercepts: existing.intercepts,

            tackles: existing.tackles,

            impactfulSteals:
              existing.impactfulSteals,

            frontalPresses:
              existing.frontalPresses,

            pressesFromBehind:
              existing.pressesFromBehind,

            goodPositioning:
              existing.goodPositioning,

            doubleMarks:
              existing.doubleMarks,

            passesObstructed:
              existing.passesObstructed,

            playersMarked:
              existing.playersMarked,
          };
        } else {
          forms[playerId] =
            createEmptyStats();
        }
      });

      setPlayerForms(forms);
    } catch (error) {
      console.error(
        "Failed to load match statistics:",
        error
      );
    }
  }

  // ==========================================================
  // UPDATE FORM VALUE
  // ==========================================================

  function updateStat(
    playerId: string,
    field: string,
    value: string
  ) {
    const numberValue =
      value === "" ? 0 : Number(value);

    setPlayerForms((current) => ({
      ...current,

      [playerId]: {
        ...(current[playerId] ||
          createEmptyStats()),

        [field]: numberValue,
      },
    }));
  }

  // ==========================================================
  // SAVE PLAYER STATISTICS
  // ==========================================================

  async function handleSavePlayerStats(
    playerId: string
  ) {
    if (!selectedMatch) {
      alert("Please select a match first.");
      return;
    }

    const form =
      playerForms[playerId];

    if (!form) {
      alert("Statistics form not found.");
      return;
    }

    try {
      setSavingPlayerId(playerId);

      await savePlayerMatchStats({
        matchId: selectedMatch.id,

        playerId,

        totalPoints:
          form.totalPoints,

        attackingPositioning:
          form.attackingPositioning,

        shooting:
          form.shooting,

        duelling:
          form.duelling,

        defensivePositioning:
          form.defensivePositioning,

        passing:
          form.passing,

        dribbling:
          form.dribbling,

        goals:
          form.goals,

        shots:
          form.shots,

        shotsOnTarget:
          form.shotsOnTarget,

        assists:
          form.assists,

        keyPasses:
          form.keyPasses,

        passes:
          form.passes,

        successfulPasses:
          form.successfulPasses,

        instrumentalPasses:
          form.instrumentalPasses,

        dribbles:
          form.dribbles,

        successfulDribbles:
          form.successfulDribbles,

        instrumentalDribbles:
          form.instrumentalDribbles,

        receiving:
          form.receiving,

        goodReceives:
          form.goodReceives,

        overlaps:
          form.overlaps,

        runsOutWide:
          form.runsOutWide,

        forwardRuns:
          form.forwardRuns,

        attackingReceives:
          form.attackingReceives,

        intercepts:
          form.intercepts,

        tackles:
          form.tackles,

        impactfulSteals:
          form.impactfulSteals,

        frontalPresses:
          form.frontalPresses,

        pressesFromBehind:
          form.pressesFromBehind,

        goodPositioning:
          form.goodPositioning,

        doubleMarks:
          form.doubleMarks,

        passesObstructed:
          form.passesObstructed,

        playersMarked:
          form.playersMarked,
      });

      const updatedStats =
        await getStatsByMatch(
          selectedMatch.id
        );

      setStats(updatedStats);

      alert(
        "Player statistics berhasil disimpan."
      );
    } catch (error) {
      console.error(
        "Failed to save player statistics:",
        error
      );

      alert(
        "Gagal menyimpan player statistics."
      );
    } finally {
      setSavingPlayerId(null);
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="p-6 md:p-8">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Player Match Statistics
        </h1>

        <p className="mt-1 text-muted-foreground">
          Enter and manage detailed player
          performance for each match.
        </p>
      </div>

      {/* =====================================================
          MATCH SELECTOR
      ====================================================== */}

      <div className="mt-8 rounded-xl border bg-card p-6 shadow-sm">

        <label className="mb-2 block text-sm font-medium">
          Select Match
        </label>

        <select
          value={selectedMatchId}
          onChange={(event) =>
            handleMatchChange(
              event.target.value
            )
          }
          className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-black md:max-w-xl"
        >

          <option value="">
            Select a match...
          </option>

          {matches.map((match) => (
            <option
              key={match.id}
              value={match.id}
            >
              {match.matchDate} —{" "}
              {match.ourTeam} vs{" "}
              {match.opponent} —{" "}
              {match.scoreFor}-
              {match.scoreAgainst}
            </option>
          ))}

        </select>

      </div>

      {/* =====================================================
          LOADING
      ====================================================== */}

      {loading && (
        <div className="mt-6 text-sm text-muted-foreground">
          Loading data...
        </div>
      )}

      {/* =====================================================
          MATCH INFORMATION
      ====================================================== */}

      {selectedMatch && (
        <div className="mt-6 rounded-xl border bg-card p-6 shadow-sm">

          <p className="text-sm text-muted-foreground">
            Selected Match
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            {selectedMatch.ourTeam}{" "}
            {selectedMatch.scoreFor} -{" "}
            {selectedMatch.scoreAgainst}{" "}
            {selectedMatch.opponent}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {selectedMatch.matchDate}
          </p>

        </div>
      )}

      {/* =====================================================
          PLAYERS
      ====================================================== */}

      {selectedMatch &&
        selectedMatch.playerIds?.length === 2 && (

          <div className="mt-8 space-y-8">

            {selectedMatch.playerIds.map(
              (playerId, playerIndex) => {

                const player =
                  getPlayer(playerId);

                const form =
                  playerForms[playerId] ||
                  createEmptyStats();

                const existingStats =
                  stats.find(
                    (item) =>
                      item.playerId ===
                      playerId
                  );

                return (
                  <section
                    key={playerId}
                    className="overflow-hidden rounded-xl border bg-card shadow-sm"
                  >

                    {/* PLAYER HEADER */}

                    <div className="border-b bg-muted/30 p-6">

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Player {playerIndex + 1}
                          </p>

                          <h2 className="mt-1 text-2xl font-bold">
                            {player?.name ||
                              "Unknown Player"}
                          </h2>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {player?.username ||
                              "No username"}
                          </p>

                        </div>

                        <div
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            existingStats
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {existingStats
                            ? "Stats Added"
                            : "Not Saved"}
                        </div>

                      </div>

                    </div>

                    {/* STATISTICS */}

                    <div className="space-y-8 p-6">

                      {statisticGroups.map(
                        (group) => (

                          <div
                            key={group.title}
                          >

                            <div className="mb-4">

                              <h3 className="text-lg font-semibold">
                                {group.title}
                              </h3>

                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                              {group.fields.map(
                                (field) => (

                                  <div
                                    key={field.key}
                                  >

                                    <label className="mb-2 block text-sm font-medium">
                                      {field.label}
                                    </label>

                                    <input
                                      type="number"
                                      min="0"
                                      value={
                                        form[
                                          field.key
                                        ] ?? 0
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        updateStat(
                                          playerId,
                                          field.key,
                                          event.target.value
                                        )
                                      }
                                      className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
                                    />

                                  </div>

                                )
                              )}

                            </div>

                          </div>

                        )
                      )}

                    </div>

                    {/* SAVE */}

                    <div className="border-t bg-muted/20 p-6">

                      <button
                        onClick={() =>
                          handleSavePlayerStats(
                            playerId
                          )
                        }
                        disabled={
                          savingPlayerId ===
                          playerId
                        }
                        className="rounded-md bg-black px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        {savingPlayerId ===
                        playerId
                          ? "Saving..."
                          : `Save Player ${
                              playerIndex + 1
                            } Statistics`}
                      </button>

                    </div>

                  </section>
                );
              }
            )}

          </div>
        )}

      {/* =====================================================
          INVALID MATCH
      ====================================================== */}

      {selectedMatch &&
        (!selectedMatch.playerIds ||
          selectedMatch.playerIds.length !== 2) && (

          <div className="mt-8 rounded-xl border border-yellow-300 bg-yellow-50 p-6">

            <h2 className="font-semibold text-yellow-800">
              This match does not have exactly
              2 players assigned.
            </h2>

            <p className="mt-1 text-sm text-yellow-700">
              Please return to the Matches page
              and assign exactly 2 Indonesian
              players to this match.
            </p>

          </div>
        )}

      {/* =====================================================
          NO MATCHES
      ====================================================== */}

      {!loading &&
        matches.length === 0 && (

          <div className="mt-8 rounded-xl border border-dashed p-8 text-center">

            <h2 className="font-semibold">
              No matches found
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Create a match first from the
              Matches page.
            </p>

          </div>
        )}

    </main>
  );
}