# backend/accounting/admin.py

from django.contrib import admin
from .models import AccountGroup, LedgerAccount  # Import both AccountGroup and LedgerAccount models

# Register models for the Django Admin interface
admin.site.register(AccountGroup)
admin.site.register(LedgerAccount)
