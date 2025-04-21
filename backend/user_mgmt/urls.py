from django.urls import path, include
from .views import AdminRegistrationView, create_company, list_companies, delete_company

urlpatterns = [
    path('register/', AdminRegistrationView.as_view(), name='admin-register'),
    path('api/admin/company/create/', create_company, name='create_company'),  # For creating a company
    path('api/admin/company/list/', list_companies, name='list_companies'),  # For listing all companies
    path('api/admin/company/delete/<int:company_id>/', delete_company, name='delete_company'),  # For deleting a company
    path('company/', include('user_mgmt.company.urls')),  # ✅ Only this include is valid
    
]