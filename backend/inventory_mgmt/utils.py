from decimal import Decimal
from .models import InventoryItem, InventoryStockLog

def update_inventory(company, item_name, unit, quantity_change, rate, voucher_type, reference):
    try:
        print(f"📦 Updating Inventory for item: {item_name}")
        item = InventoryItem.objects.get(company=company, name=item_name)

        old_qty = item.quantity or 0
        print(f"🔢 Old Quantity: {old_qty}, Quantity Change: {quantity_change}")

        new_qty = old_qty + Decimal(quantity_change)
        item.quantity = new_qty
        item.save()

        print(f"✅ New Quantity Saved: {new_qty} for item: {item.name}")

        InventoryStockLog.objects.create(
            company=company,
            item_name=item.name,
            unit=unit,
            quantity_changed=Decimal(quantity_change),
            resulting_quantity=new_qty,
            reference=reference,
            change_type=voucher_type.upper()
        )
        print(f"🧾 Stock Log Created for {voucher_type} → Qty: {quantity_change} | Ref: {reference}")

        return new_qty

    except InventoryItem.DoesNotExist:
        print(f"❌ Inventory item not found: {item_name}")
        return None
