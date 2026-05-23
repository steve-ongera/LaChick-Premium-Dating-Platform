from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'feed/posts', views.PostViewSet, basename='posts')

urlpatterns = [
    # ── Auth ───────────────────────────────────────────
    path('auth/register/', views.RegisterView.as_view(), name='register'),

    # ── Profiles ───────────────────────────────────────
    path('profiles/',               views.ProfileListView.as_view(),      name='profile-list'),
    path('profiles/me/',            views.MyProfileView.as_view(),         name='my-profile'),
    path('profiles/me/photos/',     views.ProfilePhotoUploadView.as_view(), name='photo-upload'),
    path('profiles/me/photos/<int:pk>/', views.ProfilePhotoDeleteView.as_view(), name='photo-delete'),
    path('profiles/<slug:slug>/',   views.ProfileDetailView.as_view(),    name='profile-detail'),
    path('profiles/<slug:slug>/like/', views.like_profile,                name='like-profile'),

    # ── Packages & Payments ────────────────────────────
    path('packages/',              views.PackageListView.as_view(),  name='package-list'),
    path('packages/subscribe/',    views.subscribe,                  name='subscribe'),
    path('mpesa/callback/',        views.mpesa_callback,             name='mpesa-callback'),
    path('boost/',                 views.boost_profile,              name='boost'),
    path('payments/',              views.my_payments,                name='my-payments'),

    # ── Chat ───────────────────────────────────────────
    path('chat/rooms/',            views.ChatRoomListView.as_view(), name='chat-rooms'),
    path('chat/start/',            views.start_chat,                 name='start-chat'),
    path('chat/rooms/<uuid:room_id>/messages/', views.MessageListView.as_view(), name='messages'),

    # ── Notifications ──────────────────────────────────
    path('notifications/',         views.NotificationListView.as_view(),  name='notifications'),
    path('notifications/read-all/', views.mark_notifications_read,        name='notif-read-all'),

    # ── Dashboard ──────────────────────────────────────
    path('dashboard/',             views.my_dashboard,               name='dashboard'),

    # ── Feed router ────────────────────────────────────
    path('', include(router.urls)),
]