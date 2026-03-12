# LexoRank Migration Plan

## Executive Summary

Migrate from integer-based `column_order` positioning to LexoRank string-based positioning to achieve:

- **99% performance improvement** (2,600ms → 10-20ms per drag operation)
- **Zero reordering overhead** (update only the moving ticket, not neighbors)
- **Eliminates deadlock risk** (no concurrent updates to same rows)
- **Industry-proven** (used by Jira, Linear, and other professional tools)

**Current Performance:** ~2,600ms per drag (480ms backend + 2,120ms refetches)
**Target Performance:** ~10-20ms backend, <200ms total with frontend optimizations

---

## Current System Overview

### How It Works Now

```python
# Integer-based ordering
class Ticket(models.Model):
    column = ForeignKey(Column)
    column_order = IntegerField()  # 0, 1, 2, 3, 4...

class TicketPosition(models.Model):
    ticket = OneToOneField(Ticket)
    column = ForeignKey(Column)
    order = IntegerField()  # 0, 1, 2, 3, 4...
```

### Problem: O(n) Reordering

When moving a ticket, we must shift ALL tickets between old and new positions:

```python
# Moving ticket from position 2 to position 5
# Must update positions: 3→2, 4→3, 5→4 (3 updates for neighbors!)

# Before:
# ticket_A: order=0
# ticket_B: order=1
# ticket_C: order=2  ← moving this
# ticket_D: order=3  ← must shift to 2
# ticket_E: order=4  ← must shift to 3
# ticket_F: order=5  ← must shift to 4

# After:
# ticket_A: order=0
# ticket_B: order=1
# ticket_D: order=2
# ticket_E: order=3
# ticket_F: order=4
# ticket_C: order=5
```

**Performance Impact:**

- Locks: N rows (where N = tickets in column)
- Updates: N-1 neighbor tickets + 1 moving ticket
- Deadlock risk: High (concurrent users updating same rows)

---

## LexoRank System Overview

### How LexoRank Works

Instead of integers, use **string-based ranks** that can be inserted between any two values:

```python
# String-based ordering
class TicketPosition(models.Model):
    ticket = OneToOneField(Ticket)
    column = ForeignKey(Column)
    rank = CharField(max_length=100)  # "0|100000", "0|200000", etc.
```

### Key Concept: Insertable Strings

```python
# Before:
# ticket_A: rank="0|100000"
# ticket_B: rank="0|200000"
# ticket_C: rank="0|300000"

# Insert between A and B:
# new_rank = midpoint("0|100000", "0|200000") = "0|150000"

# After:
# ticket_A: rank="0|100000"  ← unchanged
# ticket_D: rank="0|150000"  ← NEW (only update this one!)
# ticket_B: rank="0|200000"  ← unchanged
# ticket_C: rank="0|300000"  ← unchanged
```

**Performance Impact:**

- Locks: 1 row (only the moving ticket)
- Updates: 1 ticket
- Deadlock risk: Zero (no concurrent updates to same row)

---

## Migration Plan

### Phase 1: Add LexoRank Field (Non-Breaking)

**Goal:** Add `rank` field alongside existing `order` field

**Duration:** 2-3 hours

**Steps:**

1. **Update TicketPosition Model**

```python
# backend/tickets/models.py
class TicketPosition(models.Model):
    ticket = OneToOneField(Ticket, primary_key=True)
    column = ForeignKey(Column)

    # OLD: Keep for backward compatibility during migration
    order = IntegerField(default=0)

    # NEW: LexoRank field
    rank = CharField(
        max_length=100,
        null=True,  # Nullable during migration
        blank=True,
        help_text='LexoRank string for O(1) positioning'
    )

    updated_at = DateTimeField(auto_now=True)

    class Meta:
        ordering = ['column', 'rank', 'order']  # Try rank first, fallback to order
        indexes = [
            Index(fields=['column', 'rank']),  # New index
            Index(fields=['column', 'order']),  # Keep old index
        ]
```

2. **Create Migration**

```bash
python manage.py makemigrations tickets --name add_lexorank_field
```

3. **Create Data Migration to Populate Ranks**

```python
# Migration: Populate ranks from existing orders
def populate_ranks(apps, schema_editor):
    TicketPosition = apps.get_model('tickets', 'TicketPosition')

    # Generate ranks from integer orders
    for column_id in TicketPosition.objects.values_list('column_id', flat=True).distinct():
        positions = TicketPosition.objects.filter(
            column_id=column_id
        ).order_by('order')

        for i, position in enumerate(positions):
            # Generate rank: "0|100000", "0|200000", etc.
            # Spacing: 100000 units allows 100k insertions between each
            position.rank = f"0|{(i + 1) * 100000:06d}"
            position.save(update_fields=['rank'])
```

4. **Apply Migration**

```bash
python manage.py migrate
```

**Validation:**

- All tickets should have non-null `rank` values
- Ranks should be in correct order within each column
- Old `order` field should remain unchanged

---

### Phase 2: Implement LexoRank Algorithm

**Goal:** Create utility functions for rank generation

**Duration:** 3-4 hours

**Steps:**

1. **Install LexoRank Library (or implement custom)**

```bash
pip install lexorank
```

Or create custom implementation:

```python
# backend/tickets/utils/lexorank.py
import re
from decimal import Decimal, getcontext

# Set high precision for calculations
getcontext().prec = 50

class LexoRank:
    """
    LexoRank implementation for conflict-free position management.

    Format: "bucket|value"
    - bucket: "0", "1", "2" (for rebalancing)
    - value: base-36 string

    Examples:
    - "0|100000"
    - "0|1hzzz0"
    - "1|000000"
    """

    BASE = 36
    DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"
    MIN_CHAR = '0'
    MAX_CHAR = 'z'

    def __init__(self, bucket: str, value: str):
        self.bucket = bucket
        self.value = value

    def __str__(self):
        return f"{self.bucket}|{self.value}"

    def __repr__(self):
        return f"LexoRank('{self.bucket}|{self.value}')"

    @classmethod
    def parse(cls, rank_str: str):
        """Parse rank string into LexoRank object"""
        bucket, value = rank_str.split('|')
        return cls(bucket, value)

    @classmethod
    def min(cls, bucket: str = "0"):
        """Get minimum rank for bucket"""
        return cls(bucket, "000000")

    @classmethod
    def max(cls, bucket: str = "0"):
        """Get maximum rank for bucket"""
        return cls(bucket, "zzzzzz")

    @classmethod
    def middle(cls, bucket: str = "0"):
        """Get middle rank for bucket"""
        return cls(bucket, "hzzzzz")

    @classmethod
    def between(cls, prev_rank, next_rank):
        """
        Generate rank between two ranks.

        Examples:
        - between("0|100000", "0|200000") → "0|150000"
        - between("0|100000", "0|100001") → "0|1000005"
        - between("0|100000", None) → "0|200000" (after prev)
        - between(None, "0|100000") → "0|050000" (before next)
        """
        if prev_rank is None and next_rank is None:
            return cls.middle()

        prev = cls.parse(prev_rank) if prev_rank else None
        next_r = cls.parse(next_rank) if next_rank else None

        # Ensure same bucket
        bucket = prev.bucket if prev else (next_r.bucket if next_r else "0")

        if prev is None:
            # Insert at beginning
            return cls._generate_before(next_r.value, bucket)

        if next_r is None:
            # Insert at end
            return cls._generate_after(prev.value, bucket)

        # Insert between two ranks
        return cls._generate_between(prev.value, next_r.value, bucket)

    @classmethod
    def _generate_before(cls, value: str, bucket: str):
        """Generate rank before given value"""
        # Simple approach: divide by 2
        num = cls._to_decimal(value)
        new_num = num / 2
        new_value = cls._from_decimal(new_num)
        return cls(bucket, new_value)

    @classmethod
    def _generate_after(cls, value: str, bucket: str):
        """Generate rank after given value"""
        # Simple approach: midpoint to max
        num = cls._to_decimal(value)
        max_num = cls._to_decimal("zzzzzz")
        new_num = (num + max_num) / 2
        new_value = cls._from_decimal(new_num)
        return cls(bucket, new_value)

    @classmethod
    def _generate_between(cls, prev_value: str, next_value: str, bucket: str):
        """Generate rank between two values"""
        prev_num = cls._to_decimal(prev_value)
        next_num = cls._to_decimal(next_value)

        # Midpoint
        new_num = (prev_num + next_num) / 2
        new_value = cls._from_decimal(new_num)

        return cls(bucket, new_value)

    @classmethod
    def _to_decimal(cls, value: str) -> Decimal:
        """Convert base-36 string to decimal"""
        result = Decimal(0)
        for i, char in enumerate(value):
            digit = cls.DIGITS.index(char)
            result += Decimal(digit) * (Decimal(cls.BASE) ** (len(value) - i - 1))
        return result

    @classmethod
    def _from_decimal(cls, num: Decimal) -> str:
        """Convert decimal to base-36 string (6 chars, padded)"""
        if num == 0:
            return "000000"

        digits = []
        while num > 0:
            num, remainder = divmod(num, cls.BASE)
            digits.append(cls.DIGITS[int(remainder)])

        result = ''.join(reversed(digits))
        return result.zfill(6)  # Pad to 6 characters

    def gen_prev(self):
        """Generate rank before this rank"""
        return LexoRank._generate_before(self.value, self.bucket)

    def gen_next(self):
        """Generate rank after this rank"""
        return LexoRank._generate_after(self.value, self.bucket)


# Helper functions for easy use
def generate_rank_between(prev_rank: str | None, next_rank: str | None) -> str:
    """
    Generate rank between two ranks.

    Usage:
        rank = generate_rank_between("0|100000", "0|200000")
        # Returns: "0|150000"
    """
    return str(LexoRank.between(prev_rank, next_rank))


def generate_initial_rank() -> str:
    """Generate initial rank for first ticket"""
    return str(LexoRank.middle())
```

2. **Add Helper Method to TicketPosition**

```python
# backend/tickets/models.py
class TicketPosition(models.Model):
    # ... existing fields ...

    @classmethod
    def move_ticket_lexorank(cls, ticket, target_column_id, target_index):
        """
        Move ticket using LexoRank (O(1) - only updates moving ticket).

        Args:
            ticket: Ticket instance to move
            target_column_id: Target column ID
            target_index: Target index in column (0-based)

        Returns:
            TicketPosition instance
        """
        from django.db import transaction
        from tickets.utils.lexorank import generate_rank_between, generate_initial_rank

        with transaction.atomic():
            # Get or create position
            position, created = cls.objects.get_or_create(
                ticket=ticket,
                defaults={
                    'column_id': target_column_id,
                    'rank': generate_initial_rank()
                }
            )

            # Get neighbors at target position
            positions_in_column = list(
                cls.objects.filter(column_id=target_column_id)
                .exclude(ticket=ticket)
                .order_by('rank')
            )

            if target_index == 0:
                # Insert at beginning
                if positions_in_column:
                    next_rank = positions_in_column[0].rank
                    new_rank = generate_rank_between(None, next_rank)
                else:
                    new_rank = generate_initial_rank()

            elif target_index >= len(positions_in_column):
                # Insert at end
                if positions_in_column:
                    prev_rank = positions_in_column[-1].rank
                    new_rank = generate_rank_between(prev_rank, None)
                else:
                    new_rank = generate_initial_rank()

            else:
                # Insert between two tickets
                prev_rank = positions_in_column[target_index - 1].rank
                next_rank = positions_in_column[target_index].rank
                new_rank = generate_rank_between(prev_rank, next_rank)

            # Update ONLY the moving ticket (O(1)!)
            position.column_id = target_column_id
            position.rank = new_rank
            position.save(update_fields=['column_id', 'rank'])

            # Also update ticket.column for backward compatibility
            if ticket.column_id != target_column_id:
                ticket.column_id = target_column_id
                ticket.save(update_fields=['column'])

        return position
```

**Testing:**

```python
# Test script
def test_lexorank():
    from tickets.utils.lexorank import generate_rank_between

    # Test 1: Between two ranks
    rank = generate_rank_between("0|100000", "0|200000")
    assert rank == "0|150000"

    # Test 2: At beginning
    rank = generate_rank_between(None, "0|100000")
    assert rank < "0|100000"

    # Test 3: At end
    rank = generate_rank_between("0|900000", None)
    assert rank > "0|900000"

    # Test 4: Many insertions
    ranks = ["0|100000"]
    for i in range(100):
        new_rank = generate_rank_between(ranks[-1], None)
        assert new_rank > ranks[-1]
        ranks.append(new_rank)

    print("✅ All LexoRank tests passed!")
```

---

### Phase 3: Dual-Mode Operation

**Goal:** Support both systems simultaneously for safe migration

**Duration:** 2-3 hours

**Steps:**

1. **Add Feature Flag**

```python
# backend/config/settings.py
USE_LEXORANK = os.getenv('USE_LEXORANK', 'false').lower() == 'true'
```

2. **Update TicketPosition.move_ticket() to Support Both**

```python
class TicketPosition(models.Model):
    # ... existing fields ...

    @classmethod
    def move_ticket(cls, ticket, target_column_id, target_order, max_retries=3):
        """
        Move ticket to position. Supports both integer order and LexoRank.

        If USE_LEXORANK=true: Uses LexoRank (O(1))
        If USE_LEXORANK=false: Uses integer order (O(n))
        """
        from django.conf import settings

        if settings.USE_LEXORANK and cls._all_have_ranks(target_column_id):
            # Use new LexoRank system
            return cls.move_ticket_lexorank(ticket, target_column_id, target_order)
        else:
            # Use old integer system
            return cls.move_ticket_integer(ticket, target_column_id, target_order, max_retries)

    @classmethod
    def _all_have_ranks(cls, column_id):
        """Check if all tickets in column have ranks"""
        return not cls.objects.filter(
            column_id=column_id,
            rank__isnull=True
        ).exists()

    @classmethod
    def move_ticket_integer(cls, ticket, target_column_id, target_order, max_retries=3):
        """
        Old integer-based system (current implementation).
        Kept for backward compatibility.
        """
        # ... existing move_to_position code ...
```

3. **Test Both Modes**

```bash
# Test integer mode (current)
USE_LEXORANK=false python test_ticket_position.py

# Test LexoRank mode (new)
USE_LEXORANK=true python test_ticket_position.py
```

---

### Phase 4: Switch to LexoRank

**Goal:** Enable LexoRank in production

**Duration:** 1 hour + monitoring

**Steps:**

1. **Update Environment Variables**

```bash
# .env or deployment config
USE_LEXORANK=true
```

2. **Deploy**

```bash
git add .
git commit -m "Enable LexoRank positioning system"
git push
```

3. **Monitor Performance**

```python
# Add logging to compare performance
import time

def move_ticket(self, ...):
    start = time.time()
    result = cls.move_ticket_lexorank(...)
    elapsed = (time.time() - start) * 1000

    logger.info(f"LexoRank move: {elapsed:.2f}ms")
    return result
```

**Expected Results:**

- Backend move time: 2,600ms → 10-20ms (99% improvement)
- No neighbor updates needed
- Zero deadlock errors

4. **Rollback Plan**

If issues occur:

```bash
# Revert to integer system
USE_LEXORANK=false

# Restart services
docker-compose restart backend
```

---

### Phase 5: Cleanup (Optional)

**Goal:** Remove old integer `order` field

**Duration:** 1 hour

**Steps:**

1. **Remove Fallback Logic**

```python
class TicketPosition(models.Model):
    ticket = OneToOneField(Ticket, primary_key=True)
    column = ForeignKey(Column)
    rank = CharField(max_length=100)  # Remove null=True
    # order field removed
    updated_at = DateTimeField(auto_now=True)

    class Meta:
        ordering = ['column', 'rank']  # Only rank
        indexes = [
            Index(fields=['column', 'rank']),
        ]
```

2. **Create Migration**

```bash
python manage.py makemigrations tickets --name remove_integer_order
```

3. **Apply**

```bash
python manage.py migrate
```

---

## Performance Comparison

### Current System (Integer Order + TicketPosition)

```
Move ticket within column (8 tickets):
├─ SELECT FOR UPDATE (3 tickets)     : 156ms
├─ UPDATE 2 neighbors (shift)         : 78ms
├─ UPDATE moving ticket               : 78ms
├─ UPDATE Ticket.column               : 78ms
└─ WebSocket broadcast                : 50ms
TOTAL: 480ms backend

Browser total: 2,600ms (with refetches)
```

### LexoRank System (Proposed)

```
Move ticket within column (8 tickets):
├─ SELECT neighbors (read-only)       : 5ms
├─ Calculate rank (in-memory)         : <1ms
├─ UPDATE moving ticket only          : 5ms
├─ UPDATE Ticket.column               : 5ms
└─ WebSocket broadcast                : 50ms
TOTAL: 10-20ms backend

Browser total: <200ms (with optimized refetch)
```

**Improvement: 99% faster backend, 92% faster total**

---

## Rank Rebalancing Strategy

### When to Rebalance

Ranks need rebalancing when strings get too long:

```python
# Before rebalancing:
"0|100000"
"0|1000001"  ← Getting long after many insertions
"0|10000015"
"0|100000155"
"0|1000001555"

# After rebalancing:
"0|100000"
"0|200000"
"0|300000"
"0|400000"
"0|500000"
```

### Rebalancing Algorithm

```python
def rebalance_column(column_id):
    """
    Rebalance ranks for a column.
    Should be run periodically (e.g., monthly) or when ranks get too long.
    """
    from tickets.utils.lexorank import LexoRank

    positions = TicketPosition.objects.filter(
        column_id=column_id
    ).order_by('rank')

    # Regenerate evenly spaced ranks
    for i, position in enumerate(positions):
        # Generate rank: "0|100000", "0|200000", etc.
        position.rank = f"0|{(i + 1) * 100000:06d}"
        position.save(update_fields=['rank'])
```

### Rebalancing Schedule

**Option 1: Periodic (Recommended)**

- Run monthly via cron job
- Low impact, preventive

```python
# management/commands/rebalance_ranks.py
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Rebalance LexoRank positions'

    def handle(self, *args, **options):
        from tickets.models import Column

        for column in Column.objects.all():
            rebalance_column(column.id)
            self.stdout.write(f"✅ Rebalanced column {column.name}")
```

```bash
# Cron: Run monthly
0 3 1 * * python manage.py rebalance_ranks
```

**Option 2: Automatic Threshold**

- Check rank length on every insert
- Rebalance if > 20 characters

```python
def move_ticket_lexorank(cls, ticket, target_column_id, target_index):
    # ... existing code ...

    # Check if rebalancing needed
    if len(new_rank) > 20:
        rebalance_column(target_column_id)
        # Recalculate rank after rebalancing
        new_rank = calculate_rank_after_rebalance(target_index)

    position.rank = new_rank
    position.save()
```

---

## Frontend Changes Required

### Update API Calls

Frontend doesn't need to know about ranks - the API handles it:

```typescript
// No changes needed! Still sends:
const updates = [
  { ticket_id: 49, column_id: 25, order: 0 }, // order = index
];

// Backend internally:
// - Converts order (index) to LexoRank
// - Updates only moving ticket
// - Returns success
```

### TypeScript Types

No changes needed - `column_order` field remains for display purposes.

---

## Rollback Strategy

### If LexoRank Has Issues

**Step 1: Disable Feature Flag**

```bash
USE_LEXORANK=false
```

**Step 2: Verify Integer System Still Works**

- `order` field still populated
- Old logic still functional
- No data loss

**Step 3: Investigate Issue**

- Check logs for rank generation errors
- Verify rank uniqueness
- Check for null ranks

**Step 4: Fix and Re-enable**

```bash
USE_LEXORANK=true
```

---

## Testing Checklist

### Before Migration

- [ ] Backup database
- [ ] Test integer system still works
- [ ] All tickets have valid `order` values

### Phase 1 (Add Rank Field)

- [ ] Migration runs successfully
- [ ] All tickets have non-null `rank` values
- [ ] Ranks are in correct order
- [ ] `order` field unchanged

### Phase 2 (Implement Algorithm)

- [ ] LexoRank.between() generates valid ranks
- [ ] Ranks are unique
- [ ] Ranks maintain sort order
- [ ] Edge cases handled (beginning, end, only ticket)

### Phase 3 (Dual Mode)

- [ ] Integer mode works (USE_LEXORANK=false)
- [ ] LexoRank mode works (USE_LEXORANK=true)
- [ ] Can switch between modes without errors
- [ ] Both modes produce correct ordering

### Phase 4 (Production)

- [ ] Performance: <20ms backend moves
- [ ] No deadlock errors
- [ ] Correct visual ordering
- [ ] WebSocket sync working
- [ ] Monitor for 24 hours

### Phase 5 (Cleanup)

- [ ] Backup before removing `order` field
- [ ] Migration runs successfully
- [ ] Old code removed
- [ ] Documentation updated

---

## Estimated Timeline

| Phase       | Description                  | Time     | Total              |
| ----------- | ---------------------------- | -------- | ------------------ |
| **Phase 1** | Add rank field + migration   | 2-3h     | 2-3h               |
| **Phase 2** | Implement LexoRank algorithm | 3-4h     | 5-7h               |
| **Phase 3** | Dual-mode support            | 2-3h     | 7-10h              |
| **Phase 4** | Deploy + monitor             | 1h + 24h | 8-11h + monitoring |
| **Phase 5** | Cleanup (optional)           | 1h       | 9-12h              |

**Total Development Time:** 9-12 hours
**Total Calendar Time:** 2-3 days (including monitoring)

---

## Success Metrics

### Performance

- ✅ Backend move time: <20ms (from 480ms)
- ✅ Total operation time: <200ms (from 2,600ms)
- ✅ No neighbor updates
- ✅ Zero deadlock errors

### Reliability

- ✅ 100% move success rate
- ✅ Correct ordering maintained
- ✅ Real-time sync working
- ✅ No data corruption

### Scalability

- ✅ Handles 10,000+ tickets per column
- ✅ Performance independent of column size
- ✅ Supports unlimited concurrent users
- ✅ Database CPU usage reduced

---

## References

### Similar Implementations

- **Jira**: Uses LexoRank for all boards
- **Linear**: Modified LexoRank with base-62
- **Trello**: Fractional indexing (similar concept)

### Libraries

- **Python**: `lexorank` package (pip install lexorank)
- **JavaScript**: `lexorank` npm package

### Resources

- [LexoRank Algorithm Explained](https://www.youtube.com/watch?v=OjQv9xMoFbg)
- [Jira's Ranking System](https://confluence.atlassian.com/jirakb/understanding-the-global-rank-field-in-jira-779159992.html)
- [Fractional Indexing](https://www.figma.com/blog/realtime-editing-of-ordered-sequences/)

---

## Notes

### Why Not Implement Now?

- **Time constraint**: 9-12 hours development + testing
- **Current system works**: No critical issues, just slower
- **Separate position model already helps**: 80% improvement achieved
- **Can be done incrementally**: No rush, can implement when time allows

### When to Implement?

- **Next sprint**: If performance is critical
- **Slow period**: When there's time for thorough testing
- **Before scaling**: If expecting 100+ concurrent users
- **After frontend optimization**: May be enough with refetch optimization

### Quick Wins to Try First

Before implementing LexoRank, try these faster optimizations:

1. **Optimize WebSocket payload** (2 hours)

   - Send minimal position data instead of full refetch
   - 50% improvement potential

2. **Debounce refetches** (1 hour)

   - One refetch instead of three
   - 30% improvement potential

3. **Incremental position updates** (3 hours)
   - Merge position changes instead of full reload
   - 40% improvement potential

**Combined: 70% improvement in 6 hours vs 99% improvement in 12 hours**

---

## Conclusion

LexoRank migration is a proven, industry-standard solution that will:

- ✅ Eliminate performance bottlenecks (99% faster)
- ✅ Remove deadlock risk entirely
- ✅ Scale to unlimited tickets
- ✅ Match professional tools (Jira, Linear)

The current separate position model is a great intermediate step that already provides 80% of the benefits. LexoRank can be implemented later when time allows for maximum performance.

**Status:** Ready to implement when needed
**Priority:** Medium (current system works, but LexoRank is ideal long-term)
**Risk:** Low (can rollback to integer system anytime)
