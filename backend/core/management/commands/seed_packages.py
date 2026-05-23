"""
core/management/commands/seed_packages.py
Run: python manage.py seed_packages
Creates the default subscription packages if they don't exist.
"""

from django.core.management.base import BaseCommand
from core.models import Package, PackageTier


class Command(BaseCommand):
    help = 'Seed default LaChick subscription packages'

    PACKAGES = [
        {
            'name'        : 'Basic',
            'tier'        : PackageTier.BASIC,
            'price_kes'   : 99,
            'duration_days': 3,
            'description' : 'Get started — be visible for 3 days.',
            'features'    : [
                'Profile visible in search',
                'Receive messages from women',
                'Basic profile badge',
            ],
        },
        {
            'name'        : 'Weekly',
            'tier'        : PackageTier.WEEKLY,
            'price_kes'   : 299,
            'duration_days': 7,
            'description' : 'A full week of connections.',
            'features'    : [
                'Everything in Basic',
                'Send messages to women',
                'Appear in Top Picks section',
                'Weekly member badge',
            ],
        },
        {
            'name'        : 'Monthly',
            'tier'        : PackageTier.MONTHLY,
            'price_kes'   : 799,
            'duration_days': 30,
            'description' : 'A month of premium visibility.',
            'features'    : [
                'Everything in Weekly',
                'Share photos in chat',
                'Post on the public feed',
                'Monthly member badge',
            ],
        },
        {
            'name'        : 'Gold',
            'tier'        : PackageTier.GOLD,
            'price_kes'   : 1499,
            'duration_days': 30,
            'description' : 'The ultimate LaChick experience.',
            'features'    : [
                'Everything in Monthly',
                'Top of search results always',
                '✦ Gold verified badge',
                'Profile analytics dashboard',
                'Priority support',
            ],
        },
    ]

    def handle(self, *args, **options):
        created = 0
        for pkg_data in self.PACKAGES:
            _, was_created = Package.objects.update_or_create(
                tier    = pkg_data['tier'],
                defaults= pkg_data,
            )
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f'  Created: {pkg_data["name"]}'))
            else:
                self.stdout.write(f'  Updated: {pkg_data["name"]}')

        self.stdout.write(self.style.SUCCESS(
            f'\n✓ Done. {created} package(s) created, {len(self.PACKAGES) - created} updated.'
        ))