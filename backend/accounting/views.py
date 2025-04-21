# backend/accounting/views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import AccountGroup, LedgerAccount
from .serializers import AccountGroupSerializer, LedgerAccountSerializer
from user_mgmt.models import Company

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from accounting.models import AccountGroup, LedgerAccount
from user_mgmt.models import Company
from accounting.serializers import AccountGroupSerializer

# ✅ Full Implementation: Interlinked Chart of Accounts with Hierarchical Nature Logic
# ✅ Full Implementation: Interlinked Chart of Accounts with Hierarchical Nature Logic
# ✅ Full Implementation: Interlinked Chart of Accounts with Hierarchical Nature Logic
# ✅ Full Implementation: Interlinked Chart of Accounts with Hierarchical Nature Logic
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Company, AccountGroup, LedgerAccount
from .serializers import AccountGroupSerializer
from django.utils import timezone

# 🚀 Add to AccountGroup model:
# def get_root_nature(self):
#     if self.parent:
#         return self.parent.get_root_nature()
#     return self.nature

DEFAULT_GROUPS = [
    {"group_name": "Capital Account", "nature": "Equity", "description": "Owner’s capital, reserves, retained earnings"},
    {"group_name": "Loans (Liability)", "nature": "Liability", "description": "Secured/Unsecured loans"},
    {"group_name": "Current Liabilities", "nature": "Liability", "description": "Creditors, duties, taxes"},
    {"group_name": "Fixed Assets", "nature": "Asset", "description": "Building, plant, machinery, furniture"},
    {"group_name": "Investments", "nature": "Asset", "description": "Long/short-term investments"},
    {"group_name": "Current Assets", "nature": "Asset", "description": "Cash, bank, receivables"},
    {"group_name": "Direct Expenses", "nature": "Expense", "description": "Expenses directly related to production"},
    {"group_name": "Indirect Expenses", "nature": "Expense", "description": "Salaries, rent, admin costs"},
    {"group_name": "Direct Income", "nature": "Income", "description": "Sales, export income"},
    {"group_name": "Indirect Income", "nature": "Income", "description": "Commission, interest received"},
    {"group_name": "Purchase Accounts", "nature": "Expense", "description": "Raw material, stock purchases"},
    {"group_name": "Sales Accounts", "nature": "Income", "description": "Primary sales income"},
    {"group_name": "Suspense Account", "nature": "Liability", "description": "Temporary holding for unknown/unmatched entries"},
    {"group_name": "Duties & Taxes", "nature": "Liability", "description": "GST, VAT, TDS, etc."},
    {"group_name": "Provisions", "nature": "Liability", "description": "Provision for tax, bad debts"},
]

DEFAULT_SUBGROUPS = [
    {"group_name": "Bank", "nature": "Asset", "description": "All bank balances", "parent": "Current Assets"},
    {"group_name": "Cash-in-Hand", "nature": "Asset", "description": "Physical cash", "parent": "Current Assets", "default_ledgers": ["Main Cash", "Petty Cash"]},
    {"group_name": "Debtors", "nature": "Asset", "description": "Accounts receivable", "parent": "Current Assets"},
    {"group_name": "Creditors", "nature": "Liability", "description": "Accounts payable", "parent": "Current Liabilities"},
    {"group_name": "TDS Payable", "nature": "Liability", "description": "Tax deducted at source", "parent": "Duties & Taxes"},
    {"group_name": "GST Payable", "nature": "Liability", "description": "Goods and Services Tax", "parent": "Duties & Taxes"},
    {"group_name": "Salary Expenses", "nature": "Expense", "description": "Staff salary related", "parent": "Indirect Expenses"},
    {"group_name": "Rent & Utilities", "nature": "Expense", "description": "Rent, electricity, water", "parent": "Indirect Expenses"},
    {"group_name": "Sales Local", "nature": "Income", "description": "Domestic sales", "parent": "Sales Accounts"},
    {"group_name": "Sales Export", "nature": "Income", "description": "Exports", "parent": "Sales Accounts"},
]

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_default_chart_of_accounts(request, company_id):
    try:
        company = Company.objects.get(id=company_id, admin=request.user)
    except Company.DoesNotExist:
        return Response({"detail": "Company not found or not owned by user."}, status=404)

    created_groups = []

    # Step 1: Create main account groups
    for group_data in DEFAULT_GROUPS:
        group, created = AccountGroup.objects.get_or_create(
            company=company,
            group_name=group_data["group_name"],
            defaults={
                "nature": group_data["nature"],
                "description": group_data["description"],
                "is_contra": group_data.get("is_contra", False),
            }
        )

        if created:
            created_groups.append(group)
            print(f"✅ Group created: {group.group_name}")

        # Default ledger
        ledger_name = f"{group.group_name} Ledger"
        if not LedgerAccount.objects.filter(name=ledger_name, company=company, account_group=group).exists():
            LedgerAccount.objects.create(
                name=ledger_name,
                account_group=group,
                company=company,
                opening_balance=0,
                is_active=True
            )
            print(f"✅ Ledger created: {ledger_name}")

    # Step 2: Create subgroups and nested ledgers
    for subgroup_data in DEFAULT_SUBGROUPS:
        try:
            parent_group = AccountGroup.objects.get(company=company, group_name=subgroup_data["parent"])
        except AccountGroup.DoesNotExist:
            print(f"❌ Parent group '{subgroup_data['parent']}' not found. Skipping subgroup '{subgroup_data['group_name']}'")
            continue

        subgroup, created = AccountGroup.objects.get_or_create(
            company=company,
            group_name=subgroup_data["group_name"],
            defaults={
                "nature": subgroup_data["nature"],
                "description": subgroup_data["description"],
                "parent": parent_group,
                "is_contra": subgroup_data.get("is_contra", False),
            }
        )

        if created:
            created_groups.append(subgroup)
            print(f"✅ Subgroup created: {subgroup.group_name} under {parent_group.group_name}")

        # Only create default ledgers for subgroups with defined ledgers
        for ledger_name in subgroup_data.get("default_ledgers", []):
            full_name = f"{ledger_name} Ledger"
            if not LedgerAccount.objects.filter(name=full_name, company=company, account_group=subgroup).exists():
                LedgerAccount.objects.create(
                    name=full_name,
                    account_group=subgroup,
                    company=company,
                    opening_balance=0,
                    is_active=True
                )
                print(f"✅ Ledger created: {full_name}")

    serializer = AccountGroupSerializer(created_groups, many=True)
    return Response(
        {"message": "✅ Default Chart of Accounts and Ledgers created successfully!", "created_groups": serializer.data},
        status=status.HTTP_201_CREATED
    )



    
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import AccountGroup, Company
from .serializers import AccountGroupSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_account_groups(request, company_id):
    try:
        company = Company.objects.get(id=company_id, admin=request.user)
    except Company.DoesNotExist:
        return Response({"detail": "Company not found or not owned by user."}, status=404)

    account_groups = AccountGroup.objects.filter(company=company)
    serializer = AccountGroupSerializer(account_groups, many=True)
    return Response(serializer.data)




#code for ledgers



from accounting.models import LedgerAccount
from accounting.serializers import LedgerAccountSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from user_mgmt.models import Company
from vouchers.models import JournalEntry

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_ledgers_by_company(request, company_id):
    try:
        company = Company.objects.get(id=company_id, admin=request.user)
    except Company.DoesNotExist:
        return Response({"detail": "Company not found."}, status=404)

    print(f"📦 Fetching ledgers for Company ID: {company_id}")
    ledgers = LedgerAccount.objects.filter(company=company).prefetch_related('account_group')
    print(f"➡️ Found {ledgers.count()} ledgers.")

    for l in ledgers:
        print(f"📘 Ledger: {l.name} | Group: {l.account_group.group_name}")

    serializer = LedgerAccountSerializer(ledgers, many=True)
    return Response(serializer.data)


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import AccountGroup, LedgerAccount
from .serializers import AccountGroupSerializer, LedgerAccountSerializer
from user_mgmt.models import Company
from django.utils import timezone

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_account_group(request, company_id):
    try:
        company = Company.objects.get(id=company_id, admin=request.user)
    except Company.DoesNotExist:
        return Response({"error": "Unauthorized or invalid company."}, status=403)

    data = request.data.copy()
    data['company'] = company.id

    serializer = AccountGroupSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        print("✅ Group created:", serializer.data)
        return Response({"message": "✅ Group created successfully!", "group": serializer.data}, status=201)
    else:
        print("❌ Group creation error:", serializer.errors)
        return Response(serializer.errors, status=400)




@api_view(['POST'])
@permission_classes([IsAuthenticated])

def create_ledger(request):
    group_name = request.data.get("group_name")  # ✅ Use group_name
    company_id = request.data.get("company_id")
    name = request.data.get("name")
    opening_balance = request.data.get("opening_balance", 0)
    balance_type = request.data.get("opening_balance_type", "Dr")

    try:
        company = Company.objects.get(id=company_id, admin=request.user)
        group = AccountGroup.objects.get(group_name=group_name, company=company)  # ✅ Filter by name and company
    except Company.DoesNotExist:
        return Response({"error": "Invalid company or unauthorized."}, status=403)
    except AccountGroup.DoesNotExist:
        return Response({"error": "Account group not found in this company."}, status=404)

    if LedgerAccount.objects.filter(name=name, account_group=group, company=company).exists():
        return Response({"error": "Ledger with this name already exists in the selected group."}, status=400)

    ledger = LedgerAccount.objects.create(
        name=name,
        account_group=group,
        company=company,
        opening_balance=opening_balance,
        opening_balance_type=balance_type,
        is_active=True,
        created_at=timezone.now(),
    )

    serializer = LedgerAccountSerializer(ledger)
    return Response({
        "message": "✅ Ledger created successfully.",
        "ledger": serializer.data
    }, status=201)


# To Update, Delete and Download ledger
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import LedgerAccount
from .serializers import LedgerAccountSerializer
from django.http import FileResponse
from io import BytesIO
from reportlab.pdfgen import canvas

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_ledger(request, ledger_id):
    print(f"✏️ Received request to update ledger ID {ledger_id}: {request.data}")
    try:
        ledger = LedgerAccount.objects.get(id=ledger_id)
    except LedgerAccount.DoesNotExist:
        print("❌ Ledger not found")
        return Response({"error": "Ledger not found"}, status=status.HTTP_404_NOT_FOUND)

    serializer = LedgerAccountSerializer(ledger, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        print("✅ Ledger updated successfully")
        return Response(serializer.data)
    else:
        print("❌ Validation errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_ledger_pdf(request, ledger_id):
    print(f"📥 PDF download requested for ledger ID {ledger_id}")
    try:
        ledger = LedgerAccount.objects.get(id=ledger_id)
    except LedgerAccount.DoesNotExist:
        print("❌ Ledger not found")
        return Response({"error": "Ledger not found"}, status=status.HTTP_404_NOT_FOUND)

    buffer = BytesIO()
    p = canvas.Canvas(buffer)
    p.drawString(100, 800, f"Ledger Report: {ledger.name}")
    p.drawString(100, 780, f"Opening Balance: ₹{ledger.opening_balance} {ledger.opening_balance_type}")
    p.drawString(100, 760, f"Created on: {ledger.created_at.strftime('%Y-%m-%d')}")
    p.showPage()
    p.save()

    buffer.seek(0)
    print("✅ PDF generated and ready for download")
    return FileResponse(buffer, as_attachment=True, filename=f"{ledger.name}_report.pdf")



@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_ledger(request, ledger_id):
    print(f"🗑️ Attempting to delete Ledger ID: {ledger_id}")
    try:
        ledger = LedgerAccount.objects.get(id=ledger_id)
    except LedgerAccount.DoesNotExist:
        print("❌ Ledger not found")
        return Response({"error": "Ledger not found"}, status=status.HTTP_404_NOT_FOUND)

    # Optional: Check for connected transactions (pseudo check)
    if hasattr(ledger, 'linked_entries') and ledger.linked_entries.exists():
        print("⚠️ Ledger has linked transactions. Cannot delete.")
        return Response({"error": "Ledger is linked to other transactions and cannot be deleted."}, status=400)

    ledger.delete()
    print("✅ Ledger deleted successfully")
    return Response({"message": "Ledger deleted successfully"}, status=status.HTTP_200_OK)
