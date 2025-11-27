# Static Files & Media Handling Groundwork

> **Purpose**: Prepare infrastructure for image/file uploads across the system
> **Status**: ✅ Phase 1 Complete
> **Created**: November 27, 2025
> **Updated**: November 27, 2025

---

## 📊 Current State Audit

### ✅ Already Implemented

| Item                                 | Status | Location                                  |
| ------------------------------------ | ------ | ----------------------------------------- |
| Pillow installed                     | ✅     | `requirements.txt`                        |
| MEDIA_URL/MEDIA_ROOT                 | ✅     | `settings.py`                             |
| Static files (WhiteNoise)            | ✅     | `settings.py`                             |
| Debug media serving                  | ✅     | `urls.py`                                 |
| Company.logo field                   | ✅     | `tickets/models.py`                       |
| Company.logo_thumbnail field         | ✅     | `tickets/models.py` (NEW)                 |
| Attachment.file field                | ✅     | `tickets/models.py`                       |
| Attachment.file_size/content_type    | ✅     | `tickets/models.py` (NEW)                 |
| ChatMessage.attachment               | ✅     | `chat/models.py`                          |
| CompanySerializer.logo               | ✅     | `tickets/serializers.py`                  |
| CompanySerializer.logo_url           | ✅     | `tickets/serializers.py` (NEW)            |
| CompanySerializer.logo_thumbnail_url | ✅     | `tickets/serializers.py` (NEW)            |
| Media folder structure               | ✅     | `backend/media/` (NEW)                    |
| .gitignore for media                 | ✅     | `backend/.gitignore` (NEW)                |
| File validators                      | ✅     | `tickets/utils/validators.py` (NEW)       |
| Image processing utils               | ✅     | `tickets/utils/image_processing.py` (NEW) |

### ❌ Still Needed

| Item                     | Priority | Notes                    |
| ------------------------ | -------- | ------------------------ |
| Production media serving | High     | Nginx config for Dokploy |
| S3/Object storage option | Low      | For scale (future)       |
| Upload progress API      | Low      | Nice to have             |

---

## 🎯 What We Need Media For

### 1. Company Logos (Now)

- **Field**: `Company.logo`
- **Use cases**:
  - Service Desk branding (login page, header)
  - Main dashboard company cards
  - Ticket detail view
- **Sizes needed**:
  - Full: 400x400 max
  - Thumbnail: 64x64 for lists
  - Favicon: 32x32 (maybe)

### 2. Ticket Attachments (Now)

- **Field**: `Attachment.file`
- **Use cases**:
  - Screenshots for bug reports
  - Documents
  - Any file user uploads
- **Limits**:
  - Max size: 10MB per file?
  - Types: Images, PDFs, docs, common formats

### 3. Chat Attachments (Now)

- **Field**: `ChatMessage.attachment`
- **Use cases**:
  - Share files in chat
  - Screenshots during support

### 4. User Avatars (Future)

- **Field**: `User.avatar` (doesn't exist yet)
- **Use cases**:
  - Profile pictures
  - Comment attribution
  - Chat messages

---

## 🛠️ Implementation Tasks

### Phase 1: Basic Setup (Do Now)

#### Task 1.1: Create Media Directory Structure

```bash
backend/
├── media/                      # Create this
│   ├── company_logos/          # Company branding
│   ├── attachments/            # Ticket attachments (by date)
│   │   └── 2025/11/27/
│   └── chat_attachments/       # Chat files (by date)
│       └── 2025/11/27/
```

#### Task 1.2: Add .gitkeep Files

Keep empty directories in git:

```
backend/media/.gitkeep
backend/media/company_logos/.gitkeep
backend/media/attachments/.gitkeep
backend/media/chat_attachments/.gitkeep
```

#### Task 1.3: Update .gitignore

```gitignore
# Media files (keep structure, ignore uploads)
backend/media/*
!backend/media/.gitkeep
!backend/media/company_logos/.gitkeep
!backend/media/attachments/.gitkeep
!backend/media/chat_attachments/.gitkeep
```

#### Task 1.4: Production Media Serving (Dokploy/Nginx)

Add to nginx config:

```nginx
# Serve media files
location /media/ {
    alias /app/media/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

---

### Phase 2: Validation & Security

#### Task 2.1: Image Validation Utility

```python
# backend/tickets/utils/validators.py

from django.core.exceptions import ValidationError
from PIL import Image
import os

ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

ALLOWED_FILE_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
]

def validate_image(file):
    """Validate image file type and size"""
    if file.size > MAX_IMAGE_SIZE:
        raise ValidationError(f'Image too large. Max size is {MAX_IMAGE_SIZE // 1024 // 1024}MB')

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise ValidationError(f'Invalid image type. Allowed: {", ".join(ALLOWED_IMAGE_TYPES)}')

    # Verify it's actually an image
    try:
        img = Image.open(file)
        img.verify()
    except Exception:
        raise ValidationError('Invalid or corrupted image file')

def validate_file(file):
    """Validate general file upload"""
    if file.size > MAX_FILE_SIZE:
        raise ValidationError(f'File too large. Max size is {MAX_FILE_SIZE // 1024 // 1024}MB')

    if file.content_type not in ALLOWED_FILE_TYPES:
        raise ValidationError(f'File type not allowed: {file.content_type}')
```

#### Task 2.2: Apply Validation to Models

```python
# backend/tickets/models.py

from tickets.utils.validators import validate_image, validate_file

class Company(models.Model):
    logo = models.ImageField(
        upload_to='company_logos/',
        blank=True,
        null=True,
        validators=[validate_image],
        help_text='Company logo (max 5MB, JPG/PNG/GIF/WebP)'
    )

class Attachment(models.Model):
    file = models.FileField(
        upload_to='attachments/%Y/%m/%d/',
        validators=[validate_file]
    )
```

---

### Phase 3: Image Processing

#### Task 3.1: Auto-Resize on Upload

```python
# backend/tickets/utils/image_processing.py

from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
import os

def resize_image(image_file, max_size=(400, 400)):
    """Resize image to max dimensions while maintaining aspect ratio"""
    img = Image.open(image_file)

    # Convert to RGB if necessary (for PNG transparency)
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')

    # Resize maintaining aspect ratio
    img.thumbnail(max_size, Image.Resampling.LANCZOS)

    # Save to BytesIO
    buffer = BytesIO()
    img.save(buffer, format='JPEG', quality=85, optimize=True)
    buffer.seek(0)

    # Return as Django file
    return ContentFile(buffer.read())

def create_thumbnail(image_file, size=(64, 64)):
    """Create a square thumbnail"""
    img = Image.open(image_file)

    # Convert to RGB
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')

    # Create square crop from center
    width, height = img.size
    min_dim = min(width, height)
    left = (width - min_dim) // 2
    top = (height - min_dim) // 2
    img = img.crop((left, top, left + min_dim, top + min_dim))

    # Resize to target
    img = img.resize(size, Image.Resampling.LANCZOS)

    buffer = BytesIO()
    img.save(buffer, format='JPEG', quality=85)
    buffer.seek(0)

    return ContentFile(buffer.read())
```

#### Task 3.2: Add Thumbnail Field to Company

```python
# Option A: Generate on the fly (simpler)
# Option B: Store thumbnail as separate field (faster serving)

class Company(models.Model):
    logo = models.ImageField(upload_to='company_logos/', blank=True, null=True)
    logo_thumbnail = models.ImageField(upload_to='company_logos/thumbs/', blank=True, null=True)

    def save(self, *args, **kwargs):
        if self.logo and not self.logo_thumbnail:
            # Generate thumbnail on save
            from tickets.utils.image_processing import create_thumbnail
            thumb_content = create_thumbnail(self.logo)
            thumb_name = f"thumb_{os.path.basename(self.logo.name)}"
            self.logo_thumbnail.save(thumb_name, thumb_content, save=False)
        super().save(*args, **kwargs)
```

---

### Phase 4: API Enhancements

#### Task 4.1: Update CompanySerializer for Logo Upload

```python
class CompanySerializer(serializers.ModelSerializer):
    logo = serializers.ImageField(required=False, allow_null=True)
    logo_url = serializers.SerializerMethodField()
    logo_thumbnail_url = serializers.SerializerMethodField()

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None

    def get_logo_thumbnail_url(self, obj):
        if obj.logo_thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo_thumbnail.url)
            return obj.logo_thumbnail.url
        return None
```

#### Task 4.2: Attachment Upload Endpoint

Ensure multipart/form-data handling:

```python
# In views.py
from rest_framework.parsers import MultiPartParser, FormParser

class AttachmentViewSet(viewsets.ModelViewSet):
    parser_classes = [MultiPartParser, FormParser]
    # ...
```

---

## 📁 File Structure After Implementation

```
backend/
├── media/
│   ├── .gitkeep
│   ├── company_logos/
│   │   ├── .gitkeep
│   │   ├── thumbs/           # Thumbnails
│   │   ├── acme-corp.jpg
│   │   └── tech-inc.png
│   ├── attachments/
│   │   ├── .gitkeep
│   │   └── 2025/11/27/
│   │       ├── screenshot-abc123.png
│   │       └── document-def456.pdf
│   └── chat_attachments/
│       ├── .gitkeep
│       └── 2025/11/27/
│           └── image-ghi789.jpg
├── tickets/
│   └── utils/
│       ├── __init__.py
│       ├── validators.py
│       └── image_processing.py
```

---

## 🐳 Dokploy/Docker Configuration

### Dockerfile Update

```dockerfile
# Ensure media directory exists
RUN mkdir -p /app/media/company_logos /app/media/attachments /app/media/chat_attachments

# Set permissions
RUN chown -R www-data:www-data /app/media
```

### Docker Volume (Persistent Storage)

```yaml
# docker-compose.yml
services:
  backend:
    volumes:
      - media_data:/app/media

volumes:
  media_data:
```

### Nginx Config for Media

```nginx
server {
    # ... existing config ...

    # Serve media files
    location /media/ {
        alias /app/media/;
        expires 30d;
        add_header Cache-Control "public, immutable";

        # Security: Prevent script execution
        location ~* \.(php|py|pl|sh|cgi)$ {
            deny all;
        }
    }

    # Serve static files
    location /static/ {
        alias /app/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 🚀 Implementation Checklist

### Immediate (Before UI Work)

- [ ] Create `backend/media/` directory structure
- [ ] Add `.gitkeep` files
- [ ] Update `.gitignore`
- [ ] Test logo upload via API/admin

### Before Production

- [ ] Add file validators
- [ ] Configure Dokploy/nginx for media serving
- [ ] Add Docker volume for persistence
- [ ] Test uploads work in production

### Nice to Have (Later)

- [ ] Image resizing/thumbnails
- [ ] User avatars
- [ ] S3/Object storage migration
- [ ] Upload progress indicator

---

## 🔗 Related Files

| File                                    | What to Update                      |
| --------------------------------------- | ----------------------------------- |
| `backend/config/settings.py`            | Already has MEDIA_URL/MEDIA_ROOT ✅ |
| `backend/config/urls.py`                | Already serves media in DEBUG ✅    |
| `backend/tickets/models.py`             | Add validators to existing fields   |
| `backend/tickets/serializers.py`        | Add logo_url, logo_thumbnail_url    |
| `backend/Dockerfile`                    | Create media dirs, set permissions  |
| `docs/deployment/DOKPLOY_DEPLOYMENT.md` | Add nginx media config              |
