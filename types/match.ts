export interface Match {
  id: string;

  matchDate: string;

  ourTeam: string;
  opponent: string;
  opponentCountry?: string;

  scoreFor: number;
  scoreAgainst: number;

  tournament?: string;
  competition?: string;

  playerIds: string[];

  screenshotUrls?: string[];

  createdAt?: Date;
}