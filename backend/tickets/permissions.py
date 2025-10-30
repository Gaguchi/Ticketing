from rest_framework import permissions
from django.db.models import Q
from .models import Company


class IsSuperuserOrCompanyAdmin(permissions.BasePermission):
    """
    Permission class that allows access to superusers or company admins.
    For company-specific operations, checks if user is admin of that company.
    """
    
    def has_permission(self, request, view):
        """Check if user is authenticated and is either superuser or company admin."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superusers have full access
        if request.user.is_superuser:
            return True
        
        # Check if user is admin of any company
        return Company.objects.filter(admins=request.user).exists()
    
    def has_object_permission(self, request, view, obj):
        """Check if user can access this specific object."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superusers have full access
        if request.user.is_superuser:
            return True
        
        # If object is a Company, check if user is admin of it
        if isinstance(obj, Company):
            return obj.admins.filter(id=request.user.id).exists()
        
        # If object has a company attribute, check if user is admin of that company
        if hasattr(obj, 'company'):
            return obj.company.admins.filter(id=request.user.id).exists()
        
        return False


class IsCompanyAdmin(permissions.BasePermission):
    """
    Permission class that checks if user is an admin of a specific company.
    Superusers are NOT automatically granted access (use IsSuperuserOrCompanyAdmin for that).
    """
    
    def has_permission(self, request, view):
        """Check if user is authenticated and is a company admin."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user is admin of any company
        return Company.objects.filter(admins=request.user).exists()
    
    def has_object_permission(self, request, view, obj):
        """Check if user is admin of this specific object's company."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # If object is a Company, check if user is admin of it
        if isinstance(obj, Company):
            return obj.admins.filter(id=request.user.id).exists()
        
        # If object has a company attribute, check if user is admin of that company
        if hasattr(obj, 'company'):
            return obj.company.admins.filter(id=request.user.id).exists()
        
        return False


class IsCompanyMember(permissions.BasePermission):
    """
    Permission class that checks if user is a member (admin or user) of a specific company.
    Superusers are NOT automatically granted access.
    """
    
    def has_permission(self, request, view):
        """Check if user is authenticated and is member of any company."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user is admin or member of any company
        return Company.objects.filter(
            Q(admins=request.user) | Q(users=request.user)
        ).exists()
    
    def has_object_permission(self, request, view, obj):
        """Check if user is member of this specific object's company."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # If object is a Company, check if user is admin or member
        if isinstance(obj, Company):
            return (obj.admins.filter(id=request.user.id).exists() or 
                    obj.users.filter(id=request.user.id).exists())
        
        # If object has a company attribute, check if user is member of that company
        if hasattr(obj, 'company'):
            return (obj.company.admins.filter(id=request.user.id).exists() or 
                    obj.company.users.filter(id=request.user.id).exists())
        
        return False


class IsSuperuserOrCompanyMember(permissions.BasePermission):
    """
    Permission class that allows access to superusers or company members (admins + users).
    Most lenient permission for company-based resources.
    """
    
    def has_permission(self, request, view):
        """Check if user is authenticated and is either superuser or company member."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superusers have full access
        if request.user.is_superuser:
            return True
        
        # Check if user is admin or member of any company
        return Company.objects.filter(
            Q(admins=request.user) | Q(users=request.user)
        ).exists()
    
    def has_object_permission(self, request, view, obj):
        """Check if user can access this specific object."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superusers have full access
        if request.user.is_superuser:
            return True
        
        # If object is a Company, check if user is admin or member
        if isinstance(obj, Company):
            return (obj.admins.filter(id=request.user.id).exists() or 
                    obj.users.filter(id=request.user.id).exists())
        
        # If object has a company attribute, check if user is member of that company
        if hasattr(obj, 'company'):
            return (obj.company.admins.filter(id=request.user.id).exists() or 
                    obj.company.users.filter(id=request.user.id).exists())
        
        return False


class IsCompanyAdminOrReadOnly(permissions.BasePermission):
    """
    Permission class that allows:
    - Superusers: Full access
    - Staff users: Can create companies and view/edit their assigned companies
    - Company admins: Full access to their companies
    - Company members: Read-only access to their companies
    """
    
    def has_permission(self, request, view):
        """Check if user is authenticated."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superusers have full access
        if request.user.is_superuser:
            return True
        
        # Staff users can create companies and view their companies
        if request.user.is_staff:
            return True
        
        # For safe methods (GET, HEAD, OPTIONS), check if user is member
        if request.method in permissions.SAFE_METHODS:
            # Allow viewing if user has any company
            return Company.objects.filter(
                Q(admins=request.user) | Q(users=request.user)
            ).exists()
        
        # For unsafe methods (POST, PUT, PATCH, DELETE), check if user is admin
        return Company.objects.filter(admins=request.user).exists()
    
    def has_object_permission(self, request, view, obj):
        """Check object-level permissions."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superusers have full access
        if request.user.is_superuser:
            return True
        
        # Determine the company from the object
        company = None
        if isinstance(obj, Company):
            company = obj
        elif hasattr(obj, 'company'):
            company = obj.company
        
        if not company:
            return False
        
        # For safe methods, check if user is member
        if request.method in permissions.SAFE_METHODS:
            return (company.admins.filter(id=request.user.id).exists() or 
                    company.users.filter(id=request.user.id).exists())
        
        # For unsafe methods, check if user is admin
        return company.admins.filter(id=request.user.id).exists()
