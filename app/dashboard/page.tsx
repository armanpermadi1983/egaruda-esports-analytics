"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Gamepad2, Users } from "lucide-react";
import Link from "next/link";

import { getMatches } from "@/services/match-service";
import { getPlayers } from "@/services/player-service";
import { Match } from "@/types/match";
import { Player } from "@/types/player";
import { formatDate } from "@/utils/date-formatter";

export default function DashboardPage() {
  const router = useRouter();
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedMatches, fetchedPlayers] = await Promise.all([
          getMatches(),
          getPlayers(),
        ]);
        
        // Sort matches by date descending for recent matches
        fetchedMatches.sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime());
        
        setMatches(fetchedMatches);
        setPlayers(fetchedPlayers);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  return (
    <div className="space-y-6">


      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Dashboard
        </h1>

        <p className="text-muted-foreground">
          Overview of your esports analytics data.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5" />
              Matches
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? "..." : matches.length}
            </div>
            <p className="text-sm text-muted-foreground">
              Total matches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Players
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? "..." : players.length}
            </div>
            <p className="text-sm text-muted-foreground">
              Registered players
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Matches</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading matches...</p>
          ) : matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No matches have been recorded yet.
            </p>
          ) : (
            <div className="space-y-4">
              {matches.slice(0, 5).map((match) => (
                <div key={match.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{match.ourTeam} vs {match.opponent}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(match.matchDate)}
                    </p>
                  </div>
                  <Link href={`/matches/${match.id}`} className="text-sm text-blue-600 hover:underline">
                    View Match
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}