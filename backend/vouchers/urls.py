# backend/vouchers/urls.py
from django.urls import path
from .views import (
    create_sales_voucher,
    ensure_sales_ledgers_view,
    create_purchase_voucher,
    create_expense_voucher,
    create_income_voucher,
    create_receipt_voucher,
    create_journal_entry,
    create_payment_voucher,
    ensure_payment_ledgers_view,
    ensure_income_ledgers,    # <-- imported here
    create_quotation,
    create_purchase_order,
    create_credit_note_voucher,
    create_debit_note_voucher,
    delete_voucher


)

urlpatterns = [
    path('sales/<int:company_id>/create/', create_sales_voucher, name='create_sales_voucher'),
    path('ensure-sales-ledgers/<int:company_id>/', ensure_sales_ledgers_view, name='ensure_sales_ledgers'),
    path('purchase/<int:company_id>/create/', create_purchase_voucher, name='create_purchase_voucher'),
    path('expense/<int:company_id>/create/', create_expense_voucher, name='create_expense_voucher'),
    path('income/<int:company_id>/create/', create_income_voucher, name='create_income_voucher'),
    path('receipt/<int:company_id>/create/', create_receipt_voucher, name='create_receipt_voucher'),
    path('journal/<int:company_id>/create/', create_journal_entry, name='create_journal_entry'),
    path('payment/<int:company_id>/create/', create_payment_voucher, name='create_payment_voucher'),
    path('ensure-payment-ledgers/<int:company_id>/', ensure_payment_ledgers_view, name='ensure_payment_ledgers'),

    # Use the function name you imported—don’t prefix with `views.`
    path(
        'ensure-income-ledgers/<int:company_id>/',
        ensure_income_ledgers,
        name='ensure-income-ledgers'
    ),
    path('quotations/<int:company_id>/create/', create_quotation, name='create_quotation'),
    path('purchase-orders/<int:company_id>/create/', create_purchase_order, name='create_purchase_order'),

    path(
      'debit-note/<int:company_id>/create/',
      create_debit_note_voucher,
      name='create_debit_note'
    ),
    path(
      'credit-note/<int:company_id>/create/',
      create_credit_note_voucher,
      name='create_credit_note'
    ),

    path(
    '<int:company_id>/voucher/<int:voucher_id>/delete/',
    delete_voucher,
    name='delete_voucher'
),

]
