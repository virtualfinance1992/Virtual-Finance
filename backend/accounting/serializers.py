from rest_framework import serializers
from .models import AccountGroup, LedgerAccount

class AccountGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountGroup
        fields = '__all__'
        extra_kwargs = {
            'company': {'read_only': True}
        }

from vouchers.models import JournalEntry  # ✅ Required import

from rest_framework import serializers
from accounting.models import LedgerAccount
from vouchers.models import JournalEntry

class LedgerAccountSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source='account_group.group_name', read_only=True)
    group_id = serializers.IntegerField(source='account_group.id', read_only=True)
    nature = serializers.CharField(source='account_group.nature', read_only=True)

    net_balance = serializers.SerializerMethodField()
    balance_type = serializers.SerializerMethodField()

    class Meta:
        model = LedgerAccount
        fields = [
            'id',
            'name',
            'group_name',        # ✅ Display group
            'group_id',
            'nature',
            'opening_balance',
            'opening_balance_type',
            'created_at',
            'net_balance',       # ✅ Computed
            'balance_type',      # ✅ Dr / Cr
        ]

    def get_net_balance(self, obj):
        try:
            entries = JournalEntry.objects.filter(ledger=obj)
            total = sum(e.amount if e.is_debit else -e.amount for e in entries)
            print(f"📊 Ledger: {obj.name} | Entries: {entries.count()} | Net Balance: {total}")
            return round(total, 2)
        except Exception as e:
            print(f"❌ Error calculating net_balance for ledger {obj.name} ({obj.id}): {e}")
            return 0.0

    def get_balance_type(self, obj):
        try:
            entries = JournalEntry.objects.filter(ledger=obj)
            total = sum(e.amount if e.is_debit else -e.amount for e in entries)
            result = "Dr" if total >= 0 else "Cr"
            print(f"📈 Ledger: {obj.name} | Type: {result}")
            return result
        except Exception as e:
            print(f"❌ Error calculating balance_type for ledger {obj.name} ({obj.id}): {e}")
            return "-"
