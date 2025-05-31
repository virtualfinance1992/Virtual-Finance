from rest_framework import serializers
from vouchers.models import Voucher, VoucherItem
from vouchers.serializers import VoucherItemSerializer
from inventory_mgmt.models import InventoryItem
from inventory_mgmt.utils import update_inventory


class InventoryItemSerializer(serializers.ModelSerializer):
    total_value = serializers.SerializerMethodField()  # ✅ This line is required
    class Meta:
        model = InventoryItem
        fields = [
            'id',
            'name',
            'unit',
            'rate',
            'barcode',
            'hsn_code',
            'description',
            'quantity',          # 🔄 Opening Quantity
            'opening_value',     # 💰 Opening Value
            'gst_applicable',
            'gst_rate',
            'company',           # ForeignKey, set via view
            'total_value',   # ➕ Add this
        ]
        extra_kwargs = {
            'company': {'read_only': True},  # ✅ Set in view, not from request
        }

    def get_total_value(self, obj):
        # If you want a float instead of Decimal:
        return float(obj.quantity) * float(obj.rate)




class VoucherSerializer(serializers.ModelSerializer):
    items = VoucherItemSerializer(many=True)

    class Meta:
        model = Voucher
        fields = '__all__'

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        voucher = Voucher.objects.create(**validated_data)

        updated_stock = {}

        for item in items_data:
            VoucherItem.objects.create(voucher=voucher, **item)

            qty_change = float(item.get('qty', 0))
            change_type = voucher.voucher_type
            rate = float(item.get('rate', 0))
            unit = item.get('unit', 'pcs')
            item_name = item.get('item_name')

            # 🧮 Apply inventory update
            if change_type == 'SALES':
                new_qty = update_inventory(
                    company=voucher.company,
                    item_name=item_name,
                    unit=unit,
                    quantity_change=-qty_change,
                    rate=rate,
                    voucher_type='SALES',
                    reference=voucher.invoice_number
                )
            elif change_type == 'PURCHASE':
                new_qty = update_inventory(
                    company=voucher.company,
                    item_name=item_name,
                    unit=unit,
                    quantity_change=qty_change,
                    rate=rate,
                    voucher_type='PURCHASE',
                    reference=voucher.invoice_number
                )
            else:
                new_qty = None

            if new_qty is not None:
                updated_stock[item_name] = new_qty

        # 🔁 Add updated stock info in response
        response_data = self.to_representation(voucher)
        response_data['updated_stock'] = updated_stock
        return response_data
