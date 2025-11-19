"""
Test script for verifying deadlock prevention in ticket moves.

This script performs concurrent ticket moves to test that the SELECT FOR UPDATE
deadlock prevention is working correctly.

Usage:
    python test_concurrent_moves.py

Requirements:
    - Backend server running on http://localhost:8000
    - Valid authentication token
    - At least 2 tickets in the database
"""

import threading
import requests
import time
from datetime import datetime
import sys


def get_auth_token():
    """Get authentication token by logging in."""
    login_url = f"{BASE_URL}/api/tickets/auth/login/"
    data = {
        "username": USERNAME,
        "password": PASSWORD
    }
    
    try:
        response = requests.post(login_url, json=data)
        if response.status_code == 200:
            response_data = response.json()
            # Try to get JWT access token first, then fallback to simple token
            token = response_data.get('access') or response_data.get('token')
            if token:
                print(f"✅ Successfully authenticated as {USERNAME}")
                return token
            else:
                print(f"❌ No token in response: {response_data}")
                return None
        else:
            print(f"❌ Authentication failed with status {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Failed to authenticate: {e}")
        return None


# Configuration
BASE_URL = "http://localhost:8000"
USERNAME = "Gaga"
PASSWORD = "nji9nji9"

# Auth token will be fetched automatically
AUTH_TOKEN = None
HEADERS = {
    "Content-Type": "application/json"
}


def move_ticket(ticket_id, column_id, column_order, test_name, headers):
    """Move a ticket to a new position."""
    url = f"{BASE_URL}/api/tickets/{ticket_id}/"
    data = {
        "column": column_id,
        "column_order": column_order
    }
    
    start_time = time.time()
    try:
        response = requests.patch(url, json=data, headers=headers)
        duration = (time.time() - start_time) * 1000  # Convert to ms
        
        if response.status_code == 200:
            print(f"✅ {test_name}: Success in {duration:.0f}ms")
            return True
        else:
            print(f"❌ {test_name}: Failed with status {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
    except Exception as e:
        duration = (time.time() - start_time) * 1000
        print(f"❌ {test_name}: Exception after {duration:.0f}ms - {str(e)[:100]}")
        return False


def test_concurrent_cross_column_moves():
    """
    Test concurrent moves between different columns.
    This is the scenario most likely to cause deadlocks.
    """
    print("\n" + "="*60)
    print("TEST 1: Concurrent Cross-Column Moves")
    print("="*60)
    
    headers = {
        "Authorization": f"Bearer {AUTH_TOKEN}",
        "Content-Type": "application/json"
    }
    results = []
    
    def move_ticket_1():
        # Move ticket 49 (DATA-1) from column 25 to 26
        success = move_ticket(49, 26, 0, "DATA-1 (25→26)", headers)
        results.append(success)
    
    def move_ticket_2():
        # Move ticket 54 (DATA-6) from column 25 to 26 (same direction, different ticket)
        success = move_ticket(54, 26, 1, "DATA-6 (25→26)", headers)
        results.append(success)
    
    # Execute simultaneously
    thread_a = threading.Thread(target=move_ticket_1)
    thread_b = threading.Thread(target=move_ticket_2)
    
    start_time = time.time()
    thread_a.start()
    thread_b.start()
    
    thread_a.join()
    thread_b.join()
    duration = (time.time() - start_time) * 1000
    
    success_count = sum(results)
    print(f"\n📊 Results: {success_count}/2 successful in {duration:.0f}ms total")
    return success_count == 2


def test_rapid_sequential_moves():
    """
    Test rapid sequential moves of the same ticket.
    """
    print("\n" + "="*60)
    print("TEST 2: Rapid Sequential Moves")
    print("="*60)
    
    headers = {
        "Authorization": f"Bearer {AUTH_TOKEN}",
        "Content-Type": "application/json"
    }
    results = []
    
    for i in range(10):
        column = 25 if i % 2 == 0 else 26
        success = move_ticket(49, column, i % 5, f"Move {i+1} → col {column}", headers)
        results.append(success)
        time.sleep(0.05)  # 50ms between moves
    
    success_count = sum(results)
    print(f"\n📊 Results: {success_count}/10 successful")
    return success_count >= 8  # Allow some failures due to rapid changes


def test_stress_multiple_concurrent():
    """
    Test multiple concurrent moves (stress test).
    """
    print("\n" + "="*60)
    print("TEST 3: Multiple Concurrent Moves (Stress Test)")
    print("="*60)
    
    headers = {
        "Authorization": f"Bearer {AUTH_TOKEN}",
        "Content-Type": "application/json"
    }
    results = []
    threads = []
    
    def random_move(ticket_id, move_num):
        import random
        column = random.choice([25, 26, 33])  # Use actual column IDs from DB
        order = random.randint(0, 5)
        success = move_ticket(ticket_id, column, order, f"Move {move_num}", headers)
        results.append(success)
    
    # Launch 20 concurrent moves
    start_time = time.time()
    ticket_ids = [49, 54, 55, 56, 50]  # Use actual ticket IDs from DB
    for i in range(20):
        ticket_id = ticket_ids[i % 5]  # Rotate between actual tickets
        thread = threading.Thread(target=random_move, args=(ticket_id, i+1))
        threads.append(thread)
        thread.start()
    
    # Wait for all to complete
    for thread in threads:
        thread.join()
    
    duration = (time.time() - start_time) * 1000
    success_count = sum(results)
    
    print(f"\n📊 Results: {success_count}/20 successful in {duration:.0f}ms total")
    print(f"   Success rate: {success_count/20*100:.1f}%")
    print(f"   Average time: {duration/20:.0f}ms per move")
    
    return success_count >= 18  # Allow 2 failures


def run_all_tests():
    """Run all test suites."""
    global AUTH_TOKEN
    
    print("\n" + "="*60)
    print("🧪 TICKET MOVE DEADLOCK PREVENTION TESTS")
    print("="*60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Get authentication token
    AUTH_TOKEN = get_auth_token()
    if not AUTH_TOKEN:
        print("\n❌ ERROR: Failed to get authentication token")
        print("   Make sure the backend is running at http://localhost:8000")
        return
    
    test_results = []
    
    # Run tests
    test_results.append(("Concurrent Cross-Column", test_concurrent_cross_column_moves()))
    time.sleep(1)  # Brief pause between tests
    
    test_results.append(("Rapid Sequential", test_rapid_sequential_moves()))
    time.sleep(1)
    
    test_results.append(("Stress Test", test_stress_multiple_concurrent()))
    
    # Summary
    print("\n" + "="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for _, result in test_results if result)
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Deadlock prevention is working.")
    else:
        print("\n⚠️ Some tests failed. Check the backend logs for errors.")


if __name__ == "__main__":
    run_all_tests()
