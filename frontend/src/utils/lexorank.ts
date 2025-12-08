/**
 * LexoRank - Lexicographic ranking for orderless inserts.
 * 
 * Client-side implementation matching backend's lexorank.py
 * Enables true fire-and-forget optimistic updates since we can
 * calculate the exact same rank the server will use.
 */

const MID_CHAR = 'n';
const MIN_CHAR = 'a';
const MAX_CHAR = 'z';

/**
 * Calculate a rank string that sorts between `before` and `after`.
 * 
 * @param before - Rank of item before insertion point (null if inserting at start)
 * @param after - Rank of item after insertion point (null if inserting at end)
 * @returns A rank string that sorts between before and after
 */
export function rankBetween(before: string | null | undefined, after: string | null | undefined): string {
  if (!before && !after) {
    return MID_CHAR;
  }

  if (!before) {
    return rankBefore(after!);
  }

  if (!after) {
    return rankAfter(before);
  }

  return rankMid(before, after);
}

/**
 * Generate a rank that sorts before `after`
 */
function rankBefore(after: string): string {
  if (!after) {
    return MID_CHAR;
  }

  const firstChar = after[0];

  // If there's room before the first character
  if (firstChar > MIN_CHAR) {
    const midOrd = Math.floor((MIN_CHAR.charCodeAt(0) + firstChar.charCodeAt(0)) / 2);
    if (midOrd === MIN_CHAR.charCodeAt(0)) {
      // No room, need to go deeper
      return MIN_CHAR + MID_CHAR;
    }
    return String.fromCharCode(midOrd);
  }

  // No room - need to go deeper
  if (after.length > 1) {
    return MIN_CHAR + rankBefore(after.slice(1));
  } else {
    return MIN_CHAR + MID_CHAR;
  }
}

/**
 * Generate a rank that sorts after `before`
 */
function rankAfter(before: string): string {
  if (!before) {
    return MID_CHAR;
  }

  const lastChar = before[before.length - 1];

  // If there's room after the last character
  if (lastChar < MAX_CHAR) {
    const midOrd = Math.floor((lastChar.charCodeAt(0) + MAX_CHAR.charCodeAt(0) + 1) / 2);
    return before.slice(0, -1) + String.fromCharCode(midOrd);
  }

  // Last char is 'z' - append midpoint
  return before + MID_CHAR;
}

/**
 * Generate a rank that sorts between `before` and `after`
 */
function rankMid(before: string, after: string): string {
  if (before >= after) {
    console.warn(`LexoRank: before (${before}) must be < after (${after}), returning midpoint approximation`);
    // Fallback: return something that roughly works
    return before + MID_CHAR;
  }

  const maxLen = Math.max(before.length, after.length);

  // Find first position where they differ
  for (let i = 0; i < maxLen; i++) {
    const bChar = i < before.length ? before[i] : MIN_CHAR;
    const aChar = i < after.length ? after[i] : MAX_CHAR;

    if (bChar === aChar) {
      continue;
    }

    // Found difference
    if (aChar.charCodeAt(0) - bChar.charCodeAt(0) > 1) {
      // Room to insert between
      const midOrd = Math.floor((bChar.charCodeAt(0) + aChar.charCodeAt(0)) / 2);
      return before.slice(0, i) + String.fromCharCode(midOrd);
    } else {
      // No room - need to extend
      const prefix = i < before.length ? before.slice(0, i + 1) : before + MIN_CHAR;

      const afterSuffix = i + 1 < after.length ? after.slice(i + 1) : null;
      const beforeSuffix = i + 1 < before.length ? before.slice(i + 1) : null;

      if (beforeSuffix) {
        return prefix + rankAfter(beforeSuffix);
      } else {
        return prefix + (afterSuffix ? rankBefore(afterSuffix) : MID_CHAR);
      }
    }
  }

  // Identical strings (shouldn't happen) - extend
  return before + MID_CHAR;
}

export default { rankBetween };
