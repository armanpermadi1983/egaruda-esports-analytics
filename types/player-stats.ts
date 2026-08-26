export interface PlayerMatchStats {
  id: string;

  matchId: string;
  playerId: string;

  // Overall
  totalPoints: number;

  // Main performance categories
  attackingPositioning: number;
  shooting: number;
  duelling: number;
  defensivePositioning: number;
  passing: number;
  dribbling: number;

  // Scoring
  goals: number;
  shots: number;
  shotsOnTarget: number;
  assists: number;
  keyPasses: number;

  // Passing
  passes: number;
  successfulPasses: number;
  instrumentalPasses: number;

  // Dribbling
  dribbles: number;
  successfulDribbles: number;
  instrumentalDribbles: number;

  // Receiving
  receiving: number;
  goodReceives: number;

  // Attacking movement
  overlaps: number;
  runsOutWide: number;
  forwardRuns: number;
  attackingReceives: number;

  // Defensive
  intercepts: number;
  tackles: number;
  impactfulSteals: number;

  // Pressing
  frontalPresses: number;
  pressesFromBehind: number;

  // Positioning
  goodPositioning: number;

  // Marking / defensive support
  doubleMarks: number;
  passesObstructed: number;
  playersMarked: number;

  createdAt?: Date;
}