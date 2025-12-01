"""
File upload validators for images and attachments.
"""

from django.core.exceptions import ValidationError
from PIL import Image

# Image settings
ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB

# General file settings
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_FILE_TYPES = [
    # Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    # Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    # Text
    'text/plain',
    'text/csv',
    # Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
]


def validate_image(file):
    """
    Validate image file type, size, and integrity.
    Use this for ImageField validators.
    """
    # Check file size
    if file.size > MAX_IMAGE_SIZE:
        max_mb = MAX_IMAGE_SIZE // 1024 // 1024
        raise ValidationError(f'Image too large. Maximum size is {max_mb}MB.')
    
    # Check content type
    content_type = getattr(file, 'content_type', None)
    if content_type and content_type not in ALLOWED_IMAGE_TYPES:
        raise ValidationError(
            f'Invalid image type "{content_type}". '
            f'Allowed types: JPEG, PNG, GIF, WebP.'
        )
    
    # Verify it's actually a valid image
    try:
        # Save current position
        file.seek(0)
        img = Image.open(file)
        img.verify()
        # Reset file position for Django to read
        file.seek(0)
    except Exception:
        raise ValidationError('Invalid or corrupted image file.')
    
    return file


def validate_file(file):
    """
    Validate general file uploads (attachments).
    Use this for FileField validators.
    """
    # Check file size
    if file.size > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // 1024 // 1024
        raise ValidationError(f'File too large. Maximum size is {max_mb}MB.')
    
    # Check content type
    content_type = getattr(file, 'content_type', None)
    if content_type and content_type not in ALLOWED_FILE_TYPES:
        raise ValidationError(
            f'File type "{content_type}" is not allowed. '
            f'Allowed: images, PDF, Office documents, text files, archives.'
        )
    
    return file


def validate_logo(file):
    """
    Validate company logo with additional constraints.
    - Must be an image
    - Max 5MB
    - Recommended: square aspect ratio
    """
    # First run standard image validation
    validate_image(file)
    
    # Additional logo-specific checks
    try:
        file.seek(0)
        img = Image.open(file)
        width, height = img.size
        
        # Warn if not square-ish (but don't reject)
        # Just validate that it's not extremely skewed
        aspect_ratio = width / height if height > 0 else 0
        if aspect_ratio < 0.5 or aspect_ratio > 2:
            # Very wide or very tall - probably not a good logo
            pass  # Could log a warning here
        
        # Reset file position
        file.seek(0)
    except Exception:
        raise ValidationError('Could not process image file.')
    
    return file
