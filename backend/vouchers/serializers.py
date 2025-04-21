from rest_framework import serializers
from .models import Voucher, JournalEntry, VoucherItem

# ✅ First define JournalEntrySerializer
class JournalEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalEntry
        fields = ['ledger', 'is_debit', 'amount']

# ✅ Then define VoucherItemSerializer
class VoucherItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoucherItem
        fields = ['item_name', 'qty', 'rate', 'discount', 'gst', 'unit']

# ✅ Now define VoucherSerializer (after both of the above)
class VoucherSerializer(serializers.ModelSerializer):
    entries = JournalEntrySerializer(many=True)
    items = VoucherItemSerializer(many=True, required=False)

    class Meta:
        model = Voucher
        fields = ['id', 'company', 'voucher_type', 'voucher_number', 'date', 'reference', 'notes', 'entries', 'items']

    def create(self, validated_data):
        entries_data = validated_data.pop('entries')
        items_data = validated_data.pop('items', [])

        voucher = Voucher.objects.create(**validated_data)

        print("🔄 Creating Journal Entries...")
        for entry in entries_data:
            JournalEntry.objects.create(voucher=voucher, **entry)

        print("🧾 Creating Voucher Items...")
        for item in items_data:
            VoucherItem.objects.create(voucher=voucher, **item)

        return voucher
