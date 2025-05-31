from django.urls import path
from .views import create_supplier,SupplierListByCompanyView


urlpatterns = [
    path('create/<int:company_id>/', create_supplier, name='create_supplier'),
    path('list/<int:company_id>/', SupplierListByCompanyView.as_view(), name='supplier-list'),
]
