# backend/vouchers/views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Voucher
from .serializers import VoucherSerializer
from .utils import generate_voucher_number, ensure_sales_ledgers as ensure_sales_ledgers_util
from user_mgmt.models import Company
from .utils import ensure_purchase_ledgers


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_sales_voucher(request, company_id):
    print("🛡️ IsAuthenticated is working. User:", request.user)
    print("📌 Sales Voucher API Called")
    try:
        data = request.data.copy()
        data['company'] = company_id
        data['voucher_type'] = 'SALES'

        print("✅ create_sales_voucher view loaded")
        print("📦 Raw Payload:", data)

        # ✅ STEP 1: Extract Customer Name (from reference or use fallback)
        customer_name = data.get("reference", "").replace("Invoice to ", "").strip() or "Unnamed Customer"
        print(f"👤 Customer Name Extracted: {customer_name}")

        # ✅ STEP 2: Ensure Ledgers are created/reused properly
        ledger_ids = ensure_sales_ledgers_util(company_id, customer_name)
        print("🧾 Ensured Ledgers:", ledger_ids)

        # ✅ STEP 3: Calculate total amount
        entries = data.get("entries", [])
        total_amount = 0
        for e in entries:
            amt = float(e.get("amount", 0))
            total_amount += amt if e.get("is_debit") else -amt
        print(f"💰 Calculated Total (Net): ₹{total_amount:.2f}")

        # ✅ STEP 4: Set Voucher Number
        voucher_number = generate_voucher_number('SALES', company_id)
        data['voucher_number'] = voucher_number

        # ✅ STEP 5: Save
        serializer = VoucherSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            print("✅ Voucher created successfully:", serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            print("❌ Validation Errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        print("🔥 Exception in Voucher Creation:", str(e))
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ensure_sales_ledgers_view(request, company_id):
    try:
        print("📥 Incoming ensure_sales_ledgers POST request data:", request.data)
        customer_name = request.data.get('name')
        if not customer_name:
            return Response({"error": "Customer name is required."}, status=400)

        ledger_ids = ensure_sales_ledgers_util(company_id, customer_name)
        return Response({
            "customer_ledger_id": ledger_ids['customer'],
            "sales_ledger_id": ledger_ids['sales'],
            "gst_ledger_id": ledger_ids['gst']
        }, status=200)

    except Exception as e:
        print("🔥 Error in ensure_sales_ledgers:", str(e))
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Create Purchase



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_purchase_voucher(request, company_id):
    print("📌 Purchase Voucher API Called")
    try:
        data = request.data.copy()
        data['company'] = company_id
        data['voucher_type'] = 'PURCHASE'

        print("📦 Raw Payload:", data)

        # Extract Supplier Name
        supplier_name = data.get("reference", "").replace("Purchase from ", "").strip() or "Unnamed Supplier"
        print(f"👤 Supplier Name Extracted: {supplier_name}")

        # ✅ Get ledger IDs
        ledger_ids = ensure_purchase_ledgers(company_id, supplier_name)
        print("🧾 Ensured Ledgers:", ledger_ids)

        voucher_number = generate_voucher_number("PURCHASE", company_id)
        data['voucher_number'] = voucher_number

        # ✅ Inject correct ledger IDs into entries
        for i, entry in enumerate(data['entries']):
            if i == 0:
                data['entries'][i]['ledger'] = ledger_ids['purchase']
            elif i == 1:
                data['entries'][i]['ledger'] = ledger_ids['gst']
            elif i == 2:
                data['entries'][i]['ledger'] = ledger_ids['supplier']

        print(f"📊 Final Entries with Ledger IDs: {data['entries']}")

        serializer = VoucherSerializer(data=data)
        if serializer.is_valid():
            voucher = serializer.save()
            print("✅ Voucher saved successfully:", serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            print("❌ Validation Errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        print("🔥 Exception in Purchase Voucher Creation:", str(e))
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Expense 
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Voucher
from .serializers import VoucherSerializer
from .utils import ensure_expense_ledgers, generate_voucher_number
from accounting.models import LedgerAccount
from decimal import Decimal

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .serializers import VoucherSerializer
from .utils import generate_voucher_number, ensure_expense_ledgers
from accounting.models import LedgerAccount
from decimal import Decimal
import traceback

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_expense_voucher(request, company_id):
    print("\n📈 Expense Voucher API Called")
    try:
        data = request.data.copy()
        data['company'] = company_id
        data['voucher_type'] = 'EXPENSE'

        print("📦 Raw Payload:", data)

        # ✅ Extract Party Name from reference
        party_name = data.get("reference", "").replace("Expense paid to ", "").strip() or "Unnamed Expense"
        print(f"👤 Expense Party Name Extracted: {party_name}")

        # ✅ Ensure Ledgers
        ledger_ids = ensure_expense_ledgers(company_id, party_name)
        print("💳 Ensured Ledgers:", ledger_ids)

        # ✅ Build entries dynamically from items
        items = data.get("items", [])
        total_amount = sum(Decimal(str(item.get("amount", 0))) for item in items)
        gst_amount = (total_amount * Decimal("0.10")).quantize(Decimal("0.01"))
        expense_amount = (total_amount - gst_amount).quantize(Decimal("0.01"))

        print(f"💰 Total: ₹{total_amount}, GST: ₹{gst_amount}, Expense Net: ₹{expense_amount}")

        # ✅ Assign journal entries with resolved ledgers
        data['entries'] = [
            {
                "ledger": ledger_ids['expense'],
                "is_debit": True,
                "amount": str(expense_amount)
            },
            {
                "ledger": ledger_ids['gst'],
                "is_debit": True,
                "amount": str(gst_amount)
            },
            {
                "ledger": ledger_ids['party'],
                "is_debit": False,
                "amount": str(total_amount)
            }
        ]

        print("🧾 Final Computed Entries:", data['entries'])

        # ✅ Set Voucher Number
        voucher_number = generate_voucher_number('EXPENSE', company_id)
        data['voucher_number'] = voucher_number

        # ✅ Serialize & Save Voucher
        serializer = VoucherSerializer(data=data)
        if serializer.is_valid():
            voucher = serializer.save()
            print("✅ Expense Voucher saved:", serializer.data)

            # ✅ Update Ledger Balances
            print("🔄 Updating Ledger Balances...")
            for entry in data.get("entries", []):
                try:
                    ledger = LedgerAccount.objects.get(id=entry['ledger'])
                    amount = Decimal(entry['amount'])
                    if entry['is_debit']:
                        ledger.balance += amount
                    else:
                        ledger.balance -= amount
                    ledger.save()
                    print(f"🔁 Ledger Updated: {ledger.name} => ₹{ledger.balance}")
                except Exception as e:
                    print("⚠️ Error updating ledger:", e)

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            print("❌ Validation Errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        print("🔥 Exception in Expense Voucher Creation:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    


    # Income voucher
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .serializers import VoucherSerializer
from .utils import generate_voucher_number, ensure_income_ledgers
from accounting.models import LedgerAccount
from decimal import Decimal
import traceback

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_income_voucher(request, company_id):
    print("\n📈 Income Voucher API Called")

    try:
        # ✅ Clone request data and inject company/voucher type
        data = request.data.copy()
        data['company'] = company_id
        data['voucher_type'] = 'INCOME'

        print("📦 Raw Payload:", data)

        # ✅ Extract party name from reference
        party_name = data.get("reference", "").replace("Income received from ", "").strip() or "Unnamed Income"
        print(f"👤 Income Party Name Extracted: {party_name}")

        # ✅ Ensure ledgers exist or are created
        ledger_ids = ensure_income_ledgers(company_id, party_name)
        print("💳 Ensured Ledgers:", ledger_ids)

        # ✅ Assign ledger IDs based on entry order
        # Order assumed: [income, gst, party]
        if len(data.get("entries", [])) == 3:
            data['entries'][0]['ledger'] = ledger_ids['income']  # Credit Income
            data['entries'][1]['ledger'] = ledger_ids['gst']     # Credit GST
            data['entries'][2]['ledger'] = ledger_ids['party']   # Debit Party
        else:
            print("⚠️ Unexpected number of entries. Cannot assign ledgers reliably.")
            return Response({"error": "Unexpected number of entries."}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Generate voucher number
        data['voucher_number'] = generate_voucher_number("INCOME", company_id)

        # ✅ Serialize and validate
        serializer = VoucherSerializer(data=data)
        if serializer.is_valid():
            voucher = serializer.save()
            print("✅ Income Voucher saved:", serializer.data)

            # 🔄 Update ledger balances
            print("🔄 Updating Ledger Balances...")
            for entry in data['entries']:
                try:
                    ledger = LedgerAccount.objects.get(id=entry['ledger'])
                    amount = Decimal(entry['amount'])

                    if entry['is_debit']:
                        ledger.balance += amount
                    else:
                        ledger.balance -= amount

                    ledger.save()
                    print(f"🔁 Ledger Updated: {ledger.name} => ₹{ledger.balance}")
                except Exception as e:
                    print(f"⚠️ Error updating ledger ID {entry['ledger']}:", str(e))

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            print("❌ Validation Errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        print("🔥 Exception in Income Voucher Creation:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# Recipt From Customer


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from accounting.models import LedgerAccount
from vouchers.models import Voucher
from vouchers.serializers import VoucherSerializer
from vouchers.utils import ensure_receipt_ledgers, generate_voucher_number
from decimal import Decimal
import traceback


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_receipt_voucher(request, company_id):
    print("\n📥 Receipt Voucher API Called")

    try:
        data = request.data.copy()
        data['company'] = company_id
        data['voucher_type'] = 'RECEIPT'

        print("📦 Raw Payload:", data)

        # ✅ Extract Customer Name
        customer_name = data.get("reference", "").replace("Received from ", "").strip() or "Unnamed Customer"
        print(f"👤 Customer Name Extracted: {customer_name}")

        # ✅ Ensure Ledgers
        ledger_ids = ensure_receipt_ledgers(company_id, customer_name)
        print("💳 Ensured Ledgers:", ledger_ids)

        # ✅ Replace ledger placeholders
        for i, entry in enumerate(data.get("entries", [])):
            if entry['ledger'] is None:
                if entry['is_debit']:
                    data['entries'][i]['ledger'] = ledger_ids['bank']
                else:
                    data['entries'][i]['ledger'] = ledger_ids['customer']

        # ✅ Generate voucher number
        data['voucher_number'] = generate_voucher_number("RECEIPT", company_id)

        # ✅ Save Voucher
        serializer = VoucherSerializer(data=data)
        if serializer.is_valid():
            voucher = serializer.save()
            print("✅ Receipt Voucher saved:", serializer.data)

            # 🔄 Update Ledger Balances
            print("🔄 Updating Ledger Balances...")
            for entry in data.get("entries", []):
                try:
                    ledger = LedgerAccount.objects.get(id=entry['ledger'])
                    amount = Decimal(entry['amount'])
                    if entry['is_debit']:
                        ledger.balance += amount
                    else:
                        ledger.balance -= amount
                    ledger.save()
                    print(f"🔁 Ledger Updated: {ledger.name} => ₹{ledger.balance}")
                except Exception as e:
                    print("⚠️ Error updating ledger:", e)

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        else:
            print("❌ Validation Errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        print("🔥 Exception in Receipt Voucher Creation:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# Journal Entry

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .serializers import VoucherSerializer
from accounting.models import LedgerAccount
from .utils import generate_voucher_number
from decimal import Decimal
import traceback

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_journal_entry(request, company_id):
    print("\n📘 Journal Entry API Called")
    try:
        data = request.data.copy()
        data['company'] = company_id
        data['voucher_type'] = 'JOURNAL'

        print("📦 Raw Payload:", data)

        # ✅ Generate Journal Voucher Number
        data['voucher_number'] = generate_voucher_number('JOURNAL', company_id)

        # ✅ Save Voucher
        serializer = VoucherSerializer(data=data)
        if serializer.is_valid():
            voucher = serializer.save()
            print("✅ Journal Entry saved:", serializer.data)

            # 🔄 Update Ledger Balances
            print("🔄 Updating Ledger Balances...")
            for entry in data.get("entries", []):
                try:
                    ledger = LedgerAccount.objects.get(id=entry['ledger'])
                    amount = Decimal(entry['amount'])
                    if entry['is_debit']:
                        ledger.balance += amount
                    else:
                        ledger.balance -= amount
                    ledger.save()
                    print(f"🔁 Ledger Updated: {ledger.name} => ₹{ledger.balance}")
                except Exception as e:
                    print("⚠️ Error updating ledger:", e)

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            print("❌ Validation Errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        print("🔥 Exception in Journal Entry:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

