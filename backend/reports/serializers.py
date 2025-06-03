# reports/serializers.py
from rest_framework import serializers

class AccountSummarySerializer(serializers.Serializer):
    group = serializers.CharField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)

class BalanceSheetSerializer(serializers.Serializer):
    assets = AccountSummarySerializer(many=True)
    liabilities = AccountSummarySerializer(many=True)
    equity = AccountSummarySerializer(many=True)

# serializers.py

# reports/serializers.py
from rest_framework import serializers
from django.db.models.fields import DecimalField

#
# 1) “Nested entry” serializer — one JournalEntry line inside any group’s “entries” array.
#
class JournalEntryLineSerializer(serializers.Serializer):
    date           = serializers.DateField()
    voucher_number = serializers.CharField()
    ledger_name    = serializers.CharField()
    is_debit       = serializers.BooleanField()
    amount         = serializers.DecimalField(max_digits=14, decimal_places=2)
    signed_amount  = serializers.DecimalField(max_digits=14, decimal_places=2)


#
# 2) “Group with entries” serializer — one account‐group block (e.g. “Sales Accounts”),
#    including its total amount and an array of the individual entry lines.
#
class GroupWithEntriesSerializer(serializers.Serializer):
    group   = serializers.CharField()   # e.g. "Sales Accounts", "Indirect Income", etc.
    amount  = serializers.DecimalField(max_digits=14, decimal_places=2)
    entries = JournalEntryLineSerializer(many=True)


#
# 3) “Party‐Amount” serializer — used for “sales_by_party” or “purchase_by_party” lists.
#
class PartyAmountSerializer(serializers.Serializer):
    party  = serializers.CharField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)


#
# 4) FINAL Profit & Loss serializer — ties everything together.
#
class ProfitLossSerializer(serializers.Serializer):
    # Top‐level “Sales Accounts” block (may contain one dict)
    revenue           = GroupWithEntriesSerializer(many=True)

    # Drill‐down arrays:
    sales_by_party    = PartyAmountSerializer(many=True)
    purchase_by_party = PartyAmountSerializer(many=True)

    # All other income groups except “Sales Accounts”
    other_income      = GroupWithEntriesSerializer(many=True)

    # Cost of Goods Sold (“Purchase Accounts”)
    cogs              = GroupWithEntriesSerializer(many=True)

    # Gross Profit is just a single Decimal
    gross_profit      = serializers.DecimalField(max_digits=14, decimal_places=2)

    # Operating expense groups
    expenses          = GroupWithEntriesSerializer(many=True)

    operating_income  = serializers.DecimalField(max_digits=14, decimal_places=2)

    # Income tax group (may be empty)
    income_tax        = GroupWithEntriesSerializer(many=True)

    # Finally, Net Income
    net_income        = serializers.DecimalField(max_digits=14, decimal_places=2)


class CashFlowSerializer(serializers.Serializer):
    operating = AccountSummarySerializer(many=True)
    investing = AccountSummarySerializer(many=True)
    financing = AccountSummarySerializer(many=True)
    net_change = serializers.DecimalField(max_digits=14, decimal_places=2)
