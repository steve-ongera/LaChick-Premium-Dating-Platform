from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import (
    User, Profile, ProfilePhoto, Package, MpesaPayment,
    ChatRoom, Message, Post, ProfileLike, ProfileBoost, Notification
)


# ─── User ──────────────────────────────────────────────────────

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ['email', 'username', 'gender', 'is_verified', 'is_active', 'date_joined']
    list_filter   = ['gender', 'is_verified', 'is_active', 'is_staff']
    search_fields = ['email', 'username', 'phone']
    ordering      = ['-date_joined']

    fieldsets = BaseUserAdmin.fieldsets + (
        ('LaChick Fields', {'fields': ('gender', 'phone', 'is_verified')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('LaChick Fields', {'fields': ('email', 'gender', 'phone')}),
    )


# ─── Profile ───────────────────────────────────────────────────

class ProfilePhotoInline(admin.TabularInline):
    model  = ProfilePhoto
    extra  = 0
    fields = ['image', 'caption', 'is_primary']


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display  = ['display_name', 'user_email', 'gender_display', 'city', 'package_tier', 'is_boosted', 'profile_views', 'likes_count']
    list_filter   = ['package_tier', 'is_boosted', 'user__gender']
    search_fields = ['display_name', 'user__email', 'city', 'occupation']
    readonly_fields = ['profile_views', 'likes_count', 'slug', 'created_at', 'updated_at']
    inlines       = [ProfilePhotoInline]

    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'slug', 'display_name', 'bio', 'age', 'city', 'country', 'avatar')
        }),
        ('Professional', {
            'fields': ('occupation', 'education', 'height_cm', 'interests', 'looking_for')
        }),
        ('Package & Visibility', {
            'fields': ('package_tier', 'package_expires_at', 'is_boosted', 'boost_expires_at')
        }),
        ('Stats', {
            'fields': ('profile_views', 'likes_count')
        }),
        ('SEO', {
            'fields': ('meta_title', 'meta_description'),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Email'

    def gender_display(self, obj):
        return obj.user.gender
    gender_display.short_description = 'Gender'

    actions = ['make_gold', 'remove_boost']

    @admin.action(description='Set selected profiles to Gold (30 days)')
    def make_gold(self, request, queryset):
        from django.utils import timezone
        from datetime import timedelta
        from .models import PackageTier
        queryset.update(
            package_tier=PackageTier.GOLD,
            package_expires_at=timezone.now() + timedelta(days=30)
        )
        self.message_user(request, f'{queryset.count()} profiles upgraded to Gold.')

    @admin.action(description='Remove boost from selected profiles')
    def remove_boost(self, request, queryset):
        queryset.update(is_boosted=False, boost_expires_at=None)
        self.message_user(request, f'Boost removed from {queryset.count()} profiles.')


# ─── Packages ──────────────────────────────────────────────────

@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display  = ['name', 'tier', 'price_kes', 'duration_days', 'is_active']
    list_editable = ['price_kes', 'is_active']
    ordering      = ['price_kes']


# ─── Payments ──────────────────────────────────────────────────

@admin.register(MpesaPayment)
class MpesaPaymentAdmin(admin.ModelAdmin):
    list_display  = ['user_email', 'package', 'amount', 'phone', 'status', 'mpesa_receipt_number', 'is_boost', 'created_at']
    list_filter   = ['status', 'is_boost']
    search_fields = ['user__email', 'phone', 'mpesa_receipt_number', 'checkout_request_id']
    readonly_fields = ['id', 'merchant_request_id', 'checkout_request_id', 'mpesa_receipt_number', 'result_code', 'result_desc', 'created_at', 'updated_at']
    ordering      = ['-created_at']

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'

    # Revenue summary at top of changelist
    def changelist_view(self, request, extra_context=None):
        from django.db.models import Sum
        from .models import PaymentStatus
        extra_context = extra_context or {}
        qs = MpesaPayment.objects.filter(status=PaymentStatus.COMPLETED)
        extra_context['total_revenue'] = qs.aggregate(total=Sum('amount'))['total'] or 0
        extra_context['total_transactions'] = qs.count()
        return super().changelist_view(request, extra_context=extra_context)


# ─── Chat ──────────────────────────────────────────────────────

@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display  = ['man_username', 'woman_username', 'last_message_at', 'message_count']
    search_fields = ['man__username', 'woman__username']
    readonly_fields = ['id', 'last_message_at']

    def man_username(self, obj): return obj.man.username
    man_username.short_description = 'Man'

    def woman_username(self, obj): return obj.woman.username
    woman_username.short_description = 'Woman'

    def message_count(self, obj): return obj.messages.count()
    message_count.short_description = 'Messages'


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display  = ['room', 'sender', 'message_type', 'body_preview', 'is_read', 'created_at']
    list_filter   = ['message_type', 'is_read']
    search_fields = ['sender__username', 'body']

    def body_preview(self, obj):
        return (obj.body[:60] + '…') if len(obj.body) > 60 else obj.body
    body_preview.short_description = 'Message'


# ─── Feed / Posts ──────────────────────────────────────────────

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display  = ['author', 'caption_preview', 'likes_count', 'created_at']
    search_fields = ['author__username', 'caption']

    def caption_preview(self, obj):
        return (obj.caption[:80] + '…') if len(obj.caption) > 80 else obj.caption
    caption_preview.short_description = 'Caption'

    def likes_count(self, obj): return obj.likes.count()
    likes_count.short_description = 'Likes'


# ─── Likes ─────────────────────────────────────────────────────

@admin.register(ProfileLike)
class ProfileLikeAdmin(admin.ModelAdmin):
    list_display = ['from_user', 'to_profile', 'is_super', 'created_at']
    list_filter  = ['is_super']


# ─── Notifications ─────────────────────────────────────────────

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ['user', 'notif_type', 'message', 'is_read', 'created_at']
    list_filter   = ['notif_type', 'is_read']
    search_fields = ['user__email', 'message']
    actions       = ['mark_all_read']

    @admin.action(description='Mark selected as read')
    def mark_all_read(self, request, queryset):
        queryset.update(is_read=True)


# ─── Boost ─────────────────────────────────────────────────────

@admin.register(ProfileBoost)
class ProfileBoostAdmin(admin.ModelAdmin):
    list_display = ['user', 'starts_at', 'expires_at']
    readonly_fields = ['starts_at']


# ─── Admin Site Customisation ──────────────────────────────────

admin.site.site_header = ' LaChick Admin'
admin.site.site_title  = 'LaChick'
admin.site.index_title = 'Platform Management'