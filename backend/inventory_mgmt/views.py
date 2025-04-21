from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import InventoryItem, InventoryStockLog
from user_mgmt.models import Company
from .serializers import InventoryItemSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_inventory_items(request, company_id):
    try:
        # company = Company.objects.get(id=company_id)  # ⛔ no need to fetch the object
        items = InventoryItem.objects.filter(company_id=company_id)
        print("📦 Fetching items for company:", company_id, "Total:", items.count())
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    data = [{
        'name': item.name,
        'unit': item.unit,
        'quantity': float(item.quantity),
        'rate': float(item.rate),
        'description': item.description
    } for item in items]
    return Response(data)





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
        return Response({"message": "Item created", "item": serializer.data}, status=201)
    else:
        print("❌ Serializer validation errors:", serializer.errors)
        return Response(serializer.errors, status=400)


