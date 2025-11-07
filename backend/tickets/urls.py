from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    TicketViewSet, ColumnViewSet, ProjectViewSet, CommentViewSet, AttachmentViewSet,
    TagViewSet, ContactViewSet, TagContactViewSet, UserTagViewSet, TicketTagViewSet,
    IssueLinkViewSet, CompanyViewSet, UserManagementViewSet, TicketSubtaskViewSet,
    NotificationViewSet,
    register_user, login_user, get_current_user
)

router = DefaultRouter()
router.register(r'companies', CompanyViewSet, basename='company')
router.register(r'users', UserManagementViewSet, basename='user')
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'columns', ColumnViewSet, basename='column')
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'attachments', AttachmentViewSet, basename='attachment')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'contacts', ContactViewSet, basename='contact')
router.register(r'tag-contacts', TagContactViewSet, basename='tag-contact')
router.register(r'user-tags', UserTagViewSet, basename='user-tag')
router.register(r'ticket-tags', TicketTagViewSet, basename='ticket-tag')
router.register(r'issue-links', IssueLinkViewSet, basename='issue-link')
router.register(r'subtasks', TicketSubtaskViewSet, basename='subtask')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', register_user, name='register'),
    path('auth/login/', login_user, name='login'),
    path('auth/me/', get_current_user, name='current-user'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Nested ticket comments route
    path('tickets/<int:ticket_id>/comments/', CommentViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='ticket-comments-list'),
    path('tickets/<int:ticket_id>/comments/<int:pk>/', CommentViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='ticket-comments-detail'),
    
    # Router URLs
    path('', include(router.urls)),
]
