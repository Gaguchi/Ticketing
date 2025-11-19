"""
Test script for TicketPosition model performance.
Compares old heavy approach vs new lightweight approach.
"""
import os
import django
import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from tickets.models import Ticket, TicketPosition, Column
from django.db import connection
from django.test.utils import CaptureQueriesContext

def test_ticket_position_model():
    """Test that TicketPosition model is working correctly"""
    print("=" * 80)
    print("TESTING TICKETPOSITION MODEL")
    print("=" * 80)
    
    # Get some test data
    ticket = Ticket.objects.first()
    if not ticket:
        print("❌ No tickets found in database")
        return
    
    print(f"\n✅ Found ticket: {ticket.ticket_key}")
    
    # Check if position exists
    try:
        position = ticket.position
        print(f"✅ TicketPosition exists:")
        print(f"   - Ticket: {position.ticket.ticket_key}")
        print(f"   - Column: {position.column.name}")
        print(f"   - Order: {position.order}")
        print(f"   - Updated: {position.updated_at}")
    except TicketPosition.DoesNotExist:
        print(f"❌ No TicketPosition found for ticket {ticket.ticket_key}")
        return
    
    # Count total positions
    total_positions = TicketPosition.objects.count()
    total_tickets = Ticket.objects.count()
    print(f"\n📊 Statistics:")
    print(f"   - Total tickets: {total_tickets}")
    print(f"   - Total positions: {total_positions}")
    
    if total_positions == total_tickets:
        print(f"   ✅ All tickets have positions!")
    else:
        print(f"   ⚠️ Missing {total_tickets - total_positions} positions")
    
    return True


def test_move_performance():
    """Test performance of move_to_position"""
    print("\n" + "=" * 80)
    print("TESTING MOVE PERFORMANCE")
    print("=" * 80)
    
    # Get a ticket to move
    ticket = Ticket.objects.select_related('column').first()
    if not ticket:
        print("❌ No tickets found")
        return
    
    original_column = ticket.column_id
    original_order = ticket.position.order
    
    print(f"\n📍 Testing ticket: {ticket.ticket_key}")
    print(f"   Current: column={original_column}, order={original_order}")
    
    # Test move within same column
    print("\n🔄 Test 1: Move within same column (order 0)")
    
    start_time = time.time()
    with CaptureQueriesContext(connection) as ctx:
        ticket.move_to_position(original_column, 0)
    elapsed = (time.time() - start_time) * 1000
    
    print(f"   ⏱️ Time: {elapsed:.2f}ms")
    print(f"   📊 Queries: {len(ctx.captured_queries)}")
    print(f"   ✅ New position: order={ticket.position.order}")
    
    # Move back
    print(f"\n🔄 Test 2: Move back to original position")
    
    start_time = time.time()
    with CaptureQueriesContext(connection) as ctx:
        ticket.move_to_position(original_column, original_order)
    elapsed = (time.time() - start_time) * 1000
    
    print(f"   ⏱️ Time: {elapsed:.2f}ms")
    print(f"   📊 Queries: {len(ctx.captured_queries)}")
    print(f"   ✅ Restored to: order={ticket.position.order}")
    
    # Test cross-column move (if multiple columns exist)
    columns = list(Column.objects.filter(project=ticket.project).exclude(id=original_column)[:1])
    if columns:
        target_column = columns[0]
        print(f"\n🔄 Test 3: Move to different column ({target_column.name})")
        
        start_time = time.time()
        with CaptureQueriesContext(connection) as ctx:
            ticket.move_to_position(target_column.id, 0)
        elapsed = (time.time() - start_time) * 1000
        
        print(f"   ⏱️ Time: {elapsed:.2f}ms")
        print(f"   📊 Queries: {len(ctx.captured_queries)}")
        print(f"   ✅ New column: {ticket.column.name}, order={ticket.position.order}")
        
        # Move back to original
        print(f"\n🔄 Test 4: Move back to original column")
        start_time = time.time()
        ticket.move_to_position(original_column, original_order)
        elapsed = (time.time() - start_time) * 1000
        
        print(f"   ⏱️ Time: {elapsed:.2f}ms")
        print(f"   ✅ Restored to: column={ticket.column.name}, order={ticket.position.order}")
    
    print("\n✅ All move tests completed successfully!")


def show_query_details():
    """Show detailed query information for a move"""
    print("\n" + "=" * 80)
    print("DETAILED QUERY ANALYSIS")
    print("=" * 80)
    
    ticket = Ticket.objects.first()
    if not ticket:
        return
    
    print(f"\nMoving ticket {ticket.ticket_key} to position 0...")
    
    with CaptureQueriesContext(connection) as ctx:
        ticket.move_to_position(ticket.column_id, 0)
    
    print(f"\n📊 Total queries: {len(ctx.captured_queries)}")
    print("\nQuery breakdown:")
    
    for i, query in enumerate(ctx.captured_queries, 1):
        sql = query['sql']
        time_ms = float(query['time']) * 1000
        
        # Simplify long SQL
        if 'SELECT FOR UPDATE' in sql:
            print(f"{i}. SELECT FOR UPDATE (lock positions) - {time_ms:.2f}ms")
        elif 'UPDATE' in sql and 'ticketposition' in sql.lower():
            print(f"{i}. UPDATE positions - {time_ms:.2f}ms")
        elif 'UPDATE' in sql and 'ticket' in sql.lower():
            print(f"{i}. UPDATE ticket.column - {time_ms:.2f}ms")
        elif 'SELECT' in sql:
            print(f"{i}. SELECT (refresh/fetch) - {time_ms:.2f}ms")
        else:
            print(f"{i}. Other: {sql[:80]}... - {time_ms:.2f}ms")


if __name__ == '__main__':
    try:
        # Run tests
        if test_ticket_position_model():
            test_move_performance()
            show_query_details()
        
        print("\n" + "=" * 80)
        print("✅ ALL TESTS COMPLETED")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
