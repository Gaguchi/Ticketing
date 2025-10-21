from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TicketViewSet, ColumnViewSet, CustomerViewSet, CommentViewSet, AttachmentViewSet,
    TagViewSet, ContactViewSet, TagContactViewSet, UserTagViewSet, TicketTagViewSet
)

router = DefaultRouter()
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'columns', ColumnViewSet, basename='column')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'attachments', AttachmentViewSet, basename='attachment')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'contacts', ContactViewSet, basename='contact')
router.register(r'tag-contacts', TagContactViewSet, basename='tag-contact')
router.register(r'user-tags', UserTagViewSet, basename='user-tag')
router.register(r'ticket-tags', TicketTagViewSet, basename='ticket-tag')

urlpatterns = [
    path('', include(router.urls)),
]
