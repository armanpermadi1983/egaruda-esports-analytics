"use client";

import { useEffect, useState } from "react";

import {
  createMatch,
  getMatches,
  updateMatchScreenshots,
} from "@/services/match-service";

import { getPlayers } from "@/services/player-service";
import { uploadMatchScreenshot } from "@/services/storage-service";

import { Match } from "@/types/match";
import { Player } from "@/types/player";

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [savingMatch, setSavingMatch] = useState(false);

  // =========================================================
  // SCREENSHOTS
  // =========================================================

  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] =
    useState<string[]>([]);

  // =========================================================
  // PLAYERS
  // =========================================================

  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] =
    useState<string[]>([]);

  // =========================================================
  // MATCH FORM
  // =========================================================

  const [matchDate, setMatchDate] = useState("");
  const [opponent, setOpponent] = useState("");
  const [opponentCountry, setOpponentCountry] = useState("");

  const [scoreFor, setScoreFor] = useState("");
  const [scoreAgainst, setScoreAgainst] = useState("");

  const [tournament, setTournament] = useState("");
  const [competition, setCompetition] = useState("");

  // =========================================================
  // LOAD MATCHES
  // =========================================================

  async function loadMatches() {
    try {
      setLoading(true);

      const data = await getMatches();

      setMatches(data);
    } catch (error) {
      console.error("Failed to load matches:", error);
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // LOAD PLAYERS
  // =========================================================

  async function loadPlayers() {
    try {
      const data = await getPlayers();

      setPlayers(data);
    } catch (error) {
      console.error("Failed to load players:", error);
    }
  }

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadPlayers();
    loadMatches();
  }, []);

  // =========================================================
  // SELECT / UNSELECT PLAYER
  // MAXIMUM 2 PLAYERS
  // =========================================================

  function togglePlayer(playerId: string) {
    setSelectedPlayerIds((current) => {
      // Remove player if already selected
      if (current.includes(playerId)) {
        return current.filter((id) => id !== playerId);
      }

      // Maximum 2 players
      if (current.length >= 2) {
        alert(
          "Satu pertandingan hanya dapat memiliki 2 pemain."
        );

        return current;
      }

      return [...current, playerId];
    });
  }

  // =========================================================
  // SCREENSHOT SELECT
  // MAXIMUM 4 SCREENSHOTS
  // =========================================================

  function handleScreenshotChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) {
      setScreenshotFiles([]);
      setScreenshotPreviews([]);
      return;
    }

    // Maximum 4 screenshots
    if (files.length > 4) {
      alert(
        "Maksimal 4 screenshot untuk satu pertandingan."
      );

      event.target.value = "";
      return;
    }

    // Check image type
    const invalidFile = files.find(
      (file) => !file.type.startsWith("image/")
    );

    if (invalidFile) {
      alert(
        "Semua file yang dipilih harus berupa gambar."
      );

      event.target.value = "";
      return;
    }

    // Save files
    setScreenshotFiles(files);

    // Create previews
    const previewUrls = files.map((file) =>
      URL.createObjectURL(file)
    );

    setScreenshotPreviews(previewUrls);
  }

  // =========================================================
  // RESET FORM
  // =========================================================

  function resetForm() {
    setMatchDate("");
    setOpponent("");
    setOpponentCountry("");

    setScoreFor("");
    setScoreAgainst("");

    setTournament("");
    setCompetition("");

    setSelectedPlayerIds([]);

    setScreenshotFiles([]);

    // Revoke preview URLs
    screenshotPreviews.forEach((url) => {
      URL.revokeObjectURL(url);
    });

    setScreenshotPreviews([]);
  }

  // =========================================================
  // ADD MATCH
  // =========================================================

  async function handleAddMatch(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    // Prevent duplicate submission
    if (savingMatch) {
      return;
    }

    // =======================================================
    // VALIDATION
    // =======================================================

    if (
      !matchDate ||
      !opponent.trim() ||
      scoreFor === "" ||
      scoreAgainst === ""
    ) {
      alert(
        "Tanggal, lawan, dan skor wajib diisi."
      );

      return;
    }

    // Exactly 2 players
    if (selectedPlayerIds.length !== 2) {
      alert(
        "Pilih tepat 2 pemain untuk pertandingan ini."
      );

      return;
    }

    // At least 1 screenshot
    if (screenshotFiles.length === 0) {
      alert(
        "Minimal 1 screenshot pertandingan wajib diupload."
      );

      return;
    }

    try {
      setSavingMatch(true);

      // =====================================================
      // STEP 1
      // CREATE MATCH
      // =====================================================

      const matchId = await createMatch({
        matchDate,

        ourTeam: "Indonesia",

        opponent: opponent.trim(),

        opponentCountry:
          opponentCountry.trim(),

        scoreFor: Number(scoreFor),

        scoreAgainst:
          Number(scoreAgainst),

        tournament:
          tournament.trim(),

        competition:
          competition.trim(),

        playerIds:
          selectedPlayerIds,

        screenshotUrls: [],
      });

      console.log(
        "Match created:",
        matchId
      );

      // =====================================================
      // STEP 2
      // UPLOAD ALL SCREENSHOTS
      // =====================================================

      const uploadedUrls: string[] = [];

      for (
        const file of screenshotFiles
      ) {
        console.log(
          "Uploading screenshot:",
          file.name
        );

        const uploadResult =
          await uploadMatchScreenshot(
            matchId,
            file
          );

        uploadedUrls.push(
          uploadResult.downloadUrl
        );
      }

      console.log(
        "All screenshots uploaded:",
        uploadedUrls
      );

      // =====================================================
      // STEP 3
      // SAVE ALL SCREENSHOT URLS
      // =====================================================

      await updateMatchScreenshots(
        matchId,
        uploadedUrls
      );

      console.log(
        "All screenshot URLs saved."
      );

      // =====================================================
      // STEP 4
      // RELOAD MATCHES
      // =====================================================

      await loadMatches();

      // =====================================================
      // STEP 5
      // RESET FORM
      // =====================================================

      resetForm();

      // Close form
      setShowForm(false);

      alert(
        `Match berhasil disimpan dengan ${uploadedUrls.length} screenshot.`
      );
    } catch (error) {
      console.error(
        "Failed to create match:",
        error
      );

      alert(
        "Gagal menyimpan match dan screenshot. Silakan cek Console."
      );
    } finally {
      setSavingMatch(false);
    }
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="p-6 md:p-8">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Matches
          </h1>

          <p className="mt-1 text-muted-foreground">
            Manage Indonesia esports matches and results.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setShowForm(!showForm)
          }
          disabled={savingMatch}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {showForm
            ? "Cancel"
            : "+ Add Match"}
        </button>

      </div>

      {/* =====================================================
          ADD MATCH FORM
      ====================================================== */}

      {showForm && (
        <div className="mt-6 rounded-xl border bg-card p-6 shadow-sm">

          <h2 className="text-xl font-semibold">
            Add New Match
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Record a match played by the Indonesian team.
          </p>

          <form
            onSubmit={handleAddMatch}
            className="mt-6 grid gap-5 md:grid-cols-2"
          >

            {/* =================================================
                MATCH DATE
            ================================================== */}

            <div>
              <label className="mb-2 block text-sm font-medium">
                Match Date
              </label>

              <input
                type="date"
                value={matchDate}
                onChange={(event) =>
                  setMatchDate(
                    event.target.value
                  )
                }
                disabled={savingMatch}
                className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
              />
            </div>

            {/* =================================================
                OPPONENT
            ================================================== */}

            <div>
              <label className="mb-2 block text-sm font-medium">
                Opponent
              </label>

              <input
                type="text"
                value={opponent}
                onChange={(event) =>
                  setOpponent(
                    event.target.value
                  )
                }
                placeholder="Japan"
                disabled={savingMatch}
                className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
              />
            </div>

            {/* =================================================
                OPPONENT COUNTRY
            ================================================== */}

            <div>
              <label className="mb-2 block text-sm font-medium">
                Opponent Country
              </label>

              <input
                type="text"
                value={opponentCountry}
                onChange={(event) =>
                  setOpponentCountry(
                    event.target.value
                  )
                }
                placeholder="Japan"
                disabled={savingMatch}
                className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
              />
            </div>

            {/* =================================================
                SCORE
            ================================================== */}

            <div>
              <label className="mb-2 block text-sm font-medium">
                Score
              </label>

              <div className="flex items-center gap-3">

                <input
                  type="number"
                  min="0"
                  value={scoreFor}
                  onChange={(event) =>
                    setScoreFor(
                      event.target.value
                    )
                  }
                  placeholder="3"
                  disabled={savingMatch}
                  className="w-full rounded-md border px-3 py-2 text-center outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
                />

                <span className="text-lg font-semibold">
                  -
                </span>

                <input
                  type="number"
                  min="0"
                  value={scoreAgainst}
                  onChange={(event) =>
                    setScoreAgainst(
                      event.target.value
                    )
                  }
                  placeholder="1"
                  disabled={savingMatch}
                  className="w-full rounded-md border px-3 py-2 text-center outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
                />

              </div>
            </div>

            {/* =================================================
                TOURNAMENT
            ================================================== */}

            <div>
              <label className="mb-2 block text-sm font-medium">
                Tournament
              </label>

              <input
                type="text"
                value={tournament}
                onChange={(event) =>
                  setTournament(
                    event.target.value
                  )
                }
                placeholder="FIFAe Nations Cup"
                disabled={savingMatch}
                className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
              />
            </div>

            {/* =================================================
                COMPETITION
            ================================================== */}

            <div>
              <label className="mb-2 block text-sm font-medium">
                Competition
              </label>

              <input
                type="text"
                value={competition}
                onChange={(event) =>
                  setCompetition(
                    event.target.value
                  )
                }
                placeholder="Group Stage"
                disabled={savingMatch}
                className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
              />
            </div>

            {/* =================================================
                PLAYERS
            ================================================== */}

            <div className="md:col-span-2">

              <div className="mb-3 flex items-center justify-between">

                <div>
                  <label className="block text-sm font-medium">
                    Players in this Match
                  </label>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Select exactly 2 Indonesian players.
                  </p>
                </div>

                <div
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    selectedPlayerIds.length === 2
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {selectedPlayerIds.length}/2 selected
                </div>

              </div>

              {players.length === 0 ? (

                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No players available.
                  Please add players first from the Players page.
                </div>

              ) : (

                <div className="grid gap-3 sm:grid-cols-2">

                  {players.map((player) => {

                    const selected =
                      selectedPlayerIds.includes(
                        player.id
                      );

                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() =>
                          togglePlayer(
                            player.id
                          )
                        }
                        disabled={savingMatch}
                        className={`rounded-lg border p-4 text-left transition ${
                          selected
                            ? "border-black bg-black text-white"
                            : "bg-background hover:bg-muted"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >

                        <div className="flex items-center justify-between">

                          <div>

                            <div className="font-semibold">
                              {player.name}
                            </div>

                            <div
                              className={`mt-1 text-sm ${
                                selected
                                  ? "text-white/70"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {player.username ||
                                "No username"}
                            </div>

                            {player.position && (
                              <div
                                className={`mt-1 text-xs ${
                                  selected
                                    ? "text-white/60"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {player.position}
                              </div>
                            )}

                          </div>

                          <div className="text-xl">
                            {selected
                              ? "✓"
                              : "○"}
                          </div>

                        </div>

                      </button>
                    );
                  })}

                </div>
              )}

            </div>

            {/* =================================================
                SCREENSHOTS
            ================================================== */}

            <div className="md:col-span-2">

              <div className="mb-3">

                <label className="block text-sm font-medium">
                  Match Screenshots
                </label>

                <p className="mt-1 text-xs text-muted-foreground">
                  Upload 1–4 screenshots containing
                  statistics for both Indonesian players.
                </p>

              </div>

              <div className="rounded-xl border border-dashed p-5">

                <input
                  id="match-screenshot"
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={
                    handleScreenshotChange
                  }
                  disabled={savingMatch}
                  className="block w-full cursor-pointer text-sm disabled:cursor-not-allowed"
                />

                {/* =================================================
                    SELECTED FILES
                ================================================== */}

                {screenshotFiles.length > 0 && (
                  <div className="mt-4 rounded-lg bg-muted/50 p-4">

                    <div className="mb-3 text-sm font-medium">
                      Selected Screenshots{" "}
                      ({screenshotFiles.length}/4)
                    </div>

                    <div className="space-y-2">

                      {screenshotFiles.map(
                        (file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
                          >

                            <div className="min-w-0">

                              <div className="truncate text-sm font-medium">
                                {index + 1}.{" "}
                                {file.name}
                              </div>

                              <div className="text-xs text-muted-foreground">
                                {(
                                  file.size /
                                  1024 /
                                  1024
                                ).toFixed(2)}{" "}
                                MB
                              </div>

                            </div>

                          </div>
                        )
                      )}

                    </div>

                  </div>
                )}

                {/* =================================================
                    SCREENSHOT PREVIEWS
                ================================================== */}

                {screenshotPreviews.length > 0 && (
                  <div className="mt-5">

                    <div className="mb-3 text-sm font-medium">
                      Screenshot Preview
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">

                      {screenshotPreviews.map(
                        (preview, index) => (
                          <div
                            key={preview}
                            className="overflow-hidden rounded-lg border bg-black/5"
                          >

                            <div className="border-b bg-muted/50 px-3 py-2 text-xs font-medium">
                              Screenshot{" "}
                              {index + 1}
                            </div>

                            <img
                              src={preview}
                              alt={`Match screenshot ${
                                index + 1
                              }`}
                              className="max-h-[500px] w-full object-contain"
                            />

                          </div>
                        )
                      )}

                    </div>

                  </div>
                )}

              </div>

            </div>

            {/* =================================================
                SAVE BUTTON
            ================================================== */}

            <div className="md:col-span-2">

              <button
                type="submit"
                disabled={
                  savingMatch ||
                  selectedPlayerIds.length !== 2 ||
                  screenshotFiles.length === 0
                }
                className={`rounded-md px-5 py-2 text-sm font-medium text-white ${
                  !savingMatch &&
                  selectedPlayerIds.length === 2 &&
                  screenshotFiles.length > 0
                    ? "bg-black hover:bg-gray-800"
                    : "cursor-not-allowed bg-gray-400"
                }`}
              >
                {savingMatch
                  ? "Saving Match & Uploading Screenshots..."
                  : "Save Match & Upload Screenshots"}
              </button>

              {screenshotFiles.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Please select at least one screenshot before saving.
                </p>
              )}

            </div>

          </form>

        </div>
      )}

      {/* =====================================================
          MATCH HISTORY
      ====================================================== */}

      <div className="mt-8 overflow-hidden rounded-xl border bg-card shadow-sm">

        <div className="border-b px-6 py-4">

          <h2 className="font-semibold">
            Match History
          </h2>

        </div>

        {loading ? (

          <div className="p-6 text-sm text-muted-foreground">
            Loading matches...
          </div>

        ) : matches.length === 0 ? (

          <div className="p-6 text-sm text-muted-foreground">
            No matches recorded yet.
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
                    Match
                  </th>

                  <th className="px-6 py-3 text-left font-medium">
                    Score
                  </th>

                  <th className="px-6 py-3 text-left font-medium">
                    Players
                  </th>

                  <th className="px-6 py-3 text-left font-medium">
                    Tournament
                  </th>

                  <th className="px-6 py-3 text-left font-medium">
                    Competition
                  </th>

                  <th className="px-6 py-3 text-left font-medium">
                    Screenshots
                  </th>

                  <th className="px-6 py-3 text-left font-medium">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {matches.map((match) => (

                  <tr
                    key={match.id}
                    onClick={() =>
                      window.location.href = `/matches/${match.id}`
                    }
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                  >

                    {/* DATE */}

                    <td className="px-6 py-4">
                      {match.matchDate}
                    </td>

                    {/* MATCH */}

                    <td className="px-6 py-4 font-medium">
                      {match.ourTeam} vs{" "}
                      {match.opponent}
                    </td>

                    {/* SCORE */}

                    <td className="px-6 py-4 font-semibold">
                      {match.scoreFor} -{" "}
                      {match.scoreAgainst}
                    </td>

                    {/* PLAYERS */}

                    <td className="px-6 py-4">

                      {match.playerIds?.length
                        ? `${match.playerIds.length} players`
                        : "Not assigned"}

                    </td>

                    {/* TOURNAMENT */}

                    <td className="px-6 py-4">
                      {match.tournament ||
                        "-"}
                    </td>

                    {/* COMPETITION */}

                    <td className="px-6 py-4">
                      {match.competition ||
                        "-"}
                    </td>

                    {/* SCREENSHOTS */}

                    <td className="px-6 py-4">

                      {match.screenshotUrls &&
                      match.screenshotUrls.length >
                        0 ? (

                        <div className="flex flex-wrap gap-2">

                          {match.screenshotUrls.map(
                            (url, index) => (

                              <a
                                key={`${url}-${index}`}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex rounded-md bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200"
                              >
                                View{" "}
                                {index + 1}
                              </a>

                            )
                          )}

                        </div>

                      ) : (

                        <span className="text-xs text-muted-foreground">
                          Not uploaded
                        </span>

                      )}

                    </td>

                    {/* ACTION */}

                    <td className="px-6 py-4">

                      <a
                        href={`/matches/${match.id}`}
                        className="inline-flex rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
                      >
                        View
                      </a>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </main>
  );
}