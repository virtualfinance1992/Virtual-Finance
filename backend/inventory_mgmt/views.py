from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import InventoryItem, InventoryStockLog
from user_mgmt.models import Company
from .serializers import InventoryItemSerializer


from django.db.models import Sum
from vouchers.models import VoucherItem

from django.db.models import Sum
from vouchers.models import VoucherItem

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_inventory_items(request, company_id):
    try:
        items = InventoryItem.objects.filter(company_id=company_id)
        print("📥 Fetching inventory for company:", company_id)

        data = []
        for item in items:
            print(f"\n📦 Item: {item.name}")
            print(f"💰 Rate: ₹{item.rate}")

            purchases = VoucherItem.objects.filter(
                voucher__company_id=company_id,
                item_name=item.name,
                voucher__voucher_type='PURCHASE'
            ).aggregate(total=Sum('qty'))['total'] or 0

            sales = VoucherItem.objects.filter(
                voucher__company_id=company_id,
                item_name=item.name,
                voucher__voucher_type='SALES'
            ).aggregate(total=Sum('qty'))['total'] or 0

            print(f"➕ Total Purchases: {purchases}")
            print(f"➖ Total Sales: {sales}")

            live_quantity = float(purchases) - float(sales)
            print(f"📊 Live Quantity: {live_quantity}")

            total_value = round(live_quantity * float(item.rate), 2)
            print(f"💰 Inventory Value (qty × rate): ₹{total_value}")

            data.append({
                'name': item.name,
                'unit': item.unit,
                'rate': float(item.rate),
                'description': item.description,
                'quantity': live_quantity,
                'total_value': total_value
            })

        return Response(data)

    except Exception as e:
        print("🔥 Error in list_inventory_items:", str(e))
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




# inventory to get stock history
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_stock_history(request, company_id):
    try:
        logs = InventoryStockLog.objects.filter(company_id=company_id).order_by('-date')
        data = [{
            "item_name": log.item_name,
            "change_type": log.change_type,
            "quantity_changed": float(log.quantity_changed),
            "resulting_quantity": float(log.resulting_quantity),
            "reference": log.reference,
            "date": log.date.strftime("%Y-%m-%d %H:%M:%S")
        } for log in logs]
        return Response(data, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    

    # Code to create Inventory Item

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_inventory_item(request, company_id):
    print("🔥 VIEW HIT: create_inventory_item")

    try:
        company = Company.objects.get(id=company_id)
        print("✅ Company fetched:", company.id)
    except Company.DoesNotExist:
        print("❌ Invalid company ID:", company_id)
        return Response({"error": "Invalid company ID"}, status=404)

    data = request.data
    print("📥 Incoming data:", data)

    # ✅ Duplicate check
    if InventoryItem.objects.filter(company=company, name__iexact=data.get('name', '')).exists():
        print("⚠️ Duplicate item attempted:", data['name'])
        return Response({"error": "Item with this name already exists."}, status=400)

    serializer = InventoryItemSerializer(data=data)
    if serializer.is_valid():
        item = serializer.save(company=company)
        print("✅ Item saved:", item.name)

        try:
            from accounting.models import AccountGroup, LedgerAccount

            # ✅ Fetch or create 'Inventory Assets' group under 'Current Assets'
            parent_group = AccountGroup.objects.filter(group_name='Current Assets', company=company).first()
            if parent_group:
                inventory_group, created = AccountGroup.objects.get_or_create(
                    group_name='Inventory Assets',
                    company=company,
                    defaults={
                        'nature': 'Asset',
                        'parent': parent_group,
                        'description': 'All inventory items as assets'
                    }
                )
                print(f"{'🆕 Created' if created else '✅ Found'} 'Inventory Assets' group")

                # 🎯 Create ledger for item
                LedgerAccount.objects.create(
                    name=item.name,
                    company=company,
                    account_group=inventory_group,
                    opening_balance=item.opening_value or 0,
                    opening_balance_type='Dr'  # Inventory is a debit asset
                )
                print(f"✅ Ledger created for inventory item: {item.name}")
            else:
                print("⚠️ 'Current Assets' group not found. Ledger not created.")

        except Exception as e:
            print(f"❌ Ledger creation failed for inventory item: {item.name} | Error: {e}")

        return Response({"message": "Item created", "item": serializer.data}, status=201)

    

# Inventory_sales_summary
from django.db.models import Sum, F, FloatField
from django.db.models.functions import Coalesce
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from vouchers.models import VoucherItem
from datetime import date

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inventory_sales_summary(request, company_id):
    # Get from query params or default to current financial year
    today = date.today()
    default_start = date(today.year if today.month > 3 else today.year - 1, 4, 1)
    default_end = date(today.year if today.month > 3 else today.year, 3, 31)

    start_date = request.GET.get('from_date', default_start)
    end_date = request.GET.get('to_date', default_end)

    items = VoucherItem.objects.filter(
        voucher__company_id=company_id,
        voucher__voucher_type='SALES',
        voucher__date__range=[start_date, end_date]
    ).values('item_name') \
     .annotate(
         total_qty=Coalesce(Sum('qty'), 0),
         avg_rate=Coalesce(Sum(F('qty') * F('rate'), output_field=FloatField()) / Sum('qty'), 0.0),
         total_value=Coalesce(Sum(F('qty') * F('rate'), output_field=FloatField()), 0.0)
     ).order_by('-total_value')

    return Response(list(items))
