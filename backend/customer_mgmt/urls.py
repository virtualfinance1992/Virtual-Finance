from django.urls import path
from .views import (
    CustomerListCreateView,
    CustomerListByCompanyView,
    CustomerRetrieveUpdateDestroyView,
    CustomerSearchByNameView,  # ✅ Add this import
)

urlpatterns = [
    path('', CustomerListCreateView.as_view(), name='customer-list-create'),
    path('search/', CustomerSearchByNameView.as_view(), name='customer-search-by-name'),  # ✅ Add this route before <int:id>
    path('<int:company_id>/', CustomerListByCompanyView.as_view(), name='customer-by-company'),
    path('<int:id>/', CustomerRetrieveUpdateDestroyView.as_view(), name='customer-retrieve-update-destroy'),
]
