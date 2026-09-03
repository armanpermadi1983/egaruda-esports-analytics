// =========================================================
// eGARUDA PERFORMANCE INDEX
// =========================================================

/**
 * Initial benchmark for Total Points.
 *
 * This is a temporary benchmark and can later be replaced
 * by an official team benchmark calculated from historical data.
 */
export const EPI_TARGET_POINTS = 1500;


/**
 * Calculate eGARUDA Performance Index.
 *
 * EPI range: 0 - 100
 */
export function calculateEPI(
  averageTotalPoints: number
): number {

  if (
    !Number.isFinite(averageTotalPoints) ||
    averageTotalPoints <= 0
  ) {
    return 0;
  }

  const epi =
    (averageTotalPoints / EPI_TARGET_POINTS) * 100;

  return Math.min(
    Math.max(epi, 0),
    100
  );
}


/**
 * Return EPI performance level.
 */
export function getEPILevel(
  epi: number
): string {

  if (epi >= 90) {
    return "Elite";
  }

  if (epi >= 80) {
    return "Excellent";
  }

  if (epi >= 70) {
    return "Good";
  }

  if (epi >= 60) {
    return "Developing";
  }

  return "Needs Improvement";
}


/**
 * Return a short description for the EPI level.
 */
export function getEPIDescription(
  epi: number
): string {

  if (epi >= 90) {
    return "Elite-level performance.";
  }

  if (epi >= 80) {
    return "Excellent and highly competitive performance.";
  }

  if (epi >= 70) {
    return "Good performance with room for improvement.";
  }

  if (epi >= 60) {
    return "Developing performance that requires consistency.";
  }

  return "Performance requires significant improvement.";
}