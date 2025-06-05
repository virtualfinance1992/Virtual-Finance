from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponseRedirect
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# ✅ Import settings and static for media files
from django.conf import settings
from django.conf.urls.static import static

from django.http import HttpResponse

# health-check endpoint
def health(request):
    return HttpResponse("OK", status=200)

# Redirect view to frontend
def redirect_to_frontend(request):
   return HttpResponseRedirect("https://kah6rkvybi.ap-south-1.awsapprunner.com/")  # adjust if neededhttps://kah6rkvybi.ap-south-1.awsapprunner.com/

urlpatterns = [
    path('', redirect_to_frontend),
    path('admin/', admin.site.urls),
    path('api/admin/', include('user_mgmt.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/accounting/', include('accounting.urls')),
    path('api/vouchers/', include('vouchers.urls')),
    path('api/customers/', include('customer_mgmt.urls')),
    path('api/suppliers/', include('supplier_mgmt.urls')),
    path('api/inventory/', include('inventory_mgmt.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/metrics/', include('analytics.urls')),
    path('api/voucher-audit/', include('voucher_audit.urls')),
    path("", health),  
    path("health/", health),
]

# ✅ Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
