from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Supplier
from .serializers import SupplierSerializer
from accounting.models import LedgerAccount, AccountGroup
from user_mgmt.models import Company
from django.utils import timezone

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_supplier(request, company_id):
    print(f"📥 Incoming supplier data: {request.data}")
    user = request.user

    try:
        company = Company.objects.get(id=company_id, admin=user)
        print(f"🏢 Company validated: {company.company_name}")
    except Company.DoesNotExist:
        print("❌ Company not found or unauthorized.")
        return Response({"error": "Invalid company."}, status=403)

    serializer = SupplierSerializer(data=request.data)
    if serializer.is_valid():
        supplier = serializer.save(company=company)
        print(f"✅ Supplier created: {supplier.name}")

        # 🔁 Create Ledger
        try:
            group = AccountGroup.objects.get(group_name="Sundry Creditors", company=company)
        except AccountGroup.DoesNotExist:
            print("❌ Sundry Creditors group missing. Creating...")
            group = AccountGroup.objects.create(
                group_name="Sundry Creditors",
                nature="Liability",
                company=company
            )

        ledger, created = LedgerAccount.objects.get_or_create(
            name=supplier.name,
            company=company,
            defaults={
                "account_group": group,
                "opening_balance": 0,
                "opening_balance_type": "Cr",
                "is_active": True,
                "created_at": timezone.now(),
                "is_supplier": True,
                "is_customer": False,
                "main_party_type": "supplier"
            }
        )

        if created:
            print(f"🧾 Ledger created for supplier: {ledger.name}")
        else:
            print(f"⚠️ Ledger already exists for: {ledger.name}")

        return Response({"message": "✅ Supplier and Ledger saved successfully"}, status=201)
    else:
        print("❌ Supplier form validation failed:", serializer.errors)
        return Response(serializer.errors, status=400)






from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .models import Supplier
from .serializers import SupplierSerializer
from user_mgmt.models import Company
from accounting.models import AccountGroup, LedgerAccount


class SupplierListByCompanyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, company_id):
        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({'error': 'Invalid company ID'}, status=status.HTTP_404_NOT_FOUND)

        suppliers = Supplier.objects.filter(company=company)
        serializer = SupplierSerializer(suppliers, many=True)
        return Response(serializer.data)

    def post(self, request, company_id):
        print(f"📥 Incoming supplier data: {request.data}")

        try:
            company = Company.objects.get(id=company_id)
            print(f"✅ Company validated: {company}")
        except Company.DoesNotExist:
            print("❌ Company not found.")
            return Response({'error': 'Invalid company ID'}, status=status.HTTP_404_NOT_FOUND)

        name = request.data.get('name')
        if Supplier.objects.filter(name=name, company=company).exists():
            print(f"⚠️ Supplier '{name}' already exists.")
            return Response({"error": "Supplier already exists."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = SupplierSerializer(data=request.data)
        if serializer.is_valid():
            supplier = serializer.save(company=company)
            print(f"✅ Supplier '{supplier.name}' saved.")

            try:
                liabilities_group = AccountGroup.objects.filter(group_name='Current Liabilities', company=company).first()
                if liabilities_group:
                    print("✅ 'Current Liabilities' group found.")

                    sundry_creditors_group, created = AccountGroup.objects.get_or_create(
                        group_name='Sundry Creditors',
                        company=company,
                        defaults={
                            'nature': 'Liability',
                            'parent': liabilities_group,
                            'description': 'Payables to suppliers'
                        }
                    )
                    print(f"{'🆕 Created' if created else '✅ Found'} 'Sundry Creditors' group.")

                    balance_type = request.data.get("balance_type", "credit")
                    opening_balance_type = 'Cr' if balance_type == 'credit' else 'Dr'

                    LedgerAccount.objects.create(
                        name=supplier.name,
                        company=company,
                        account_group=sundry_creditors_group,
                        opening_balance=float(request.data.get("opening_balance") or 0),
                        opening_balance_type=opening_balance_type
                    )

                    print(f"✅ Ledger created for supplier '{supplier.name}'.")
                else:
                    print("⚠️ 'Current Liabilities' group not found. Skipped ledger creation.")
            except Exception as e:
                print(f"❌ Error during ledger creation: {e}")

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        print(f"❌ Serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
