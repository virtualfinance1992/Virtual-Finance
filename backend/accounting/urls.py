from django.urls import path
from .views import (
    create_default_chart_of_accounts,
    
    list_account_groups,
    create_ledger,
    list_ledgers_by_company,
    create_account_group,
    update_ledger, 
    download_ledger_pdf,\
    delete_ledger,
    list_expense_ledgers,
    ledger_detail,
    ledger_entries,
)

urlpatterns = [
    # Chart of Accounts
    path('create-default/<int:company_id>/', create_default_chart_of_accounts, name='create-default-coa'),
    
    path('account-groups/<int:company_id>/', list_account_groups, name='account-groups'),

    # Ledger Account
    path('ledger/create/', create_ledger, name='create-ledger'),
    path('ledger/list/<int:company_id>/', list_ledgers_by_company, name='list-ledgers'),
    path('ledgers/expense-accounts/<int:company_id>/', list_expense_ledgers,name='list_expense_ledgers'),

    # New API: Account Group Creation from ledger screen
    path('account-group/create/<int:company_id>/', create_account_group, name='account-group-create'),

    # For Ledger Edit Update, Download Ande Delete
    path('ledger/update/<int:ledger_id>/', update_ledger),
    path('ledger/pdf/<int:ledger_id>/', download_ledger_pdf),
    path('ledger/delete/<int:ledger_id>/', delete_ledger),  
     path(
      'ledger/<int:company_id>/detail/<int:ledger_id>/',
      ledger_detail,
      name='ledger-detail'
    ),
    path(
      'ledger/<int:company_id>/entries/<int:ledger_id>/',
      ledger_entries,
      name='ledger-entries'
    ),
]
