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

    # 🆕 Dual-role fields
    is_customer = serializers.BooleanField(required=False)
    is_supplier = serializers.BooleanField(required=False)
    main_party_type = serializers.CharField(required=False, allow_null=True)

    class Meta:
        model = LedgerAccount
        fields = [
            'id',
            'name',
            'group_name',
            'group_id',
            'nature',
            'opening_balance',
            'opening_balance_type',
            'created_at',
            'net_balance',
            'balance_type',
            'is_customer',       # ✅ new
            'is_supplier',       # ✅ new
            'main_party_type',   # ✅ new
        ]

    def get_net_balance(self, obj):
        try:
            entries = JournalEntry.objects.filter(ledger=obj)
            total   = sum(e.amount if e.is_debit else -e.amount for e in entries)
            print(f"📊 [NetBalance] Ledger '{obj.name}' (ID: {obj.id}) → raw total = {total}")
            absolute_total = abs(total)
            print(f"📊 [NetBalance] Ledger '{obj.name}' → absolute = {absolute_total}")
            return round(absolute_total, 2)
        except Exception as e:
            print(f"❌ [NetBalance Error] Ledger '{obj.name}' (ID: {obj.id}): {e}")
            return 0.0

    def get_balance_type(self, obj):
        try:
            entries = JournalEntry.objects.filter(ledger=obj)
            total   = sum(e.amount if e.is_debit else -e.amount for e in entries)
            result  = "DR" if total >= 0 else "CR"
            print(f"📈 [BalanceType] Ledger '{obj.name}' (ID: {obj.id}) → raw total = {total} → {result}")
            return result
        except Exception as e:
            print(f"❌ [BalanceType Error] Ledger '{obj.name}' (ID: {obj.id}): {e}")
            return "-"