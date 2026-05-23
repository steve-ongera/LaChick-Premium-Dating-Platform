"""
core/management/commands/seed_data.py

Seeds realistic demo data for ALL models except packages (already seeded).

Usage:
    python manage.py seed_data
    python manage.py seed_data --users 20       # custom user count
    python manage.py seed_data --clear          # wipe existing demo data first

Photos pulled from https://picsum.photos — free, no auth, random portraits.
Swap the download logic for your local files once you have them.
"""

import os
import io
import random
import requests
import uuid
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.utils import timezone
from django.db import transaction

from core.models import (
    User, Profile, ProfilePhoto, Package,
    ChatRoom, Message, Post, ProfileLike,
    ProfileBoost, Notification, MpesaPayment,
    PackageTier, PaymentStatus, MessageType, Gender,
)

# ── Demo data pools ──────────────────────────────────────────

MALE_NAMES = [
    ('Brian', 'Otieno'), ('Kevin', 'Mwangi'), ('David', 'Kamau'),
    ('James', 'Njoroge'), ('Samuel', 'Ochieng'), ('Peter', 'Kariuki'),
    ('Eric', 'Mutua'), ('Michael', 'Waweru'), ('Alex', 'Kipkoech'),
    ('Dennis', 'Gitonga'), ('Victor', 'Omondi'), ('Ian', 'Nderitu'),
    ('Collins', 'Abuya'), ('Frank', 'Mugo'), ('Tony', 'Wekesa'),
    ('Chris', 'Maina'), ('Moses', 'Ngugi'), ('Emmanuel', 'Otieno'),
    ('George', 'Kimani'), ('Patrick', 'Owino'),
]

FEMALE_NAMES = [
    ('Faith', 'Wanjiku'), ('Grace', 'Achieng'), ('Diana', 'Mwangi'),
    ('Mercy', 'Kariuki'), ('Lucy', 'Otieno'), ('Vivian', 'Kamau'),
    ('Esther', 'Njeri'), ('Sharon', 'Odhiambo'), ('Carol', 'Wambui'),
    ('Janet', 'Mutua'),
]

CITIES = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Kitale', 'Malindi']

OCCUPATIONS = [
    'Software Engineer', 'Business Analyst', 'Doctor', 'Teacher',
    'Entrepreneur', 'Accountant', 'Lawyer', 'Marketing Manager',
    'Civil Engineer', 'Graphic Designer', 'Nurse', 'Architect',
    'Sales Manager', 'Data Scientist', 'Journalist', 'Pharmacist',
]

EDUCATION_LIST = [
    'BSc Computer Science, UoN', 'MBA, Strathmore University',
    'BEng Civil Engineering, JKUAT', 'BCom, KCA University',
    'BSc Nursing, MKU', 'LLB, UoN School of Law',
    'BSc Economics, Egerton University', 'Diploma in IT, KMTC',
]

INTERESTS_POOL = [
    'Hiking', 'Tech', 'Cooking', 'Travel', 'Fitness', 'Reading',
    'Music', 'Photography', 'Football', 'Business', 'Fashion',
    'Movies', 'Art', 'Gaming', 'Cars', 'Agriculture', 'Finance',
    'Church', 'Volunteering', 'Dancing', 'Swimming', 'Running',
]

BIOS = [
    "Passionate about technology and building things that matter. I enjoy hiking on weekends and trying new restaurants around Nairobi. Looking for someone genuine and ambitious.",
    "A calm soul who loves deep conversations, good food, and weekend road trips. I believe in working hard and playing harder. Let's build something beautiful.",
    "Entrepreneur and fitness enthusiast. I start my mornings with a run and end them reading. I value loyalty, family, and a good sense of humour.",
    "Doctor by profession, adventurer by heart. I've visited 12 countries and counting. Looking for a grounded woman who knows what she wants.",
    "Creative professional who thrives on ideas and execution. I enjoy live music, art galleries, and cooking experimental meals on Sundays.",
    "I believe great relationships are built on honesty and mutual respect. Simple man, big dreams. Let's start with coffee.",
    "Football fan, car enthusiast, and part-time philosopher. I'm looking for someone who balances ambition with warmth.",
    "Nairobi born and raised. I love the energy of this city — its hustle, food, and people. Let me show you the best of it.",
]

LOOKING_FOR_LIST = [
    "A kind, ambitious woman who is family-oriented and values loyalty above all else.",
    "Someone to grow with — intellectually, emotionally, and spiritually.",
    "A genuine connection that could lead to a serious relationship and eventually marriage.",
    "A grounded woman with goals, a good heart, and a great sense of humour.",
    "Long-term relationship with someone who values communication and shared growth.",
]

CHAT_MESSAGES_M = [
    "Hey! I saw your profile and thought you seemed really interesting.",
    "Your bio mentioned hiking — I've been wanting to try Ngong Hills. Would you recommend it?",
    "That's a great photo from Mombasa! Did you go recently?",
    "I love your taste in music. Have you been to any live shows lately?",
    "Good morning! Hope your week is off to a great start 😊",
    "I'd love to grab coffee sometime if you're up for it.",
]

CHAT_MESSAGES_F = [
    "Hi! Thanks for reaching out 😊",
    "Yes! Ngong Hills is beautiful — best to go early morning before it gets cloudy.",
    "Ha, that was last December for New Year's. One of my favourite trips!",
    "I went to a jazz night at Alliance Française last month, it was amazing!",
    "It is, thank you! How's your day going?",
    "That sounds lovely, I'd like that!",
]

POST_CAPTIONS = [
    "Living my best life one adventure at a time 🌍",
    "Nairobi sunsets hit different. Grateful for this city.",
    "Sunday reset: good food, good music, good vibes ✨",
    "Closed the biggest deal of my career this week. Keep pushing, it pays off.",
    "Weekend hike at Aberdare. Nature is the best therapy.",
    "Good morning from the city that never sleeps 🌆",
    "A year of growth, gratitude, and grinding. Here's to more.",
]

NOTIF_MESSAGES = [
    "Faith liked your profile ❤️",
    "Grace sent you a Super Like 💛",
    "New message from Diana!",
    "Your Monthly package is now active! 🎉",
    "Your profile boost has been activated 🚀",
    "Your Gold package expires in 2 days. Renew to stay visible!",
]


# ── Image helpers ─────────────────────────────────────────────

def _download_image(seed: int, size: int = 400) -> tuple[bytes, str]:
    """
    Download a random portrait from Picsum Photos.
    seed ensures a consistent unique image per user.
    Returns (bytes, content_type).
    """
    url = f'https://picsum.photos/seed/{seed}/{size}/{size}'
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        return resp.content, 'image/jpeg'
    except Exception:
        return None, None


def _save_image_to_field(field, seed, size=400, filename_prefix='img'):
    """Download image and save it to a Django ImageField."""
    data, ctype = _download_image(seed, size)
    if data:
        field.save(
            f'{filename_prefix}_{seed}.jpg',
            ContentFile(data),
            save=False,
        )
        return True
    return False


# ── Main command ──────────────────────────────────────────────

class Command(BaseCommand):
    help = 'Seed demo data for LaChick (all models except packages)'

    def add_arguments(self, parser):
        parser.add_argument('--users',  type=int, default=15,  help='Number of male users to create (default 15)')
        parser.add_argument('--clear',  action='store_true',   help='Clear existing demo users first')

    def handle(self, *args, **options):
        n_males = min(options['users'], len(MALE_NAMES))

        if options['clear']:
            self._clear()

        self.stdout.write('\n🌱 Seeding LaChick demo data…\n')

        with transaction.atomic():
            packages   = list(Package.objects.filter(is_active=True))
            if not packages:
                self.stdout.write(self.style.WARNING('  ⚠  No packages found. Run seed_packages first.'))
                packages = []

            males   = self._seed_males(n_males, packages)
            females = self._seed_females()
            self._seed_payments(males, packages)
            self._seed_chat(males, females)
            self._seed_posts(males)
            self._seed_likes(males, females)
            self._seed_boosts(males)
            self._seed_notifications(males + females)

        self.stdout.write(self.style.SUCCESS(
            f'\n✓ Done! Created {len(males)} men, {len(females)} women, '
            f'posts, chats, likes, boosts, and notifications.\n'
        ))

    # ── Clear ──────────────────────────────────────────────

    def _clear(self):
        self.stdout.write('  Clearing demo users…')
        # Delete in correct order to avoid foreign key issues
        User.objects.filter(email__endswith='@lachick.demo').delete()
        self.stdout.write('  Done.\n')

    # ── Males ─────────────────────────────────────────────

    def _seed_males(self, count, packages):
        self.stdout.write(f'  Creating {count} male profiles…')
        males = []
        tiers = [PackageTier.BASIC, PackageTier.WEEKLY, PackageTier.MONTHLY, PackageTier.GOLD]

        for i in range(count):
            first, last = MALE_NAMES[i]
            email       = f'{first.lower()}.{last.lower()}.{i}@lachick.demo'
            username    = f'{first.lower()}{i}'

            if User.objects.filter(email=email).exists():
                user = User.objects.get(email=email)
                # Ensure profile exists for existing user
                profile, created = Profile.objects.get_or_create(user=user)
                males.append(user)
                continue

            # Create user
            user = User.objects.create_user(
                username   = username,
                email      = email,
                password   = 'LaChick@2024',
                gender     = Gender.MALE,
                phone      = f'07{random.randint(10000000, 99999999)}',
                is_verified= random.choice([True, True, False]),
            )

            # Create profile (MUST be created manually since no signal exists)
            profile = Profile.objects.create(user=user)
            
            # Pick a tier — weight towards paid
            tier = random.choices(
                tiers,
                weights=[10, 25, 35, 30],
                k=1
            )[0]

            pkg_obj = next((p for p in packages if p.tier == tier), None)

            expires = timezone.now() + timedelta(
                days=pkg_obj.duration_days if pkg_obj else 30
            ) if tier != PackageTier.FREE else None

            # Fill profile data
            profile.display_name        = f'{first} {last}'
            profile.bio                 = random.choice(BIOS)
            profile.age                 = random.randint(22, 42)
            profile.city                = random.choice(CITIES)
            profile.country             = 'Kenya'
            profile.occupation          = random.choice(OCCUPATIONS)
            profile.education           = random.choice(EDUCATION_LIST)
            profile.height_cm           = random.randint(162, 192)
            profile.interests           = random.sample(INTERESTS_POOL, k=random.randint(3, 7))
            profile.looking_for         = random.choice(LOOKING_FOR_LIST)
            profile.package_tier        = tier
            profile.package_expires_at  = expires
            profile.profile_views       = random.randint(0, 600)
            profile.likes_count         = random.randint(0, 80)

            # Avatar
            self.stdout.write(f'    Downloading avatar for {first}…', ending='\r')
            _save_image_to_field(profile.avatar, seed=i * 7, size=400, filename_prefix='avatar')

            profile.save()

            # Gallery photos (2–4 per profile)
            for j in range(random.randint(2, 4)):
                photo = ProfilePhoto(
                    profile   = profile,
                    caption   = random.choice(['', f'Taken in {random.choice(CITIES)}', 'Good times ✨', '']),
                    is_primary= (j == 0),
                )
                _save_image_to_field(photo.image, seed=(i * 13 + j + 100), size=600, filename_prefix='gallery')
                photo.save()

            males.append(user)

        self.stdout.write(self.style.SUCCESS(f'  ✓ {len(males)} male profiles ready.'))
        return males

    # ── Females ───────────────────────────────────────────

    def _seed_females(self):
        self.stdout.write('  Creating female profiles…')
        females = []

        for i, (first, last) in enumerate(FEMALE_NAMES):
            email    = f'{first.lower()}.{last.lower()}.{i}@lachick.demo'
            username = f'{first.lower()}{i}'

            if User.objects.filter(email=email).exists():
                user = User.objects.get(email=email)
                # Ensure profile exists for existing user
                profile, created = Profile.objects.get_or_create(user=user)
                females.append(user)
                continue

            # Create user
            user = User.objects.create_user(
                username   = username,
                email      = email,
                password   = 'LaChick@2024',
                gender     = Gender.FEMALE,
                phone      = f'07{random.randint(10000000, 99999999)}',
            )

            # Create profile (MUST be created manually since no signal exists)
            profile = Profile.objects.create(user=user)
            
            # Fill profile data
            profile.display_name  = f'{first} {last}'
            profile.bio           = 'Just here to find a genuine connection.'
            profile.age           = random.randint(20, 35)
            profile.city          = random.choice(CITIES)
            profile.country       = 'Kenya'
            profile.occupation    = random.choice(OCCUPATIONS)
            profile.interests     = random.sample(INTERESTS_POOL, k=random.randint(2, 5))
            profile.package_tier  = PackageTier.FREE   # women browse free

            self.stdout.write(f'    Downloading avatar for {first}…', ending='\r')
            _save_image_to_field(profile.avatar, seed=(i * 5 + 200), size=400, filename_prefix='female_avatar')
            profile.save()

            females.append(user)

        self.stdout.write(self.style.SUCCESS(f'  ✓ {len(females)} female profiles ready.'))
        return females

    # ── Payments ──────────────────────────────────────────

    def _seed_payments(self, males, packages):
        self.stdout.write('  Seeding payment records…')
        count = 0
        for user in males:
            profile = user.profile
            if profile.package_tier == PackageTier.FREE:
                continue

            pkg = next((p for p in packages if p.tier == profile.package_tier), None)
            if not pkg:
                continue

            # 1–2 historical payments
            for _ in range(random.randint(1, 2)):
                MpesaPayment.objects.get_or_create(
                    user    = user,
                    package = pkg,
                    phone   = user.phone or '254712345678',
                    defaults=dict(
                        amount               = pkg.price_kes,
                        status               = PaymentStatus.COMPLETED,
                        mpesa_receipt_number = f'QHJ{random.randint(1000000, 9999999)}',
                        checkout_request_id  = str(uuid.uuid4()),
                        merchant_request_id  = str(uuid.uuid4()),
                        result_code          = 0,
                        result_desc          = 'The service request is processed successfully.',
                        created_at           = timezone.now() - timedelta(days=random.randint(1, 60)),
                    )
                )
                count += 1

        self.stdout.write(self.style.SUCCESS(f'  ✓ {count} payment records created.'))

    # ── Chat ──────────────────────────────────────────────

    def _seed_chat(self, males, females):
        self.stdout.write('  Seeding chat rooms & messages…')
        room_count = 0
        msg_count  = 0

        for woman in females:
            # Each woman chats with 2–4 men
            targets = random.sample(males, k=min(random.randint(2, 4), len(males)))
            for man in targets:
                if man.profile.package_tier == PackageTier.FREE:
                    continue

                room, created = ChatRoom.objects.get_or_create(man=man, woman=woman)
                if not created:
                    continue

                room_count += 1
                n_exchanges = random.randint(2, 6)

                for k in range(n_exchanges):
                    # Alternate sender: woman starts
                    if k % 2 == 0:
                        sender = woman
                        body   = random.choice(CHAT_MESSAGES_F)
                    else:
                        sender = man
                        body   = random.choice(CHAT_MESSAGES_M)

                    msg = Message.objects.create(
                        room         = room,
                        sender       = sender,
                        body         = body,
                        message_type = MessageType.TEXT,
                        is_read      = (k < n_exchanges - 1),   # last msg unread
                        created_at   = timezone.now() - timedelta(minutes=(n_exchanges - k) * 15),
                    )
                    msg_count += 1

                room.last_message_at = timezone.now() - timedelta(minutes=5)
                room.save()

        self.stdout.write(self.style.SUCCESS(f'  ✓ {room_count} rooms, {msg_count} messages.'))

    # ── Posts ─────────────────────────────────────────────

    def _seed_posts(self, males):
        self.stdout.write('  Seeding feed posts…')
        count = 0
        gold_males = [m for m in males if m.profile.package_tier == PackageTier.GOLD]

        for i, man in enumerate(gold_males):
            n_posts = random.randint(1, 3)
            for j in range(n_posts):
                post = Post(
                    author    = man,
                    caption   = random.choice(POST_CAPTIONS),
                    created_at= timezone.now() - timedelta(days=random.randint(0, 30)),
                )
                # Attach image to ~70% of posts
                if random.random() > 0.3:
                    _save_image_to_field(
                        post.image,
                        seed=(i * 11 + j + 400),
                        size=800,
                        filename_prefix='post',
                    )
                post.save()
                count += 1

        self.stdout.write(self.style.SUCCESS(f'  ✓ {count} posts created.'))

    # ── Likes ─────────────────────────────────────────────

    def _seed_likes(self, males, females):
        self.stdout.write('  Seeding profile likes…')
        count = 0

        for woman in females:
            liked_men = random.sample(males, k=min(random.randint(3, 8), len(males)))
            for man in liked_men:
                if man.profile.package_tier == PackageTier.FREE:
                    continue
                is_super = random.random() < 0.15   # 15% chance of super like
                ProfileLike.objects.get_or_create(
                    from_user  = woman,
                    to_profile = man.profile,
                    defaults   = {'is_super': is_super},
                )
                count += 1

        # Sync likes_count on profiles
        for man in males:
            real_count = man.profile.likes_received.count()
            Profile.objects.filter(pk=man.profile.pk).update(likes_count=real_count)

        self.stdout.write(self.style.SUCCESS(f'  ✓ {count} likes created.'))

    # ── Boosts ────────────────────────────────────────────

    def _seed_boosts(self, males):
        self.stdout.write('  Seeding profile boosts…')
        count = 0
        paid_males = [m for m in males if m.profile.package_tier not in (PackageTier.FREE, PackageTier.BASIC)]

        if paid_males:
            for man in random.sample(paid_males, k=min(3, len(paid_males))):
                # Create a dummy completed boost payment
                payment = MpesaPayment.objects.create(
                    user                 = man,
                    phone                = man.phone or '254712345678',
                    amount               = 50,
                    status               = PaymentStatus.COMPLETED,
                    is_boost             = True,
                    mpesa_receipt_number = f'QHJ{random.randint(1000000, 9999999)}',
                    checkout_request_id  = str(uuid.uuid4()),
                    result_code          = 0,
                )

                expires = timezone.now() + timedelta(hours=random.randint(1, 23))
                ProfileBoost.objects.create(
                    user      = man,
                    payment   = payment,
                    expires_at= expires,
                )

                man.profile.is_boosted       = True
                man.profile.boost_expires_at = expires
                man.profile.save()
                count += 1

        self.stdout.write(self.style.SUCCESS(f'  ✓ {count} boosts activated.'))

    # ── Notifications ─────────────────────────────────────

    def _seed_notifications(self, users):
        self.stdout.write('  Seeding notifications…')
        notif_types = list(Notification.NotifType)
        count = 0

        for user in users:
            n = random.randint(2, 5)
            for i in range(n):
                Notification.objects.create(
                    user       = user,
                    notif_type = random.choice(notif_types),
                    message    = random.choice(NOTIF_MESSAGES),
                    is_read    = (i < n - 1),   # keep latest unread
                    created_at = timezone.now() - timedelta(hours=random.randint(1, 72)),
                )
                count += 1

        self.stdout.write(self.style.SUCCESS(f'  ✓ {count} notifications created.'))