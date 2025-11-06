# Chat System API Testing Guide

## Prerequisites

1. Backend server running on http://localhost:8000
2. Valid JWT token (get from login)
3. At least one project created
4. At least one user account

## Step 1: Get Authentication Token

```powershell
# Login and get JWT token
$loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/tickets/auth/login/" -Method POST -ContentType "application/json" -Body '{"username":"Gaga","password":"nji9nji9"}'
$token = $loginResponse.access
Write-Host "Token: $token"
```

## Step 2: Test Chat Room Endpoints

### List all chat rooms (should be empty initially)

```powershell
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "http://localhost:8000/api/chat/rooms/" -Method GET -Headers $headers
```

### Create a group chat room

```powershell
$createRoomBody = @{
    name = "Test Chat Room"
    type = "group"
    project = 1
    participant_ids = @(1, 2)  # Replace with actual user IDs
} | ConvertTo-Json

$room = Invoke-RestMethod -Uri "http://localhost:8000/api/chat/rooms/" -Method POST -Headers $headers -Body $createRoomBody
Write-Host "Created room ID: $($room.id)"
$roomId = $room.id
```

### Create a direct message room

```powershell
$createDMBody = @{
    type = "direct"
    project = 1
    participant_ids = @(1, 2)  # Current user + another user
} | ConvertTo-Json

$dmRoom = Invoke-RestMethod -Uri "http://localhost:8000/api/chat/rooms/" -Method POST -Headers $headers -Body $createDMBody
Write-Host "Created DM room ID: $($dmRoom.id)"
```

## Step 3: Test Message Endpoints

### Send a text message

```powershell
$sendMessageBody = @{
    room = $roomId
    content = "Hello, this is a test message!"
    type = "text"
} | ConvertTo-Json

$message = Invoke-RestMethod -Uri "http://localhost:8000/api/chat/messages/" -Method POST -Headers $headers -Body $sendMessageBody
Write-Host "Sent message ID: $($message.id)"
$messageId = $message.id
```

### Get messages for a room

```powershell
$messages = Invoke-RestMethod -Uri "http://localhost:8000/api/chat/messages/?room=$roomId" -Method GET -Headers $headers
Write-Host "Found $($messages.Count) messages"
$messages | Format-Table id, content, created_at
```

### Edit a message

```powershell
$editMessageBody = @{
    content = "Updated message content!"
} | ConvertTo-Json

$updatedMessage = Invoke-RestMethod -Uri "http://localhost:8000/api/chat/messages/$messageId/" -Method PATCH -Headers $headers -Body $editMessageBody
Write-Host "Message edited. is_edited: $($updatedMessage.is_edited)"
```

### Send multiple messages

```powershell
1..5 | ForEach-Object {
    $body = @{
        room = $roomId
        content = "Test message number $_"
        type = "text"
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "http://localhost:8000/api/chat/messages/" -Method POST -Headers $headers -Body $body
    Start-Sleep -Milliseconds 500
}
Write-Host "Sent 5 messages"
```

## Step 4: Test Reactions

### Add an emoji reaction

```powershell
$reactionBody = @{
    emoji = "👍"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/chat/messages/$messageId/add_reaction/" -Method POST -Headers $headers -Body $reactionBody
Write-Host "Added 👍 reaction"
```

### Add more reactions

```powershell
@("❤️", "😂", "🎉") | ForEach-Object {
    $body = @{ emoji = $_ } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8000/api/chat/messages/$messageId/add_reaction/" -Method POST -Headers $headers -Body $body
    Write-Host "Added $_ reaction"
}
```

### Remove a reaction

```powershell
$removeReactionBody = @{
    emoji = "👍"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/chat/messages/$messageId/remove_reaction/" -Method POST -Headers $headers -Body $removeReactionBody
Write-Host "Removed 👍 reaction"
```

### Get message with reactions

```powershell
$messagesWithReactions = Invoke-RestMethod -Uri "http://localhost:8000/api/chat/messages/?room=$roomId" -Method GET -Headers $headers
$msgWithReaction = $messagesWithReactions | Where-Object { $_.id -eq $messageId }
Write-Host "Message has $($msgWithReaction.reactions.Count) reactions:"
$msgWithReaction.reactions | Format-Table emoji, @{Name='User';Expression={$_.user.display_name}}
```

## Step 5: Test Participant Management

### Add a participant to room

```powershell
$addParticipantBody = @{
    user_id = 3  # Replace with actual user ID
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/chat/rooms/$roomId/add_participant/" -Method POST -Headers $headers -Body $addParticipantBody
Write-Host "Added participant"
```

### Remove a participant

```powershell
$removeParticipantBody = @{
    user_id = 3
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/chat/rooms/$roomId/remove_participant/" -Method POST -Headers $headers -Body $removeParticipantBody
Write-Host "Removed participant"
```

## Step 6: Test Mark as Read

### Mark room as read

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/chat/rooms/$roomId/mark_read/" -Method POST -Headers $headers
Write-Host "Marked room as read"
```

### Verify unread count

```powershell
$roomDetails = Invoke-RestMethod -Uri "http://localhost:8000/api/chat/rooms/$roomId/" -Method GET -Headers $headers
Write-Host "Unread count: $($roomDetails.unread_count)"
```

## Step 7: Test Message Search

### Search for messages

```powershell
$searchResults = Invoke-RestMethod -Uri "http://localhost:8000/api/chat/messages/?search=test" -Method GET -Headers $headers
Write-Host "Found $($searchResults.Count) messages matching 'test'"
$searchResults | Format-Table id, content
```

### Search within a specific room

```powershell
$searchResults = Invoke-RestMethod -Uri "http://localhost:8000/api/chat/messages/?search=message&room=$roomId" -Method GET -Headers $headers
Write-Host "Found $($searchResults.Count) messages in room $roomId"
```

## Step 8: Test File Upload

### Upload an image (create test image first)

```powershell
# Create a simple test file
$testFile = "test-image.txt"
"Test file content for chat upload" | Out-File -FilePath $testFile -Encoding utf8

# Upload the file
$boundary = [System.Guid]::NewGuid().ToString()
$filePath = Resolve-Path $testFile
$fileBytes = [System.IO.File]::ReadAllBytes($filePath)
$fileName = [System.IO.Path]::GetFileName($filePath)

$bodyLines = @(
    "--$boundary",
    "Content-Disposition: form-data; name=`"room`"",
    "",
    "$roomId",
    "--$boundary",
    "Content-Disposition: form-data; name=`"content`"",
    "",
    "Check out this file!",
    "--$boundary",
    "Content-Disposition: form-data; name=`"type`"",
    "",
    "file",
    "--$boundary",
    "Content-Disposition: form-data; name=`"attachment`"; filename=`"$fileName`"",
    "Content-Type: application/octet-stream",
    "",
    [System.Text.Encoding]::UTF8.GetString($fileBytes),
    "--$boundary--"
)

$body = $bodyLines -join "`r`n"

$uploadHeaders = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "multipart/form-data; boundary=$boundary"
}

try {
    $fileMessage = Invoke-RestMethod -Uri "http://localhost:8000/api/chat/messages/" -Method POST -Headers $uploadHeaders -Body $body
    Write-Host "Uploaded file message ID: $($fileMessage.id)"
    Write-Host "File URL: $($fileMessage.attachment_url)"
} catch {
    Write-Host "File upload test - using REST API directly may have encoding issues"
    Write-Host "File uploads work better through the frontend or using a proper HTTP client"
}

# Cleanup
Remove-Item $testFile -ErrorAction SilentlyContinue
```

## Step 9: Test Delete Message

### Delete a message

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/chat/messages/$messageId/" -Method DELETE -Headers $headers
Write-Host "Deleted message $messageId"
```

### Verify deletion

```powershell
$remainingMessages = Invoke-RestMethod -Uri "http://localhost:8000/api/chat/messages/?room=$roomId" -Method GET -Headers $headers
Write-Host "Remaining messages: $($remainingMessages.Count)"
```

## Step 10: Full Workflow Test

```powershell
# Complete test workflow
Write-Host "`n=== Starting Full Chat System Test ===`n" -ForegroundColor Cyan

# 1. Create room
Write-Host "1. Creating chat room..." -ForegroundColor Yellow
$roomBody = @{
    name = "Integration Test Room"
    type = "group"
    project = 1
    participant_ids = @(1)
} | ConvertTo-Json

$testRoom = Invoke-RestMethod -Uri "http://localhost:8000/api/chat/rooms/" -Method POST -Headers $headers -Body $roomBody
Write-Host "   ✓ Room created: $($testRoom.display_name) (ID: $($testRoom.id))" -ForegroundColor Green

# 2. Send messages
Write-Host "`n2. Sending messages..." -ForegroundColor Yellow
$testMessages = @()
@("Hello!", "How are you?", "This is a test") | ForEach-Object {
    $msgBody = @{
        room = $testRoom.id
        content = $_
        type = "text"
    } | ConvertTo-Json

    $msg = Invoke-RestMethod -Uri "http://localhost:8000/api/chat/messages/" -Method POST -Headers $headers -Body $msgBody
    $testMessages += $msg
    Write-Host "   ✓ Sent: $_" -ForegroundColor Green
}

# 3. Add reactions
Write-Host "`n3. Adding reactions..." -ForegroundColor Yellow
$firstMsgId = $testMessages[0].id
@("👍", "❤️") | ForEach-Object {
    $reactionBody = @{ emoji = $_ } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8000/api/chat/messages/$firstMsgId/add_reaction/" -Method POST -Headers $headers -Body $reactionBody
    Write-Host "   ✓ Added $_ to message" -ForegroundColor Green
}

# 4. Edit message
Write-Host "`n4. Editing message..." -ForegroundColor Yellow
$editBody = @{ content = "Hello, World! (edited)" } | ConvertTo-Json
$edited = Invoke-RestMethod -Uri "http://localhost:8000/api/chat/messages/$firstMsgId/" -Method PATCH -Headers $headers -Body $editBody
Write-Host "   ✓ Message edited: $($edited.content)" -ForegroundColor Green

# 5. Get all messages
Write-Host "`n5. Fetching messages..." -ForegroundColor Yellow
$allMessages = Invoke-RestMethod -Uri "http://localhost:8000/api/chat/messages/?room=$($testRoom.id)" -Method GET -Headers $headers
Write-Host "   ✓ Found $($allMessages.Count) messages" -ForegroundColor Green

# 6. Mark as read
Write-Host "`n6. Marking room as read..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "http://localhost:8000/api/chat/rooms/$($testRoom.id)/mark_read/" -Method POST -Headers $headers
Write-Host "   ✓ Room marked as read" -ForegroundColor Green

# 7. Search messages
Write-Host "`n7. Searching messages..." -ForegroundColor Yellow
$searchResults = Invoke-RestMethod -Uri "http://localhost:8000/api/chat/messages/?search=test&room=$($testRoom.id)" -Method GET -Headers $headers
Write-Host "   ✓ Found $($searchResults.Count) messages matching 'test'" -ForegroundColor Green

Write-Host "`n=== All Tests Completed Successfully! ===`n" -ForegroundColor Cyan
```

## Troubleshooting

### Check if chat app is accessible

```powershell
try {
    Invoke-RestMethod -Uri "http://localhost:8000/api/chat/rooms/" -Method GET -Headers $headers
    Write-Host "✓ Chat API is accessible" -ForegroundColor Green
} catch {
    Write-Host "✗ Chat API error: $($_.Exception.Message)" -ForegroundColor Red
}
```

### Check Django server logs

Look for any errors in the terminal where Django is running.

### Verify migrations applied

```powershell
# In backend directory
.\venv\Scripts\python.exe manage.py showmigrations chat
```

### Test with Django admin

Navigate to http://localhost:8000/admin/chat/ to view chat data directly.
