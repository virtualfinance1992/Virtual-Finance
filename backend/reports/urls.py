from django.urls import path
from .views import ReportView, dashboard_summary, inventory_pie_data

urlpatterns = [
    path('<int:company_id>/dashboard-summary/', dashboard_summary, name='dashboard-summary'),
    path('<int:company_id>/inventory-pie/', inventory_pie_data),
    path('<int:company_id>/<str:report_key>/', ReportView.as_view(), name='report-detail'),
    
]
