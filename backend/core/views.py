from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Q
from datetime import timedelta

from rest_framework import generics, viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import (
    User, Profile, ProfilePhoto, Package, MpesaPayment,
    ChatRoom, Message, Post, ProfileLike, ProfileBoost, Notification,
    PackageTier, PaymentStatus, Gender
)
from .serializers import (
    RegisterSerializer, ProfileSerializer, ProfileListSerializer,
    ProfilePhotoSerializer, PackageSerializer,
    MpesaInitiateSerializer, MpesaPaymentSerializer, BoostInitiateSerializer,
    ChatRoomSerializer, MessageSerializer,
    PostSerializer, ProfileLikeSerializer, NotificationSerializer
)
from .mpesa import initiate_stk_push

import logging
logger = logging.getLogger(__name__)

BOOST_PRICE_KES = 50
SUPER_LIKE_PRICE_KES = 20


# ─────────────────────────────────────────────
# PERMISSIONS
# ─────────────────────────────────────────────

class IsPaidMale(permissions.BasePermission):
    """Only active-subscription men can do certain actions."""
    message = 'This action requires an active subscription.'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.is_male
            and request.user.profile.is_package_active
            and request.user.profile.package_tier != PackageTier.FREE
        )


class IsGoldMale(permissions.BasePermission):
    message = 'Gold package required.'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.is_male
            and request.user.profile.package_tier == PackageTier.GOLD
            and request.user.profile.is_package_active
        )


# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/"""
    queryset   = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


# ─────────────────────────────────────────────
# PROFILES
# ─────────────────────────────────────────────

class ProfileListView(generics.ListAPIView):
    """
    GET /api/profiles/
    Browse male profiles (women + admins).
    Supports filters: city, interests, age_min, age_max, q (search).
    Ordering: boosted first → gold → monthly → weekly → basic.
    """
    serializer_class   = ProfileListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Profile.objects.filter(
            user__gender=Gender.MALE
        ).exclude(
            package_tier=PackageTier.FREE
        ).select_related('user')

        # Filters
        city = self.request.query_params.get('city')
        if city:
            qs = qs.filter(city__icontains=city)

        age_min = self.request.query_params.get('age_min')
        age_max = self.request.query_params.get('age_max')
        if age_min:
            qs = qs.filter(age__gte=int(age_min))
        if age_max:
            qs = qs.filter(age__lte=int(age_max))

        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(
                Q(display_name__icontains=q) |
                Q(bio__icontains=q) |
                Q(occupation__icontains=q) |
                Q(interests__icontains=q)
            )

        return qs.order_by('-is_boosted', '-package_tier', '-likes_count')


class ProfileDetailView(generics.RetrieveAPIView):
    """
    GET /api/profiles/{slug}/
    Public profile page — SEO-friendly, no auth required.
    Increments profile_views.
    """
    serializer_class   = ProfileSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        return Profile.objects.select_related('user').prefetch_related('photos')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment view count (skip own views)
        if not request.user.is_authenticated or request.user != instance.user:
            Profile.objects.filter(pk=instance.pk).update(
                profile_views=instance.profile_views + 1
            )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class MyProfileView(generics.RetrieveUpdateAPIView):
    """
    GET/PUT/PATCH /api/profiles/me/
    Authenticated user edits their own profile.
    """
    serializer_class   = ProfileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user.profile


class ProfilePhotoUploadView(generics.CreateAPIView):
    """
    POST /api/profiles/me/photos/
    Upload additional gallery photos (requires active paid package for men).
    """
    serializer_class   = ProfilePhotoSerializer
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        serializer.save(profile=self.request.user.profile)


class ProfilePhotoDeleteView(generics.DestroyAPIView):
    """DELETE /api/profiles/me/photos/{id}/"""
    serializer_class   = ProfilePhotoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ProfilePhoto.objects.filter(profile=self.request.user.profile)


# ─────────────────────────────────────────────
# PACKAGES
# ─────────────────────────────────────────────

class PackageListView(generics.ListAPIView):
    """GET /api/packages/ — list all active packages."""
    serializer_class   = PackageSerializer
    permission_classes = [AllowAny]
    queryset           = Package.objects.filter(is_active=True)


# ─────────────────────────────────────────────
# M-PESA PAYMENTS
# ─────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def subscribe(request):
    """
    POST /api/packages/subscribe/
    Initiate M-Pesa STK Push for a subscription package.
    """
    serializer = MpesaInitiateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    package_id = serializer.validated_data['package_id']
    phone      = serializer.validated_data['phone']

    package = get_object_or_404(Package, id=package_id, is_active=True)

    # Create a pending payment record
    payment = MpesaPayment.objects.create(
        user    = request.user,
        package = package,
        phone   = phone,
        amount  = package.price_kes,
        status  = PaymentStatus.PENDING,
    )

    # Initiate Daraja STK Push
    result = initiate_stk_push(
        phone      = phone,
        amount     = int(package.price_kes),
        account_ref= f'LACHICK-{payment.id}',
        description= f'LaChick {package.name}',
    )

    if result.get('ResponseCode') == '0':
        payment.merchant_request_id  = result.get('MerchantRequestID', '')
        payment.checkout_request_id  = result.get('CheckoutRequestID', '')
        payment.save()
        return Response({
            'message': 'STK Push sent. Check your phone.',
            'payment_id': str(payment.id),
            'checkout_request_id': payment.checkout_request_id,
        }, status=status.HTTP_201_CREATED)
    else:
        payment.status = PaymentStatus.FAILED
        payment.result_desc = result.get('errorMessage', 'Unknown error')
        payment.save()
        return Response(
            {'error': 'Failed to initiate payment. Try again.'},
            status=status.HTTP_502_BAD_GATEWAY
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def mpesa_callback(request):
    """
    POST /api/mpesa/callback/
    Daraja sends payment confirmation here. No auth (Daraja calls this).
    """
    try:
        body         = request.data.get('Body', {})
        stk_callback = body.get('stkCallback', {})
        result_code  = stk_callback.get('ResultCode')
        result_desc  = stk_callback.get('ResultDesc', '')
        checkout_id  = stk_callback.get('CheckoutRequestID', '')

        payment = MpesaPayment.objects.get(checkout_request_id=checkout_id)

        if result_code == 0:  # Success
            metadata = stk_callback.get('CallbackMetadata', {}).get('Item', [])
            receipt  = next((i['Value'] for i in metadata if i['Name'] == 'MpesaReceiptNumber'), '')

            payment.status               = PaymentStatus.COMPLETED
            payment.mpesa_receipt_number = receipt
            payment.result_code          = result_code
            payment.result_desc          = result_desc
            payment.save()

            # Activate subscription on the profile
            if not payment.is_boost:
                _activate_subscription(payment)
            else:
                _activate_boost(payment)

        else:
            payment.status      = PaymentStatus.FAILED
            payment.result_code = result_code
            payment.result_desc = result_desc
            payment.save()

    except MpesaPayment.DoesNotExist:
        logger.error(f"M-Pesa callback: unknown checkout_id {checkout_id}")
    except Exception as e:
        logger.exception(f"M-Pesa callback error: {e}")

    return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})


def _activate_subscription(payment: MpesaPayment):
    """Upgrade profile tier after successful payment."""
    profile = payment.user.profile
    pkg     = payment.package
    now     = timezone.now()

    # Extend from now or from current expiry (whichever is later)
    base = max(now, profile.package_expires_at or now)

    profile.package_tier       = pkg.tier
    profile.package_expires_at = base + timedelta(days=pkg.duration_days)
    profile.save()

    Notification.objects.create(
        user       = payment.user,
        notif_type = Notification.NotifType.PAYMENT_OK,
        message    = f'Your {pkg.name} package is now active! Enjoy LaChick. 🎉',
    )


def _activate_boost(payment: MpesaPayment):
    """Activate a 24-hour profile boost."""
    from .models import ProfileBoost
    now = timezone.now()
    expires = now + timedelta(hours=24)

    ProfileBoost.objects.create(
        user       = payment.user,
        payment    = payment,
        expires_at = expires,
    )
    profile = payment.user.profile
    profile.is_boosted       = True
    profile.boost_expires_at = expires
    profile.save()

    Notification.objects.create(
        user       = payment.user,
        notif_type = Notification.NotifType.PAYMENT_OK,
        message    = 'Your profile is now boosted for 24 hours! 🚀',
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def boost_profile(request):
    """POST /api/boost/ — buy a 24-hour visibility boost (KES 50)."""
    serializer = BoostInitiateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    phone = serializer.validated_data['phone']

    payment = MpesaPayment.objects.create(
        user     = request.user,
        phone    = phone,
        amount   = BOOST_PRICE_KES,
        status   = PaymentStatus.PENDING,
        is_boost = True,
    )

    result = initiate_stk_push(
        phone      = phone,
        amount     = BOOST_PRICE_KES,
        account_ref= f'BOOST-{payment.id}',
        description= 'LaChick Profile Boost',
    )

    if result.get('ResponseCode') == '0':
        payment.merchant_request_id = result.get('MerchantRequestID', '')
        payment.checkout_request_id = result.get('CheckoutRequestID', '')
        payment.save()
        return Response({'message': 'Boost payment initiated. Check your phone.'})

    payment.status = PaymentStatus.FAILED
    payment.save()
    return Response({'error': 'Payment failed.'}, status=status.HTTP_502_BAD_GATEWAY)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_payments(request):
    """GET /api/payments/ — current user's payment history."""
    payments = MpesaPayment.objects.filter(user=request.user)
    serializer = MpesaPaymentSerializer(payments, many=True)
    return Response(serializer.data)


# ─────────────────────────────────────────────
# CHAT
# ─────────────────────────────────────────────

class ChatRoomListView(generics.ListAPIView):
    """GET /api/chat/rooms/ — list rooms for current user."""
    serializer_class   = ChatRoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return ChatRoom.objects.filter(
            Q(man=user) | Q(woman=user)
        ).select_related('man', 'woman').prefetch_related('messages')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_chat(request):
    """
    POST /api/chat/start/
    Women initiate chat with a man (man must have active paid package).
    Body: { "man_id": "<uuid>" }
    """
    if request.user.is_male:
        return Response(
            {'error': 'Men cannot start chats. Women initiate.'},
            status=status.HTTP_403_FORBIDDEN
        )

    man_id = request.data.get('man_id')
    if not man_id:
        return Response({'error': 'man_id required.'}, status=status.HTTP_400_BAD_REQUEST)

    man = get_object_or_404(User, id=man_id, gender=Gender.MALE)

    if not man.profile.is_visible:
        return Response(
            {'error': 'This man does not have an active subscription.'},
            status=status.HTTP_403_FORBIDDEN
        )

    room, created = ChatRoom.objects.get_or_create(
        man=man, woman=request.user
    )
    serializer = ChatRoomSerializer(room, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class MessageListView(generics.ListCreateAPIView):
    """
    GET  /api/chat/rooms/{room_id}/messages/ — message history
    POST /api/chat/rooms/{room_id}/messages/ — send a message
    """
    serializer_class   = MessageSerializer
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def get_room(self):
        room_id = self.kwargs['room_id']
        user    = self.request.user
        return get_object_or_404(
            ChatRoom,
            id=room_id
        )

    def get_queryset(self):
        room = self.get_room()
        # Mark messages as read
        room.messages.filter(is_read=False).exclude(sender=self.request.user).update(is_read=True)
        return room.messages.select_related('sender')

    def perform_create(self, serializer):
        room   = self.get_room()
        sender = self.request.user

        # Only paid men can send messages
        if sender.is_male and not sender.profile.can_send_messages:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Upgrade to Weekly, Monthly, or Gold to send messages.')

        message = serializer.save(room=room, sender=sender)

        # Update room's last_message_at
        ChatRoom.objects.filter(pk=room.pk).update(last_message_at=timezone.now())

        # Notify the other party
        recipient = room.woman if sender.is_male else room.man
        Notification.objects.create(
            user       = recipient,
            notif_type = Notification.NotifType.MESSAGE,
            message    = f'{sender.username} sent you a message.',
        )


# ─────────────────────────────────────────────
# FEED / POSTS
# ─────────────────────────────────────────────

class PostViewSet(viewsets.ModelViewSet):
    """
    GET    /api/feed/posts/      — browse feed
    POST   /api/feed/posts/      — create post (Gold only)
    DELETE /api/feed/posts/{id}/ — delete own post
    POST   /api/feed/posts/{id}/like/ — toggle like
    """
    serializer_class = PostSerializer
    parser_classes   = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return Post.objects.select_related('author').prefetch_related('likes')

    def perform_create(self, serializer):
        if not self.request.user.profile.can_post:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Gold package required to post.')
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        post = self.get_object()
        if post.likes.filter(id=request.user.id).exists():
            post.likes.remove(request.user)
            return Response({'liked': False})
        post.likes.add(request.user)
        return Response({'liked': True})


# ─────────────────────────────────────────────
# LIKES
# ─────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def like_profile(request, slug):
    """POST /api/profiles/{slug}/like/ — woman likes a man's profile."""
    if request.user.is_male:
        return Response({'error': 'Only women can like profiles.'}, status=403)

    profile = get_object_or_404(Profile, slug=slug)
    is_super = request.data.get('super', False)

    like, created = ProfileLike.objects.get_or_create(
        from_user=request.user,
        to_profile=profile,
        defaults={'is_super': is_super}
    )

    if not created:
        like.delete()
        Profile.objects.filter(pk=profile.pk).update(likes_count=profile.likes_count - 1)
        return Response({'liked': False})

    Profile.objects.filter(pk=profile.pk).update(likes_count=profile.likes_count + 1)

    # Notify the man
    Notification.objects.create(
        user       = profile.user,
        notif_type = Notification.NotifType.SUPER_LIKE if is_super else Notification.NotifType.LIKE,
        message    = f'{"💛 Super Like" if is_super else "❤️ Like"} from {request.user.username}!',
    )

    return Response({'liked': True, 'super': is_super})


# ─────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────

class NotificationListView(generics.ListAPIView):
    """GET /api/notifications/ — current user's notifications."""
    serializer_class   = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notifications_read(request):
    """POST /api/notifications/read-all/"""
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'marked_read': True})


# ─────────────────────────────────────────────
# DASHBOARD (owner analytics)
# ─────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_dashboard(request):
    """GET /api/dashboard/ — stats for the authenticated user's profile."""
    profile = request.user.profile
    last_30 = timezone.now() - timedelta(days=30)

    data = {
        'profile_views'   : profile.profile_views,
        'likes_count'     : profile.likes_count,
        'package_tier'    : profile.package_tier,
        'package_expires' : profile.package_expires_at,
        'is_boosted'      : profile.is_boosted,
        'boost_expires'   : profile.boost_expires_at,
        'messages_sent'   : Message.objects.filter(
            sender=request.user, created_at__gte=last_30
        ).count(),
        'unread_messages' : Message.objects.filter(
            room__man=request.user if request.user.is_male else None,
            is_read=False,
        ).exclude(sender=request.user).count(),
        'total_payments'  : MpesaPayment.objects.filter(
            user=request.user, status=PaymentStatus.COMPLETED
        ).count(),
    }
    return Response(data)