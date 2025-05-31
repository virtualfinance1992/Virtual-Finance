from django.urls import path
from .views import financial_kpi_summary, sales_purchase_trend, dashboard_summary

urlpatterns = [
    path('summary/<int:company_id>/', financial_kpi_summary, name='financial_kpi_summary'),
    path('trend/<int:company_id>/', sales_purchase_trend, name='sales_purchase_trend'),
    path('analytics/summary/<int:company_id>/', dashboard_summary, name='analytics-summary'),
]


