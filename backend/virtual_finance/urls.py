from django.contrib import admin
from django.urls import path, include  # ✅ make sure path and include are imported
from django.http import HttpResponseRedirect
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# Redirect view to frontend
def redirect_to_frontend(request):
    return HttpResponseRedirect("http://localhost:3000/")  # adjust URL if needed

urlpatterns = [
    path('', redirect_to_frontend),  # 👈 this will now work correctly
    path('admin/', admin.site.urls),
    path('api/admin/', include('user_mgmt.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/accounting/', include('accounting.urls')),
    path('api/vouchers/', include('vouchers.urls')),  # Include vouchers urls
    path('api/customers/', include('customer_mgmt.urls')),
    path('api/suppliers/', include('supplier_mgmt.urls')),
    path('api/inventory/', include('inventory_mgmt.urls')),

]
