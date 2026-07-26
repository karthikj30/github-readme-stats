/**
 * Calculates the normal cdf.
 *
 * @param {number} mean The mean.
 * @param {number} sigma The standard deviation.
 * @param {number} to The value.
 * @returns {number} The normal cdf.
 */
const normalcdf = (mean, sigma, to) => {
  var z = (to - mean) / Math.sqrt(2 * sigma * sigma);
  var t = 1 / (1 + 0.3275911 * Math.abs(z));
  var a1 = 0.254829592;
  var a2 = -0.284496736;
  var a3 = 1.421413741;
  var a4 = -1.453152027;
  var a5 = 1.061405429;
  var erf =
    1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  var sign = 1;
  if (z < 0) {
    sign = -1;
  }
  return (1 / 2) * (1 + sign * erf);
};

/**
 * Calculates the user's rank using the legacy (pre-2023) grading scale.
 *
 * This deliberately restores the older algorithm. Its ladder is
 * S+ > S > A++ > A+ > B+, where B+ is the floor - a different scale from the
 * current S..C one, not a shifted version of it. Anyone reading the letter
 * should know that "A+" here is the fourth of five grades, and that the curve
 * is flat enough that an account with no activity at all still lands on it.
 *
 * The returned percentile keeps the current "lower is better" convention so
 * the card's progress ring (100 - percentile) works unchanged.
 *
 * @param {object} params Parameters on which the user's rank depends.
 * @param {number} params.commits Number of commits.
 * @param {number} params.prs The number of pull requests.
 * @param {number} params.issues The number of issues.
 * @param {number} params.repos Total number of repos.
 * @param {number} params.contributedTo Number of repos contributed to.
 * @param {number} params.stars The number of stars.
 * @param {number} params.followers The number of followers.
 * @returns {{ level: string, percentile: number }} The users rank.
 */
function calculateRank({
  commits,
  prs,
  issues,
  repos,
  contributedTo,
  stars,
  followers,
}) {
  const COMMITS_OFFSET = 1.65;
  const CONTRIBS_OFFSET = 1.65;
  const ISSUES_OFFSET = 1;
  const STARS_OFFSET = 0.75;
  const PRS_OFFSET = 0.5;
  const FOLLOWERS_OFFSET = 0.45;
  const REPO_OFFSET = 1;

  // Mirrors the original: COMMITS_OFFSET is intentionally not summed here.
  const ALL_OFFSETS =
    CONTRIBS_OFFSET +
    ISSUES_OFFSET +
    STARS_OFFSET +
    PRS_OFFSET +
    FOLLOWERS_OFFSET +
    REPO_OFFSET;

  const RANK_S_VALUE = 1;
  const RANK_DOUBLE_A_VALUE = 25;
  const RANK_A2_VALUE = 45;
  const RANK_A3_VALUE = 60;
  const RANK_B_VALUE = 100;

  const TOTAL_VALUES =
    RANK_S_VALUE +
    RANK_DOUBLE_A_VALUE +
    RANK_A2_VALUE +
    RANK_A3_VALUE +
    RANK_B_VALUE;

  const score =
    (commits * COMMITS_OFFSET +
      (contributedTo || 0) * CONTRIBS_OFFSET +
      issues * ISSUES_OFFSET +
      stars * STARS_OFFSET +
      prs * PRS_OFFSET +
      followers * FOLLOWERS_OFFSET +
      (repos || 0) * REPO_OFFSET) /
    100;

  const normalizedScore = normalcdf(score, TOTAL_VALUES, ALL_OFFSETS) * 100;

  const level = (() => {
    if (normalizedScore < RANK_S_VALUE) {
      return "S+";
    }
    if (normalizedScore < RANK_DOUBLE_A_VALUE) {
      return "S";
    }
    if (normalizedScore < RANK_A2_VALUE) {
      return "A++";
    }
    if (normalizedScore < RANK_A3_VALUE) {
      return "A+";
    }
    return "B+";
  })();

  return { level, percentile: normalizedScore };
}

export { calculateRank };
export default calculateRank;
