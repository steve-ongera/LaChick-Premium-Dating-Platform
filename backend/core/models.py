from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.utils.text import slugify
import uuid


# ─────────────────────────────────────────────
# ENUMS / CHOICES
# ─────────────────────────────────────────────

class Gender(models.TextChoices):
    MALE   = 'male',   'Male'
    FEMALE = 'female', 'Female'


class PackageTier(models.TextChoices):
    FREE    = 'free',    'Free'
    BASIC   = 'basic',   'Basic (3 Days)'
    WEEKLY  = 'weekly',  'Weekly'
    MONTHLY = 'monthly', 'Monthly'
    GOLD    = 'gold',    'Gold'


class PaymentStatus(models.TextChoices):
    PENDING   = 'pending',   'Pending'
    COMPLETED = 'completed', 'Completed'
    FAILED    = 'failed',    'Failed'
    CANCELLED = 'cancelled', 'Cancelled'


class MessageType(models.TextChoices):
    TEXT  = 'text',  'Text'
    IMAGE = 'image', 'Image'
    EMOJI = 'emoji', 'Emoji'


# ─────────────────────────────────────────────
# USER
# ─────────────────────────────────────────────

class User(AbstractUser):
    """Extended user — both men and women register here."""

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email      = models.EmailField(unique=True)
    gender     = models.CharField(max_length=10, choices=Gender.choices)
    phone      = models.CharField(max_length=15, blank=True)          # for M-Pesa
    is_verified = models.BooleanField(default=False)                  # manual/KYC check
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['username', 'gender']

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.email} ({self.gender})"

    @property
    def is_male(self):
        return self.gender == Gender.MALE

    @property
    def is_female(self):
        return self.gender == Gender.FEMALE


# ─────────────────────────────────────────────
# PROFILE
# ─────────────────────────────────────────────

class Profile(models.Model):
    """Rich profile — mainly filled by men, browsed by women."""

    user          = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    slug          = models.SlugField(unique=True, blank=True)          # SEO-friendly URL
    display_name  = models.CharField(max_length=80)
    bio           = models.TextField(max_length=1000, blank=True)
    age           = models.PositiveSmallIntegerField(null=True, blank=True)
    city          = models.CharField(max_length=100, blank=True)
    country       = models.CharField(max_length=100, default='Kenya')
    occupation    = models.CharField(max_length=120, blank=True)
    education     = models.CharField(max_length=120, blank=True)
    height_cm     = models.PositiveSmallIntegerField(null=True, blank=True)
    interests     = models.JSONField(default=list, blank=True)         # ["hiking","tech",…]
    looking_for   = models.TextField(max_length=500, blank=True)
    avatar        = models.ImageField(upload_to='avatars/', null=True, blank=True)

    # Visibility / package tier (denormalised for fast queries)
    package_tier  = models.CharField(
        max_length=10, choices=PackageTier.choices, default=PackageTier.FREE
    )
    package_expires_at = models.DateTimeField(null=True, blank=True)
    is_boosted    = models.BooleanField(default=False)
    boost_expires_at   = models.DateTimeField(null=True, blank=True)

    # Stats (SEO + UX)
    profile_views = models.PositiveIntegerField(default=0)
    likes_count   = models.PositiveIntegerField(default=0)

    # SEO meta
    meta_title       = models.CharField(max_length=160, blank=True)
    meta_description = models.TextField(max_length=320, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'profiles'
        ordering = ['-is_boosted', '-package_tier', '-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(f"{self.display_name}-{str(self.user.id)[:8]}")
        # Auto-generate SEO meta if empty
        if not self.meta_title:
            self.meta_title = f"{self.display_name}, {self.age} — {self.city} | LaChick"
        if not self.meta_description:
            self.meta_description = (self.bio[:200] + '…') if self.bio else ''
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.display_name} ({self.package_tier})"

    @property
    def is_package_active(self):
        if self.package_tier == PackageTier.FREE:
            return True
        return self.package_expires_at and self.package_expires_at > timezone.now()

    @property
    def is_visible(self):
        """Profile is searchable by women only if package is active (for men)."""
        if self.user.is_female:
            return True
        return self.package_tier != PackageTier.FREE and self.is_package_active

    @property
    def can_send_messages(self):
        return self.package_tier in (
            PackageTier.WEEKLY, PackageTier.MONTHLY, PackageTier.GOLD
        ) and self.is_package_active

    @property
    def can_share_photos(self):
        return self.package_tier in (
            PackageTier.MONTHLY, PackageTier.GOLD
        ) and self.is_package_active

    @property
    def can_post(self):
        return self.package_tier == PackageTier.GOLD and self.is_package_active


# ─────────────────────────────────────────────
# PROFILE PHOTOS
# ─────────────────────────────────────────────

class ProfilePhoto(models.Model):
    """Additional photos on a man's profile (gallery)."""

    profile    = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='photos')
    image      = models.ImageField(upload_to='profile_photos/')
    caption    = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'profile_photos'
        ordering = ['-is_primary', '-created_at']

    def __str__(self):
        return f"Photo of {self.profile.display_name}"


# ─────────────────────────────────────────────
# PACKAGES
# ─────────────────────────────────────────────

class Package(models.Model):
    """Subscription package definitions (managed via admin)."""

    name        = models.CharField(max_length=60)
    tier        = models.CharField(max_length=10, choices=PackageTier.choices, unique=True)
    price_kes   = models.DecimalField(max_digits=8, decimal_places=2)
    duration_days = models.PositiveSmallIntegerField()
    description = models.TextField(blank=True)
    features    = models.JSONField(default=list)   # list of feature strings for UI
    is_active   = models.BooleanField(default=True)

    class Meta:
        db_table = 'packages'
        ordering = ['price_kes']

    def __str__(self):
        return f"{self.name} — KES {self.price_kes}"


# ─────────────────────────────────────────────
# M-PESA PAYMENTS
# ─────────────────────────────────────────────

class MpesaPayment(models.Model):
    """Records every M-Pesa STK Push attempt."""

    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user            = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    package         = models.ForeignKey(Package, on_delete=models.SET_NULL, null=True)
    phone           = models.CharField(max_length=15)               # number charged
    amount          = models.DecimalField(max_digits=8, decimal_places=2)
    status          = models.CharField(
        max_length=10, choices=PaymentStatus.choices, default=PaymentStatus.PENDING
    )

    # Daraja API fields
    merchant_request_id = models.CharField(max_length=100, blank=True)
    checkout_request_id = models.CharField(max_length=100, blank=True, db_index=True)
    mpesa_receipt_number = models.CharField(max_length=50, blank=True)
    result_code      = models.IntegerField(null=True, blank=True)
    result_desc      = models.TextField(blank=True)

    # Boost payment flag
    is_boost         = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mpesa_payments'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} | KES {self.amount} | {self.status}"


# ─────────────────────────────────────────────
# CHAT
# ─────────────────────────────────────────────

class ChatRoom(models.Model):
    """Private 1-to-1 room between a man and a woman."""

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    man        = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='chat_rooms_as_man',
        limit_choices_to={'gender': Gender.MALE}
    )
    woman      = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='chat_rooms_as_woman',
        limit_choices_to={'gender': Gender.FEMALE}
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table   = 'chat_rooms'
        unique_together = ('man', 'woman')
        ordering   = ['-last_message_at']

    def __str__(self):
        return f"Room: {self.man.username} ↔ {self.woman.username}"


class Message(models.Model):
    """A message inside a ChatRoom."""

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room       = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender     = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    body       = models.TextField(blank=True)
    image      = models.ImageField(upload_to='chat_images/', null=True, blank=True)
    message_type = models.CharField(
        max_length=10, choices=MessageType.choices, default=MessageType.TEXT
    )
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'messages'
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.room}] {self.sender.username}: {self.body[:40]}"


# ─────────────────────────────────────────────
# FEED / POSTS
# ─────────────────────────────────────────────

class Post(models.Model):
    """Gold-tier men can post to the public feed (like Instagram stories)."""

    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author   = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    caption  = models.TextField(max_length=500, blank=True)
    image    = models.ImageField(upload_to='posts/', null=True, blank=True)
    likes    = models.ManyToManyField(User, related_name='liked_posts', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'posts'
        ordering = ['-created_at']

    def __str__(self):
        return f"Post by {self.author.username}"

    @property
    def likes_count(self):
        return self.likes.count()


# ─────────────────────────────────────────────
# LIKES / SUPER LIKES
# ─────────────────────────────────────────────

class ProfileLike(models.Model):
    """A woman likes a man's profile."""

    from_user  = models.ForeignKey(User, on_delete=models.CASCADE, related_name='likes_given')
    to_profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='likes_received')
    is_super   = models.BooleanField(default=False)   # Super Like costs KES 20
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table       = 'profile_likes'
        unique_together = ('from_user', 'to_profile')

    def __str__(self):
        kind = 'SuperLike' if self.is_super else 'Like'
        return f"{self.from_user.username} → {self.to_profile.display_name} [{kind}]"


# ─────────────────────────────────────────────
# BOOST
# ─────────────────────────────────────────────

class ProfileBoost(models.Model):
    """Records a 24-hour boost purchase."""

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='boosts')
    payment    = models.OneToOneField(MpesaPayment, on_delete=models.CASCADE)
    starts_at  = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = 'profile_boosts'

    def __str__(self):
        return f"Boost: {self.user.username} until {self.expires_at}"


# ─────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────

class Notification(models.Model):
    """In-app notification for likes, messages, subscription events."""

    class NotifType(models.TextChoices):
        LIKE         = 'like',         'Profile Like'
        SUPER_LIKE   = 'super_like',   'Super Like'
        MESSAGE      = 'message',      'New Message'
        PAYMENT_OK   = 'payment_ok',   'Payment Successful'
        PAYMENT_FAIL = 'payment_fail', 'Payment Failed'
        BOOST_EXPIRE = 'boost_expire', 'Boost Expiring'

    user      = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notif_type = models.CharField(max_length=20, choices=NotifType.choices)
    message   = models.CharField(max_length=255)
    is_read   = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notif_type}] → {self.user.username}"