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




from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from .models import LedgerAccount, AccountGroup
from .serializers import LedgerAccountSerializer
from user_mgmt.models import Company

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_ledger(request):
    print("📥 Incoming request to create ledger:", request.data)

    group_name = request.data.get("group_name")
    company_id = request.data.get("company_id")
    name = request.data.get("name")
    opening_balance = request.data.get("opening_balance", 0)
    balance_type = request.data.get("opening_balance_type", "Dr")
    is_customer = request.data.get("is_customer", False)
    is_supplier = request.data.get("is_supplier", False)
    main_party_type = request.data.get("main_party_type", None)

    if not all([group_name, company_id, name]):
        print("❌ Missing required fields.")
        return Response({"error": "group_name, company_id, and name are required."}, status=400)

    try:
        company = Company.objects.get(id=company_id, admin=request.user)
        group = AccountGroup.objects.get(group_name=group_name, company=company)
        print(f"🏢 Company: {company.company_name} | 📘 Group: {group.group_name}")

    except Company.DoesNotExist:
        print("❌ Invalid company or unauthorized access.")
        return Response({"error": "Invalid company or unauthorized."}, status=403)
    except AccountGroup.DoesNotExist:
        print(f"❌ Account group '{group_name}' not found in company.")
        return Response({"error": "Account group not found in this company."}, status=404)

    if LedgerAccount.objects.filter(name=name, company=company).exists():
        print(f"⚠️ Ledger with name '{name}' already exists in company.")
        return Response({"error": "Ledger with this name already exists in this company."}, status=400)

    ledger = LedgerAccount.objects.create(
        name=name,
        account_group=group,
        company=company,
        opening_balance=opening_balance,
        opening_balance_type=balance_type,
        is_active=True,
        created_at=timezone.now(),
        is_customer=is_customer,
        is_supplier=is_supplier,
        main_party_type = request.data.get("main_party_type") or "General"  # ✅ fallback default
    )

    print("✅ Ledger created:", ledger.name, "| Dual Role:", is_customer, is_supplier)
    serializer = LedgerAccountSerializer(ledger)
    return Response({
        "message": "✅ Ledger created successfully.",
        "ledger": serializer.data
    }, status=201)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_ledger(request, ledger_id):
    print(f"✏️ Received request to update ledger ID {ledger_id}: {request.data}")

    try:
        ledger = LedgerAccount.objects.get(id=ledger_id)
    except LedgerAccount.DoesNotExist:
        print("❌ Ledger not found.")
        return Response({"error": "Ledger not found"}, status=status.HTTP_404_NOT_FOUND)

    serializer = LedgerAccountSerializer(ledger, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        print("✅ Ledger updated:", ledger.name)
        return Response(serializer.data)
    else:
        print("❌ Validation error:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


from datetime import datetime
from io import BytesIO
from django.http import HttpResponse
from django.template.loader import render_to_string
from xhtml2pdf import pisa

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import LedgerAccount
from vouchers.models import JournalEntry


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_ledger_pdf(request, ledger_id):
    print(f"📥 Generating PDF for Ledger ID: {ledger_id} by user {request.user}")

    try:
        ledger = LedgerAccount.objects.select_related('company', 'account_group').get(id=ledger_id)
    except LedgerAccount.DoesNotExist:
        print("❌ Ledger not found")
        return Response({'detail': 'Ledger not found'}, status=status.HTTP_404_NOT_FOUND)

    entries = JournalEntry.objects.filter(ledger=ledger).select_related('voucher').order_by('voucher__date')
    entry_list = []

    for e in entries:
        counter = JournalEntry.objects.filter(voucher=e.voucher_id).exclude(id=e.id).select_related('ledger').first()
        party_name = counter.ledger.name if counter else ''
        entry_list.append({
            "voucher_id": e.voucher.id,
            "date": e.voucher.date,
            "voucher_number": getattr(e.voucher, 'voucher_number', ''),
            "party_name": party_name,
            "type": "Dr" if e.is_debit else "Cr",
            "amount": float(e.amount),
            "particulars": getattr(e, 'narration', '') or getattr(e.voucher, 'narration', ''),
        })

    # ✅ Render HTML to PDF
    html = render_to_string('ledger_pdf_template.html', {
        'ledger': ledger,
        'entries': entry_list,
        'company': ledger.company,
        'date': datetime.today(),
    })

    result = BytesIO()
    pdf = pisa.pisaDocument(BytesIO(html.encode("UTF-8")), result)
    if pdf.err:
        return HttpResponse('❌ PDF generation failed', status=500)

    response = HttpResponse(result.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{ledger.name.replace(" ", "_")}_Ledger.pdf"'
    return response




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



# List Expense Ledger
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_expense_ledgers(request, company_id):
    try:
        company = Company.objects.get(id=company_id, admin=request.user)
    except Company.DoesNotExist:
        return Response({"error": "Company not found."}, status=404)

    # Only active ledgers whose group is of nature 'Expense'
    exp_ledgers = LedgerAccount.objects.filter(
        company=company,
        is_active=True,
        account_group__nature='Expense'
    )
    print(f"📦 Returning {exp_ledgers.count()} expense‐type ledgers for company {company_id}")
    serializer = LedgerAccountSerializer(exp_ledgers, many=True)
    return Response(serializer.data)




# Ledger details & Ledger entries
# backend/accounting/views.py

import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import LedgerAccount
from .serializers import LedgerAccountSerializer
from vouchers.models import JournalEntry

# ————— Configure module logger —————
logger = logging.getLogger(__name__)
logging.getLogger('django').setLevel(logging.INFO)     # ensure INFO+ shows
logger.setLevel(logging.DEBUG)                         # and DEBUG for ours


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ledger_detail(request, company_id, ledger_id):
    logger.info(f"[ledger_detail] user={request.user} → company={company_id}, ledger={ledger_id}")
    try:
        ledger = LedgerAccount.objects.get(id=ledger_id, company_id=company_id)
        logger.info(f"[ledger_detail] Found ledger: id={ledger.id}, name={ledger.name}")
    except LedgerAccount.DoesNotExist:
        logger.warning(f"[ledger_detail] NOT FOUND: company={company_id}, ledger={ledger_id}")
        return Response(
            {"detail": "Ledger not found for this company."},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = LedgerAccountSerializer(ledger)
    logger.debug(f"[ledger_detail] Serialized output: {serializer.data}")
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ledger_entries(request, company_id, ledger_id):
    logger.info(
        f"[ledger_entries] User={request.user} "
        f"requested entries for company_id={company_id}, ledger_id={ledger_id}"
    )

    # 1) Guard: ensure ledger belongs to this company
    if not LedgerAccount.objects.filter(id=ledger_id, company_id=company_id).exists():
        logger.warning(
            f"[ledger_entries] Ledger not found in company: "
            f"company_id={company_id}, ledger_id={ledger_id}"
        )
        return Response(
            {"detail": "Ledger not found for this company."},
            status=status.HTTP_404_NOT_FOUND
        )

    # 2) Fetch all entries, ordered by voucher date
    entries = JournalEntry.objects.filter(
        ledger_id=ledger_id,
        ledger__company_id=company_id
    ).select_related('voucher').order_by('voucher__date')
    logger.info(f"[ledger_entries] Retrieved {entries.count()} entries")

    data = []
    for e in entries:
        # — build “particulars” safely —
        particulars = ''
        if hasattr(e, 'narration') and e.narration:
            particulars = e.narration
        elif hasattr(e.voucher, 'narration') and e.voucher.narration:
            particulars = e.voucher.narration

        # — NEW: pull voucher_number —
        voucher_no = getattr(e.voucher, 'voucher_number', '')
        logger.debug(f"[ledger_entries] Entry {e.id} voucher_number → '{voucher_no}'")

        # — NEW: resolve party_name from the “other” entry in this voucher —
        counter = JournalEntry.objects.filter(
            voucher=e.voucher_id
        ).exclude(id=e.id).select_related('ledger').first()
        party_name = counter.ledger.name if counter else ''
        logger.debug(f"[ledger_entries] Entry {e.id} party_name → '{party_name}'")

        # assemble the row
        entry = {
            "voucher_id":     e.voucher.id,          
            "id":             e.id,
            "date":           e.voucher.date,
            "voucher_number": voucher_no,
            "party_name":     party_name,
            "type":           "Dr" if e.is_debit else "Cr",
            "amount":         float(e.amount),
            "particulars":    particulars,
        }
        logger.debug(f"[ledger_entries] Final row: {entry}")
        data.append(entry)

    return Response(data)
