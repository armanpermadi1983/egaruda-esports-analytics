"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createPlayer, getPlayers } from "@/services/player-service";
import { Player } from "@/types/player";

export default function PlayersPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [position, setPosition] = useState("");

  async function loadPlayers() {
    try {
      setLoading(true);

      const data = await getPlayers();

      setPlayers(data);
    } catch (error) {
      console.error("Failed to load players:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlayers();
  }, []);

  async function handleAddPlayer(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!name.trim()) {
      alert("Nama pemain wajib diisi.");
      return;
    }

    try {
      await createPlayer({
        name: name.trim(),
        username: username.trim(),
        team: "Indonesia",
        country: "Indonesia",
        position: position.trim(),
      });

      setName("");
      setUsername("");
      setPosition("");

      setShowForm(false);

      await loadPlayers();
    } catch (error) {
      console.error("Failed to create player:", error);

      alert("Gagal menyimpan pemain.");
    }
  }

  return (
    <main className="p-6 md:p-8">


      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Players
          </h1>

          <p className="mt-1 text-muted-foreground">
            Manage Indonesian esports players.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          {showForm ? "Cancel" : "+ Add Player"}
        </button>
      </div>

      {showForm && (
        <div className="mt-6 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Add New Player
          </h2>

          <form
            onSubmit={handleAddPlayer}
            className="mt-5 grid gap-4 md:grid-cols-3"
          >
            <div>
              <label className="mb-2 block text-sm font-medium">
                Player Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="FIFAeComp_IDN1"
                className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Username
              </label>

              <input
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                placeholder="fifaecomp759"
                className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Position
              </label>

              <input
                type="text"
                value={position}
                onChange={(event) =>
                  setPosition(event.target.value)
                }
                placeholder="Player"
                className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="md:col-span-3">
              <button
                type="submit"
                className="rounded-md bg-black px-5 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Save Player
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-8 overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">
            Registered Players
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">
            Loading players...
          </div>
        ) : players.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No players registered yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">
                    Player
                  </th>

                  <th className="px-6 py-3 text-left font-medium">
                    Username
                  </th>

                  <th className="px-6 py-3 text-left font-medium">
                    Team
                  </th>

                  <th className="px-6 py-3 text-left font-medium">
                    Position
                  </th>

                  <th className="px-6 py-3 text-left font-medium">
                    Analytics
                  </th>
                </tr>
              </thead>

              <tbody>
                {players.map((player) => (
                  <tr
                    key={player.id}
                    className="border-b last:border-0"
                  >
                    <td className="px-6 py-4 font-medium">
                      {player.name}
                    </td>

                    <td className="px-6 py-4">
                      {player.username || "-"}
                    </td>

                    <td className="px-6 py-4">
                      {player.team}
                    </td>

                    <td className="px-6 py-4">
                      {player.position || "-"}
                    </td>

                    <td className="px-6 py-4">
                      <Link
                        href={`/players/${player.id}`}
                        className="inline-flex rounded-md bg-black px-4 py-2 text-xs font-medium text-white hover:bg-gray-800"
                      >
                        View Analytics
                      </Link>
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