"""
LexoRank - Lexicographic ranking for orderless inserts.

Instead of integer positions that require shifting:
  [1, 2, 3, 4] → insert at 2 → must update 2, 3, 4 → O(n)

LexoRank uses strings that sort lexicographically:
  ["aaa", "aac", "aae", "aag"] → insert between aac and aae → "aad" → O(1)

No other rows need updating!
"""

ALPHABET = 'abcdefghijklmnopqrstuvwxyz'
MID_CHAR = 'n'  # Middle of alphabet
MIN_CHAR = 'a'
MAX_CHAR = 'z'


def rank_between(before: str | None, after: str | None) -> str:
    """
    Calculate a rank string that sorts between `before` and `after`.
    
    Args:
        before: Rank of item before insertion point (None if inserting at start)
        after: Rank of item after insertion point (None if inserting at end)
    
    Returns:
        A rank string that sorts between before and after
    
    Examples:
        rank_between(None, "n")     → "g"      # Before first
        rank_between("n", None)     → "u"      # After last
        rank_between("g", "n")      → "j"      # Between two
        rank_between("g", "h")      → "gn"     # Need more precision
        rank_between(None, None)    → "n"      # First item ever
    """
    if not before and not after:
        return MID_CHAR
    
    if not before:
        # Inserting at the start
        return _rank_before(after)
    
    if not after:
        # Inserting at the end
        return _rank_after(before)
    
    # Inserting between two ranks
    return _rank_mid(before, after)


def _rank_before(after: str) -> str:
    """Generate a rank that sorts before `after`"""
    if not after:
        return MID_CHAR
    
    first_char = after[0]
    
    # If there's room before the first character
    if first_char > MIN_CHAR:
        # Return the midpoint between 'a' and first_char
        mid_ord = (ord(MIN_CHAR) + ord(first_char)) // 2
        if mid_ord == ord(MIN_CHAR):
            # No room, need to go deeper
            return MIN_CHAR + MID_CHAR
        return chr(mid_ord)
    
    # No room - need to go deeper
    # "a..." → prepend 'a' and recurse
    if len(after) > 1:
        return MIN_CHAR + _rank_before(after[1:])
    else:
        return MIN_CHAR + MID_CHAR


def _rank_after(before: str) -> str:
    """Generate a rank that sorts after `before`"""
    if not before:
        return MID_CHAR
    
    last_char = before[-1]
    
    # If there's room after the last character
    if last_char < MAX_CHAR:
        # Return the midpoint between last_char and 'z'
        mid_ord = (ord(last_char) + ord(MAX_CHAR) + 1) // 2
        return before[:-1] + chr(mid_ord)
    
    # Last char is 'z' - append midpoint
    return before + MID_CHAR


def _rank_mid(before: str, after: str) -> str:
    """Generate a rank that sorts between `before` and `after`"""
    if before >= after:
        raise ValueError(f"before ({before}) must be < after ({after})")
    
    # Pad to same length for comparison
    max_len = max(len(before), len(after))
    
    # Find first position where they differ
    for i in range(max_len):
        b_char = before[i] if i < len(before) else MIN_CHAR
        a_char = after[i] if i < len(after) else MAX_CHAR
        
        if b_char == a_char:
            continue
        
        # Found difference
        if ord(a_char) - ord(b_char) > 1:
            # Room to insert between
            mid_ord = (ord(b_char) + ord(a_char)) // 2
            return before[:i] + chr(mid_ord)
        else:
            # No room - need to extend
            # Take before's prefix up to here, then find mid after
            prefix = before[:i+1] if i < len(before) else before + MIN_CHAR
            
            # Get the "after" portion from this point
            after_suffix = after[i+1:] if i+1 < len(after) else None
            before_suffix = before[i+1:] if i+1 < len(before) else None
            
            if before_suffix:
                return prefix + _rank_after(before_suffix)
            else:
                return prefix + (MID_CHAR if not after_suffix else _rank_before(after_suffix))
    
    # Identical strings (shouldn't happen) - extend
    return before + MID_CHAR


def initial_ranks(count: int) -> list[str]:
    """
    Generate initial ranks for a list of items.
    Evenly distributed across the rank space.
    
    Args:
        count: Number of ranks to generate
        
    Returns:
        List of rank strings
    """
    if count == 0:
        return []
    if count == 1:
        return [MID_CHAR]
    
    ranks = []
    step = len(ALPHABET) // (count + 1)
    
    for i in range(1, count + 1):
        idx = min(step * i, len(ALPHABET) - 1)
        ranks.append(ALPHABET[idx])
    
    return ranks


def rebalance_ranks(items: list, get_rank=None, set_rank=None) -> list:
    """
    Rebalance ranks for a list of items when they've become too long.
    
    This should be called periodically (e.g., via Celery) when ranks
    exceed a certain length (e.g., 10 characters).
    
    Args:
        items: List of items to rebalance (assumed to be in order)
        get_rank: Function to get rank from item (default: lambda x: x.rank)
        set_rank: Function to set rank on item (default: lambda x, r: setattr(x, 'rank', r))
    
    Returns:
        List of updated items (not saved)
    """
    if not items:
        return []
    
    if get_rank is None:
        get_rank = lambda x: x.rank
    if set_rank is None:
        set_rank = lambda x, r: setattr(x, 'rank', r)
    
    new_ranks = initial_ranks(len(items))
    
    for item, new_rank in zip(items, new_ranks):
        set_rank(item, new_rank)
    
    return items
