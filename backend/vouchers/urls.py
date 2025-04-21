# backend/vouchers/urls.py
from django.urls import path
from .views import create_sales_voucher, ensure_sales_ledgers_view,create_purchase_voucher, create_expense_voucher, create_income_voucher, create_receipt_voucher, create_journal_entry

urlpatterns = [
    path('sales/<int:company_id>/create/', create_sales_voucher, name='create_sales_voucher'),
    path('ensure-sales-ledgers/<int:company_id>/', ensure_sales_ledgers_view, name='ensure_sales_ledgers'),
    path('purchase/<int:company_id>/create/', create_purchase_voucher, name='create_purchase_voucher'),
    path('expense/<int:company_id>/create/', create_expense_voucher, name='create_expense_voucher'),
    # ✅ Income Voucher Creation URL
    path('income/<int:company_id>/create/', create_income_voucher, name='create_income_voucher'),
    path('receipt/<int:company_id>/create/', create_receipt_voucher, name='create_receipt_voucher'),  # ✅ NEW ENDPOINT
    path('journal/<int:company_id>/create/', create_journal_entry, name='create_journal_entry'),


]
