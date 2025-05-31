from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .models import Customer
from .serializers import CustomerSerializer
from user_mgmt.models import Company

# 👇 import from accounting module
from accounting.models import AccountGroup, LedgerAccount


class CustomerListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company_id = request.query_params.get('company')

        if not company_id:
            return Response({'error': 'Company ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({'error': 'Invalid company ID'}, status=status.HTTP_404_NOT_FOUND)

        customers = Customer.objects.filter(company=company)
        serializer = CustomerSerializer(customers, many=True)
        return Response(serializer.data)

    def post(self, request):
        company_id = request.data.get('company')

        if not company_id:
            return Response({'error': 'Company ID is required in request body'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({'error': 'Invalid company ID'}, status=status.HTTP_404_NOT_FOUND)

        name = request.data.get('name')
        if Customer.objects.filter(name=name, company=company).exists():
            return Response({"error": "Customer with this name already exists in your company."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CustomerSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(company=company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ✅ POST Customer + Create Ledger
class CustomerListByCompanyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, company_id):
        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({'error': 'Invalid company ID'}, status=status.HTTP_404_NOT_FOUND)

        customers = Customer.objects.filter(company=company)
        serializer = CustomerSerializer(customers, many=True)
        return Response(serializer.data)

    def post(self, request, company_id):
        print(f"📥 Incoming customer creation request: {request.data}")

        try:
            company = Company.objects.get(id=company_id)
            print(f"✅ Company found: {company}")

        except Company.DoesNotExist:
            print("❌ Company not found.")
            return Response({'error': 'Invalid company ID'}, status=status.HTTP_404_NOT_FOUND)

        name = request.data.get('name')
        if Customer.objects.filter(name=name, company=company).exists():
            print(f"⚠️ Customer '{name}' already exists.")
            return Response({"error": "Customer already exists."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CustomerSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            customer = serializer.save(company=company)
            print(f"✅ Customer '{customer.name}' saved successfully.")

            try:
                current_assets_group = AccountGroup.objects.filter(group_name='Current Assets', company=company).first()
                if current_assets_group:
                    print("✅ 'Current Assets' group found.")

                    sundry_debtors_group, created = AccountGroup.objects.get_or_create(
                        group_name='Sundry Debtors',
                        company=company,
                        defaults={
                            'nature': 'Asset',
                            'parent': current_assets_group,
                            'description': 'Receivables from customers'
                        }
                    )
                    print(f"{'🆕 Created' if created else '✅ Found'} 'Sundry Debtors' group.")


                    # Convert 'credit'/'debit' to 'Cr'/'Dr'
                    balance_type = request.data.get("balance_type", "credit")
                    opening_balance_type = 'Cr' if balance_type == 'credit' else 'Dr'

                    LedgerAccount.objects.create(
                        name=customer.name,
                        company=company,
                        account_group=sundry_debtors_group,
                        opening_balance=float(request.data.get("opening_balance") or 0),
                        opening_balance_type=opening_balance_type
                    )

                    print(f"✅ Ledger created for customer '{customer.name}'.")
                else:
                    print("⚠️ 'Current Assets' group not found. Skipped ledger creation.")

            except Exception as e:
                print(f"❌ Error during ledger creation: {e}")

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        print(f"❌ Serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomerRetrieveUpdateDestroyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        try:
            company = request.user.company
            customer = Customer.objects.get(id=id, company=company)
        except Customer.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CustomerSerializer(customer)
        return Response(serializer.data)

    def put(self, request, id):
        try:
            company = request.user.company
            customer = Customer.objects.get(id=id, company=company)
        except Customer.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CustomerSerializer(customer, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, id):
        try:
            company = request.user.company
            customer = Customer.objects.get(id=id, company=company)
        except Customer.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        customer.delete()
        return Response({"detail": "Deleted successfully"}, status=status.HTTP_204_NO_CONTENT)




# ✅ Add this view to handle customer name + company search
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Customer
from .serializers import CustomerSerializer
from user_mgmt.models import Company

class CustomerSearchByNameView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        name = request.query_params.get("name")
        company_id = request.query_params.get("company")

        if not name or not company_id:
            return Response({"error": "Name and company ID required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({"error": "Company not found"}, status=status.HTTP_404_NOT_FOUND)

        # 🔍 Fetch all matching customers
        customers = Customer.objects.filter(name__iexact=name.strip(), company=company)

        if not customers.exists():
            return Response({"error": "Customer not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = CustomerSerializer(customers, many=True)  # ✅ Fix: many=True
        return Response(serializer.data, status=status.HTTP_200_OK)
