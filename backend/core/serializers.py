from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from .models import (
    Profile, ProfilePhoto, Package, MpesaPayment,
    ChatRoom, Message, Post, ProfileLike, ProfileBoost, Notification
)

User = get_user_model()


# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, label='Confirm password')

    class Meta:
        model  = User
        fields = ['id', 'email', 'username', 'gender', 'phone', 'password', 'password2']
        read_only_fields = ['id']

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        # Auto-create blank profile
        Profile.objects.create(user=user, display_name=user.username)
        return user


class UserMiniSerializer(serializers.ModelSerializer):
    """Minimal user info embedded in other serializers."""
    avatar = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['id', 'username', 'gender', 'avatar']

    def get_avatar(self, obj):
        try:
            request = self.context.get('request')
            if obj.profile.avatar and request:
                return request.build_absolute_uri(obj.profile.avatar.url)
        except Profile.DoesNotExist:
            pass
        return None


# ─────────────────────────────────────────────
# PROFILE
# ─────────────────────────────────────────────

class ProfilePhotoSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model  = ProfilePhoto
        fields = ['id', 'image', 'image_url', 'caption', 'is_primary', 'created_at']
        read_only_fields = ['id', 'image_url', 'created_at']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class ProfileSerializer(serializers.ModelSerializer):
    """Full profile — used for edit profile (authenticated user)."""
    user    = UserMiniSerializer(read_only=True)
    photos  = ProfilePhotoSerializer(many=True, read_only=True)
    avatar_url = serializers.SerializerMethodField()
    is_active  = serializers.SerializerMethodField()
    can_send_messages = serializers.SerializerMethodField()
    can_share_photos  = serializers.SerializerMethodField()
    can_post          = serializers.SerializerMethodField()

    class Meta:
        model  = Profile
        fields = [
            'id', 'user', 'slug', 'display_name', 'bio', 'age', 'city', 'country',
            'occupation', 'education', 'height_cm', 'interests', 'looking_for',
            'avatar', 'avatar_url', 'photos',
            'package_tier', 'package_expires_at', 'is_boosted', 'boost_expires_at',
            'profile_views', 'likes_count',
            'is_active', 'can_send_messages', 'can_share_photos', 'can_post',
            'meta_title', 'meta_description',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'slug', 'user', 'package_tier', 'package_expires_at',
            'is_boosted', 'boost_expires_at', 'profile_views', 'likes_count',
            'meta_title', 'meta_description', 'created_at', 'updated_at',
        ]

    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None

    def get_is_active(self, obj):
        return obj.is_package_active

    def get_can_send_messages(self, obj):
        return obj.can_send_messages

    def get_can_share_photos(self, obj):
        return obj.can_share_photos

    def get_can_post(self, obj):
        return obj.can_post


class ProfileListSerializer(serializers.ModelSerializer):
    """Lightweight profile card for browse/search grid."""
    avatar_url    = serializers.SerializerMethodField()
    package_tier  = serializers.CharField()
    is_boosted    = serializers.BooleanField()

    class Meta:
        model  = Profile
        fields = [
            'id', 'slug', 'display_name', 'age', 'city', 'country',
            'occupation', 'interests', 'avatar_url',
            'package_tier', 'is_boosted', 'likes_count', 'profile_views',
        ]

    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None


# ─────────────────────────────────────────────
# PACKAGES
# ─────────────────────────────────────────────

class PackageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Package
        fields = [
            'id', 'name', 'tier', 'price_kes',
            'duration_days', 'description', 'features',
        ]


# ─────────────────────────────────────────────
# M-PESA
# ─────────────────────────────────────────────

class MpesaInitiateSerializer(serializers.Serializer):
    """Payload to kick off STK Push."""
    package_id = serializers.IntegerField()
    phone      = serializers.CharField(max_length=15)

    def validate_phone(self, value):
        # Normalise 07XX → 2547XX
        phone = value.strip().replace(' ', '').replace('+', '')
        if phone.startswith('07') or phone.startswith('01'):
            phone = '254' + phone[1:]
        if not phone.startswith('254') or len(phone) != 12:
            raise serializers.ValidationError(
                'Enter a valid Kenyan phone number (e.g. 0712345678).'
            )
        return phone


class MpesaPaymentSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source='package.name', read_only=True)

    class Meta:
        model  = MpesaPayment
        fields = [
            'id', 'phone', 'amount', 'status',
            'package_name', 'mpesa_receipt_number',
            'created_at',
        ]
        read_only_fields = fields


class BoostInitiateSerializer(serializers.Serializer):
    """Payload to buy a 24-hour profile boost."""
    phone = serializers.CharField(max_length=15)

    def validate_phone(self, value):
        phone = value.strip().replace(' ', '').replace('+', '')
        if phone.startswith('07') or phone.startswith('01'):
            phone = '254' + phone[1:]
        if not phone.startswith('254') or len(phone) != 12:
            raise serializers.ValidationError('Enter a valid Kenyan phone number.')
        return phone


# ─────────────────────────────────────────────
# CHAT
# ─────────────────────────────────────────────

class MessageSerializer(serializers.ModelSerializer):
    sender = UserMiniSerializer(read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model  = Message
        fields = [
            'id', 'room', 'sender', 'body', 'image', 'image_url',
            'message_type', 'is_read', 'created_at',
        ]
        read_only_fields = ['id', 'room', 'sender', 'is_read', 'created_at']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def validate(self, data):
        request = self.context['request']
        profile = request.user.profile
        # Image sharing requires monthly/gold
        if data.get('image') and not profile.can_share_photos:
            raise serializers.ValidationError(
                {'image': 'Upgrade to Monthly or Gold to share photos in chat.'}
            )
        return data


class ChatRoomSerializer(serializers.ModelSerializer):
    man   = UserMiniSerializer(read_only=True)
    woman = UserMiniSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model  = ChatRoom
        fields = [
            'id', 'man', 'woman', 'last_message_at',
            'last_message', 'unread_count',
        ]

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if msg:
            return {'body': msg.body, 'message_type': msg.message_type}
        return None

    def get_unread_count(self, obj):
        user = self.context['request'].user
        return obj.messages.filter(is_read=False).exclude(sender=user).count()


# ─────────────────────────────────────────────
# FEED / POSTS
# ─────────────────────────────────────────────

class PostSerializer(serializers.ModelSerializer):
    author      = UserMiniSerializer(read_only=True)
    image_url   = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked    = serializers.SerializerMethodField()

    class Meta:
        model  = Post
        fields = [
            'id', 'author', 'caption', 'image', 'image_url',
            'likes_count', 'is_liked', 'created_at',
        ]
        read_only_fields = ['id', 'author', 'image_url', 'likes_count', 'is_liked', 'created_at']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(id=request.user.id).exists()
        return False

    def validate(self, data):
        request = self.context['request']
        if not request.user.profile.can_post:
            raise serializers.ValidationError(
                'Upgrade to Gold to post on the feed.'
            )
        return data


# ─────────────────────────────────────────────
# LIKES
# ─────────────────────────────────────────────

class ProfileLikeSerializer(serializers.ModelSerializer):
    from_user = UserMiniSerializer(read_only=True)

    class Meta:
        model  = ProfileLike
        fields = ['id', 'from_user', 'to_profile', 'is_super', 'created_at']
        read_only_fields = ['id', 'from_user', 'created_at']


# ─────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Notification
        fields = ['id', 'notif_type', 'message', 'is_read', 'created_at']
        read_only_fields = fields