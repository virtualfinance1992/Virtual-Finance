# voucher_audit/serializers.py
from rest_framework import serializers
from vouchers.models import VoucherItem, Voucher, JournalEntry
from accounting.models import LedgerAccount
from customer_mgmt.models import Customer
from supplier_mgmt.models import Supplier
from .models import VoucherView
from vouchers.serializers import VoucherItemSerializer

from rest_framework import serializers
from vouchers.models import JournalEntry
from accounting.models import LedgerAccount
from customer_mgmt.models import Customer
from supplier_mgmt.models import Supplier

class JournalEntrySnapshotSerializer(serializers.ModelSerializer):
    party_name = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()

    class Meta:
        model = JournalEntry
        fields = [
            'id',
            'voucher',
            'ledger',
            'is_debit',
            'amount',
            
            'party_name',
            'type',
            'date',
        ]

    def get_party_name(self, obj):
        if not obj.ledger:
            print(f"⚠️ [JE:{obj.id}] Ledger missing")
            return ""

        ledger_name = obj.ledger.name.strip()
        print(f"🔍 [JE:{obj.id}] Checking party_name for ledger: {ledger_name}")

        # Step 1: Match Customer
        customer = Customer.objects.filter(name__iexact=ledger_name).first()
        if customer:
            print(f"👤 [JE:{obj.id}] Matched Customer: {customer.name}")
            return customer.name

        # Step 2: Match Supplier
        supplier = Supplier.objects.filter(name__iexact=ledger_name).first()
        if supplier:
            print(f"🏢 [JE:{obj.id}] Matched Supplier: {supplier.name}")
            return supplier.name

        # Step 3: Check if Cash/Bank
        if ledger_name.lower() in ['cash', 'cash account', 'bank', 'bank account']:
            print(f"🏦 [JE:{obj.id}] Identified as Cash/Bank ledger")
            return ledger_name

        # Step 4: Fallback to voucher.party_name
        try:
            voucher_party = obj.voucher.party_name
            if voucher_party:
                print(f"📌 [JE:{obj.id}] Fallback to voucher.party_name: {voucher_party}")
                return voucher_party
        except Exception as e:
            print(f"⚠️ [JE:{obj.id}] Error getting party_name from voucher: {e}")

        # Final fallback
        print(f"📦 [JE:{obj.id}] Using ledger name as fallback: {ledger_name}")
        return ledger_name

    def get_type(self, obj):
        return "Dr" if obj.is_debit else "Cr"



class VoucherViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoucherView
        fields = ['id', 'voucher', 'company', 'user', 'viewed_at', 'snapshot']

    def to_representation(self, instance):
        # --- 1) Log entry into serializer ---
        print(f"🔄 [Serializer] Start serializing VoucherView id={instance.id}, voucher={instance.voucher_id}")

        # --- 2) Get the base representation ---
        data = super().to_representation(instance)
        print(f"📋 [Serializer] Data keys before injection: {list(data.keys())}")
        
        # --- 3) Grab existing snapshot dict ---
        snapshot = data.get('snapshot', {})
        print(f"🗂️ [Serializer] Existing snapshot keys: {list(snapshot.keys())}")

        # --- 4) Inject voucher-level remarks ---
        voucher = instance.voucher  # Django auto-relation to the Voucher model
        remarks_val = getattr(voucher, 'remarks', '') or ''
        snapshot['remarks'] = remarks_val
        print(f"✏️ [Serializer] Injected voucher remarks: {remarks_val}")

        # --- 5) Pull and serialize all VoucherItem rows for this voucher ---
        items_qs   = VoucherItem.objects.filter(voucher_id=instance.voucher_id)
        items_data = VoucherItemSerializer(items_qs, many=True).data
        print(f"🔢 [Serializer] Found {items_qs.count()} VoucherItem(s) for voucher {instance.voucher_id}")
        
        # --- 6) Inject 'items' key into the snapshot sub-dict ---
        snapshot['items'] = items_data
        data['snapshot']  = snapshot
        print(f"✅ [Serializer] Injected items into snapshot, snapshot now has keys: {list(snapshot.keys())}")

        # --- 7) Preview first line-item if present ---
        if items_data:
            print(f"👀 [Serializer] First item preview: {items_data[0]}")
        else:
            print(f"⚠️ [Serializer] No items to preview for voucher {instance.voucher_id}")

        # --- 8) Final log and return ---
        print(f"🎉 [Serializer] Finished serializing VoucherView id={instance.id}")
        return data


# New code from here rest all are old code

# voucher_audit/serializers.py

