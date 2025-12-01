import os
import django
import asyncio
import json
import sys
from channels.layers import get_channel_layer

# Setup Django environment
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from tickets.models import Project
from rest_framework_simplejwt.tokens import RefreshToken
import websockets

User = get_user_model()

def setup_test_data():
    print("\n[1] Setting up test data...")
    # Create or get superuser
    username = 'redis_test_user'
    email = 'redis_test@example.com'
    password = 'testpassword123'
    
    try:
        user = User.objects.get(username=username)
        print(f"   User '{username}' found.")
    except User.DoesNotExist:
        user = User.objects.create_superuser(username=username, email=email, password=password)
        print(f"   User '{username}' created.")

    # Create or get project
    project_id = 1
    try:
        project = Project.objects.get(id=project_id)
        print(f"   Project {project_id} found.")
    except Project.DoesNotExist:
        # Try to find by key to avoid unique constraint error
        try:
            project = Project.objects.get(key="TEST")
            print(f"   Project with key 'TEST' found (ID: {project.id}). Using it.")
            project_id = project.id
        except Project.DoesNotExist:
            project = Project.objects.create(id=project_id, name="Test Project", key="TEST")
            print(f"   Project {project_id} created.")

    # Generate Token
    refresh = RefreshToken.for_user(user)
    token = str(refresh.access_token)
    print(f"   Token generated.")
    return token, project_id

async def test_redis_messaging(token, project_id):
    print("Starting Redis Messaging Test...")

    # 2. Connect Clients
    ws_url = f"ws://localhost:8004/ws/projects/{project_id}/presence/?token={token}"
    print(f"\n[2] Connecting to WebSocket: {ws_url}")

    async with websockets.connect(ws_url) as client_a, \
               websockets.connect(ws_url) as client_b:
        
        print("   Client A connected")
        print("   Client B connected")

        # Consume initial "user_status" messages (join events)
        # We expect at least one join event for each connection
        print("\n[3] Waiting for join events...")
        # Just drain a few messages to clear the buffer
        try:
            # Drain up to 5 messages or until timeout
            for _ in range(5):
                await asyncio.wait_for(client_a.recv(), timeout=0.5)
        except asyncio.TimeoutError:
            pass
            
        try:
            for _ in range(5):
                await asyncio.wait_for(client_b.recv(), timeout=0.5)
        except asyncio.TimeoutError:
            pass

        # 3. Test Messaging
        print("\n[4] Testing Message Broadcast (Redis Check)...")
        
        test_message = {
            "type": "typing",
            "ticket_id": 999
        }
        
        print(f"   Client A sending: {test_message}")
        await client_a.send(json.dumps(test_message))

        print("   Client B waiting for message...")
        try:
            response = await asyncio.wait_for(client_b.recv(), timeout=5.0)
            data = json.loads(response)
            
            print(f"   Client B received: {data}")
            
            if data.get('type') == 'user_typing' and data.get('ticket_id') == 999:
                print("\nSUCCESS: Redis Channel Layer is working! Message broadcasted correctly.")
            else:
                print(f"\nWARNING: Received unexpected message: {data}")
                
        except asyncio.TimeoutError:
            print("\nFAILURE: Client B did not receive the message. Redis might not be configured correctly.")

if __name__ == "__main__":
    token, project_id = setup_test_data()
    asyncio.run(test_redis_messaging(token, project_id))
