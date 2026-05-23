"""
lachick/sitemaps.py — SEO sitemaps for public profile pages and static URLs.
"""

from django.contrib.sitemaps import Sitemap
from django.urls import reverse
from core.models import Profile, PackageTier


class ProfileSitemap(Sitemap):
    """
    Generates a sitemap entry for every visible male profile.
    Search engines can crawl and index these pages.
    """
    changefreq = 'weekly'
    priority   = 0.8

    def items(self):
        return Profile.objects.filter(
            user__gender='male',
        ).exclude(
            package_tier=PackageTier.FREE
        ).select_related('user')

    def location(self, obj):
        return f'/profiles/{obj.slug}/'

    def lastmod(self, obj):
        return obj.updated_at


class StaticViewSitemap(Sitemap):
    """Sitemap for static landing pages (SEO city/interest pages)."""
    changefreq = 'monthly'
    priority   = 0.6

    def items(self):
        return [
            'home',
        ]

    def location(self, item):
        if item == 'home':
            return '/'
        return f'/{item}/'