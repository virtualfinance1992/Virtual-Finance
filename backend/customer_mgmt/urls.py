from django.urls import path
from .views import CustomerListCreateView, CustomerRetrieveUpdateDestroyView, CustomerListByCompanyView


urlpatterns = [
    path('', CustomerListCreateView.as_view(), name='customer-list-create'),  # List and create customer
    path('<int:company_id>/', CustomerListByCompanyView.as_view(), name='customer-by-company'),
    path('<int:id>/', CustomerRetrieveUpdateDestroyView.as_view(), name='customer-retrieve-update-destroy'),  # Retrieve, update, delete customer
]
