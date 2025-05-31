from django.urls import path
from .views import voucher_view_history

urlpatterns = [
    # GET /api/voucher-audit/company/<company_id>/voucher/<voucher_id>/history/
    path(
        'company/<int:company_id>/voucher/<int:voucher_id>/history/',
        voucher_view_history,
        name='voucher-view-history'
    ),
]
