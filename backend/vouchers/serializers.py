from rest_framework import serializers
from .models import Voucher, JournalEntry, VoucherItem

class JournalEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model  = JournalEntry
        fields = ['ledger', 'is_debit', 'amount']


class VoucherItemSerializer(serializers.ModelSerializer):
    class Meta:
        model  = VoucherItem
        fields = [
            'voucher',
            'item_name',
            'qty',
            'rate',
            'discount',
            'gst',
            'unit',
            'notes',
            'remarks',
        ]


from rest_framework import serializers
from vouchers.models import Voucher
from vouchers.serializers import JournalEntrySerializer, VoucherItemSerializer

class VoucherSerializer(serializers.ModelSerializer):
    against_voucher = serializers.PrimaryKeyRelatedField(
        queryset=Voucher.objects.filter(voucher_type='SALES'),
        required=False,
        allow_null=True,
    )
    against_voucher_number = serializers.CharField(
        source='against_voucher.voucher_number',
        read_only=True
    )
    entries = JournalEntrySerializer(many=True)
    items = VoucherItemSerializer(many=True, read_only=True)

    class Meta:
        model = Voucher
        fields = [
            'id',
            'company',
            'voucher_type',
            'voucher_number',
            'date',
            'reference',
            'against_voucher',
            'against_voucher_number',
            'items',
            'entries',
        ]
        read_only_fields = ['id', 'against_voucher_number']
        extra_kwargs = {
            'against_voucher': {'required': False, 'allow_null': True},
        }

    def create(self, validated_data):
        # 1) Pull out the link to the original bill, if any
        against = validated_data.pop('against_voucher', None)
        # 2) Pull out the journal entries
        entries_data = validated_data.pop('entries', [])

        # 3) Create the voucher itself (including against_voucher_id if present)
        print("🔄 [Serializer] Creating Voucher:", validated_data, f"against={against}")
        if against is not None:
            voucher = Voucher.objects.create(
                **validated_data,
                against_voucher_id=against.id
            )
        else:
            voucher = Voucher.objects.create(**validated_data)
        print(f"✅ [Serializer] Voucher ID: {voucher.id}  (against_voucher_id={voucher.against_voucher_id})")

        # 4) Create all the journal entries
        print("🔄 [Serializer] Creating Journal Entries...")
        for i, je_data in enumerate(entries_data, start=1):
            je = JournalEntry.objects.create(voucher=voucher, **je_data)
            print(f"   ✔ JE#{i}", {
                'id': je.id,
                'ledger': je.ledger_id,
                'dr/cr': 'Dr' if je.is_debit else 'Cr',
                'amt': str(je.amount),
            })

        return voucher

    def to_representation(self, instance):
        data = super().to_representation(instance)
        party_name = None
        try:
            # 1) Look at credit entries first
            for entry in instance.entries.all():
                if not entry.is_debit:
                    name = entry.ledger.name.lower()
                    if name not in ['sales', 'purchase', 'cash', 'bank', 'cash account', 'bank account']:
                        party_name = entry.ledger.name
                        break

            # 2) If none found, scan all entries for any non-excluded ledger
            if not party_name:
                for entry in instance.entries.all():
                    name = entry.ledger.name.lower()
                    if name not in ['sales', 'purchase', 'cash', 'bank', 'cash account', 'bank account']:
                        party_name = entry.ledger.name
                        break

            # 3) Final fallback to the very first ledger
            if not party_name and instance.entries.exists():
                party_name = instance.entries.first().ledger.name

        except Exception as e:
            print(f"⚠️ Error deriving party_name: {e}")
            party_name = '—'

        data['party_name'] = party_name or '—'
        return data



# For quotation and purchase order

from rest_framework import serializers
from .models import Quotation, PurchaseOrder, QuotationItem, POItem

class QuotationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotationItem
        fields = ['description','amount']

class QuotationSerializer(serializers.ModelSerializer):
    items = QuotationItemSerializer(many=True)
    class Meta:
        model  = Quotation
        fields = ['id','company','date','reference','customer','items']

    def create(self, validated_data):
        items = validated_data.pop('items')
        quote = Quotation.objects.create(**validated_data)
        for it in items:
            QuotationItem.objects.create(voucher=quote, **it)
        return quote

class POItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = POItem
        fields = ['description','amount']

class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = POItemSerializer(many=True)
    class Meta:
        model  = PurchaseOrder
        fields = ['id','company','date','reference','supplier','items']

    def create(self, validated_data):
        items = validated_data.pop('items')
        po = PurchaseOrder.objects.create(**validated_data)
        for it in items:
            POItem.objects.create(voucher=po, **it)
        return po
