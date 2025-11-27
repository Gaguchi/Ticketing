"""
Image processing utilities for resizing and thumbnail generation.
"""

from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
import os


def resize_image(image_file, max_size=(400, 400), quality=85):
    """
    Resize image to fit within max_size while maintaining aspect ratio.
    
    Args:
        image_file: Django file object or file-like object
        max_size: Tuple of (max_width, max_height)
        quality: JPEG quality (1-100)
    
    Returns:
        ContentFile with resized image
    """
    image_file.seek(0)
    img = Image.open(image_file)
    
    # Get original format
    original_format = img.format or 'JPEG'
    
    # Convert RGBA/P to RGB for JPEG output
    if img.mode in ('RGBA', 'P'):
        # Create white background for transparency
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[3] if len(img.split()) == 4 else None)
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Resize maintaining aspect ratio
    img.thumbnail(max_size, Image.Resampling.LANCZOS)
    
    # Save to buffer
    buffer = BytesIO()
    img.save(buffer, format='JPEG', quality=quality, optimize=True)
    buffer.seek(0)
    
    return ContentFile(buffer.read())


def create_thumbnail(image_file, size=(64, 64), quality=85):
    """
    Create a square thumbnail from center of image.
    
    Args:
        image_file: Django file object or file-like object
        size: Tuple of (width, height) for thumbnail
        quality: JPEG quality (1-100)
    
    Returns:
        ContentFile with thumbnail image
    """
    image_file.seek(0)
    img = Image.open(image_file)
    
    # Convert to RGB
    if img.mode in ('RGBA', 'P'):
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[3] if len(img.split()) == 4 else None)
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Create square crop from center
    width, height = img.size
    min_dim = min(width, height)
    left = (width - min_dim) // 2
    top = (height - min_dim) // 2
    img = img.crop((left, top, left + min_dim, top + min_dim))
    
    # Resize to target size
    img = img.resize(size, Image.Resampling.LANCZOS)
    
    # Save to buffer
    buffer = BytesIO()
    img.save(buffer, format='JPEG', quality=quality, optimize=True)
    buffer.seek(0)
    
    return ContentFile(buffer.read())


def get_image_dimensions(image_file):
    """
    Get dimensions of an image file.
    
    Returns:
        Tuple of (width, height)
    """
    try:
        image_file.seek(0)
        img = Image.open(image_file)
        image_file.seek(0)
        return img.size
    except Exception:
        return (0, 0)
