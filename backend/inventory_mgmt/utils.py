from .models import InventoryItem, InventoryStockLog

def update_inventory(company, item_name, unit, quantity_change, rate=0, voucher_type=None, reference=None):
    item, created = InventoryItem.objects.get_or_create(
        company=company,
        name=item_name,
        defaults={'unit': unit, 'quantity': 0, 'rate': rate}
    )

    item.quantity += quantity_change
    if rate > 0:
        item.rate = rate
    item.save()

    InventoryStockLog.objects.create(
        company=company,
        item_name=item_name,
        change_type=voucher_type or ("SALES" if quantity_change < 0 else "PURCHASE"),
        quantity_changed=abs(quantity_change),
        resulting_quantity=item.quantity,
        reference=reference
    )

    return item.quantity
