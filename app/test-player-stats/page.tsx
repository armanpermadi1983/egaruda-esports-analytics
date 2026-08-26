"use client";

import { useState } from "react";

import {
  createPlayerMatchStats,
  getPlayerStatsByMatch,
} from "@/services/player-stats-service";

export default function TestPlayerStatsPage() {
  const [result, setResult] = useState("");

  async function handleTest() {
    try {
      // =====================================================
      // TEST DATA
      // =====================================================

      const statsId =
        await createPlayerMatchStats({
          matchId: "TEST_MATCH_001",

          playerId: "TEST_PLAYER_001",

          totalPoints: 1099,

          attackingPositioning: 78,

          shooting: 112,

          duelling: 363,

          defensivePositioning: 275,

          passing: 143,

          dribbling: 128,

          goals: 1,

          shots: 5,

          shotsOnTarget: 3,

          assists: 2,

          keyPasses: 0,

          passes: 52,

          successfulPasses: 42,

          instrumentalPasses: 1,

          dribbles: 50,

          successfulDribbles: 41,

          instrumentalDribbles: 4,

          receiving: 13,

          goodReceives: 4,

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
        });

      console.log(
        "Created stats:",
        statsId
      );


      // =====================================================
      // TEST READ
      // =====================================================

      const stats =
        await getPlayerStatsByMatch(
          "TEST_MATCH_001"
        );

      console.log(
        "Stats by match:",
        stats
      );


      setResult(
        `Success! Stats ID: ${statsId}`
      );

    } catch (error) {

      console.error(
        "Failed to test player stats:",
        error
      );

      setResult(
        "Failed. Check browser console."
      );
    }
  }


  return (
    <main className="p-8">

      <h1 className="text-2xl font-bold">
        Test Player Match Stats
      </h1>

      <p className="mt-2 text-muted-foreground">
        Test Firestore player statistics.
      </p>

      <button
        type="button"
        onClick={handleTest}
        className="mt-6 rounded-md bg-black px-5 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        Test Save Player Stats
      </button>

      {result && (
        <div className="mt-6 rounded-lg border p-4">
          {result}
        </div>
      )}

    </main>
  );
}