"use client";

import { useState } from "react";

import { createPlayer } from "@/services/player-service";

export default function TestFirestorePage() {
  const [message, setMessage] = useState("");

  async function handleTest() {
    try {
      const id = await createPlayer({
        name: "Test Player",
        username: "testplayer",
        team: "Indonesia",
        country: "Indonesia",
        position: "Attacker",
      });

      setMessage(`Player berhasil disimpan. ID: ${id}`);
    } catch (error) {
      console.error(error);
      setMessage("Gagal menyimpan player.");
    }
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Firestore Test</h1>

      <button
        onClick={handleTest}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          cursor: "pointer",
        }}
      >
        Test Save Player
      </button>

      {message && (
        <p style={{ marginTop: 20 }}>
          {message}
        </p>
      )}
    </main>
  );
}