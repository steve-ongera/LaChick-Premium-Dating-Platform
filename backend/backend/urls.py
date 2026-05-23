from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.sitemaps.views import sitemap

# SEO: sitemap
from .sitemaps import ProfileSitemap, StaticViewSitemap

sitemaps = {
    'profiles': ProfileSitemap,
    'static'  : StaticViewSitemap,
}

# JWT
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # Auth (JWT)
    path('api/auth/login/',   TokenObtainPairView.as_view(),  name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(),     name='token_refresh'),

    # Core API
    path('api/', include('core.urls')),

    # SEO
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
]

# Serve media in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)