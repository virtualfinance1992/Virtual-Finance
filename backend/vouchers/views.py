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


# backend/vouchers/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from vouchers.models import Voucher, VoucherItem
from vouchers.serializers import VoucherSerializer, VoucherItemSerializer

from accounting.models import LedgerAccount


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_sales_voucher(request, company_id):
    print("📌 Sales Voucher API Called")
    try:
        data = request.data.copy()
        data['company'] = company_id
        data['voucher_type'] = 'SALES'
        # pull out invoice-level remarks so they don’t get treated as an item field
        remarks = data.pop('remarks', '').strip()

        print("📦 Raw Payload:", data)

        # Extract Customer Name
        customer_name = data.get("reference", "").replace("Invoice to ", "").strip() or "Unnamed Customer"
        print(f"👤 Customer Name Extracted: {customer_name}")

        # ✅ Get ledger IDs
        ledger_ids = ensure_sales_ledgers_util(company_id, customer_name)
        print("🧾 Ensured Ledgers:", ledger_ids)

        # ✅ Generate voucher number
        data['voucher_number'] = generate_voucher_number("SALES", company_id)
        print(f"🔢 Voucher Number: {data['voucher_number']}")

        # ✅ Inject correct ledger IDs into entries
        for i, entry in enumerate(data['entries']):
            if i == 0:
                data['entries'][i]['ledger'] = ledger_ids['customer']
            elif i == 1:
                data['entries'][i]['ledger'] = ledger_ids['sales']
            elif i == 2:
                data['entries'][i]['ledger'] = ledger_ids['gst']

        print(f"📊 Final Entries with Ledger IDs: {data['entries']}")

        # ✅ Create and save voucher
        serializer = VoucherSerializer(data=data)
        if not serializer.is_valid():
            print("❌ Validation Errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        voucher = serializer.save()
        print("✅ Voucher created with ID:", voucher.id)

        if remarks:
            voucher.remarks = remarks
            voucher.save()
            print(f"✏️ Saved invoice remarks: {remarks}")

        # ✅ Save line items
        items = request.data.get('items', [])
        print(f"📦 Received {len(items)} line-items:", items)

        created_ids = []
        for idx, item in enumerate(items, start=1):
            # remove any stray 'remarks' so it won’t trigger a null-column error
            item.pop('remarks', None)
            payload = {
                'voucher': voucher.id,  # must use 'voucher' not 'voucher_id'
                'item_name': item['product'],
                'qty': item['quantity'],
                'rate': item['price'],
                'discount': item.get('discount_amt', 0),
                'gst': item.get('gst_pct', 0),
                'unit': item.get('unit'),
                'notes':item.get('notes', ''),
                
            }
            print(f"   → Creating VoucherItem #{idx} payload:", payload)
            vi_ser = VoucherItemSerializer(data=payload)
            if vi_ser.is_valid():
                vi = vi_ser.save()
                created_ids.append(vi.id)
                print(f"   ✔ Item#{idx} ID: {vi.id}")
            else:
                print(f"   ❌ Item#{idx} validation errors:", vi_ser.errors)

        print("📝 All VoucherItems created:", created_ids)

        # ✅ Return full voucher response
        response_data = VoucherSerializer(voucher).data
        print("📤 Returning full payload:", response_data)
        return Response(response_data, status=status.HTTP_201_CREATED)

    except Exception as e:
        print("🔥 Exception in Sales Voucher Creation:", str(e))
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


    

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ensure_payment_ledgers_view(request, company_id):
    """
    POST body: { "name": "<supplier name>" }
    Returns JSON:
       {
         "purchase_ledger_id": <ledger for expense/purchase>,
         "gst_ledger_id":      <ledger for GST input>,
         "supplier_ledger_id": <ledger for Accounts Payable>
       }
    """
    try:
        print("📥 Incoming ensure-payment-ledgers POST data:", request.data)
        supplier_name = request.data.get('name')
        if not supplier_name:
            return Response({"error": "Supplier name is required."}, status=400)

        # reuse your existing purchase-ledgers util:
        from .utils import ensure_purchase_ledgers
        ledger_ids = ensure_purchase_ledgers(company_id, supplier_name)
        print("🧾 ensure_payment_ledgers util returned:", ledger_ids)

        return Response({
            "purchase_ledger_id": ledger_ids['purchase'],
            "gst_ledger_id":      ledger_ids['gst'],
            "supplier_ledger_id": ledger_ids['supplier'],
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print("🔥 Error in ensure_payment_ledgers_view:", str(e))
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# Create Purchase



from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from vouchers.models import Voucher, VoucherItem
from vouchers.serializers import VoucherSerializer, VoucherItemSerializer
from vouchers.utils import generate_voucher_number, ensure_purchase_ledgers


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

        # ✅ Generate voucher number
        data['voucher_number'] = generate_voucher_number("PURCHASE", company_id)

        # ✅ Inject correct ledger IDs into entries
        for i, entry in enumerate(data['entries']):
            if i == 0:
                data['entries'][i]['ledger'] = ledger_ids['purchase']
            elif i == 1:
                data['entries'][i]['ledger'] = ledger_ids['gst']
            elif i == 2:
                data['entries'][i]['ledger'] = ledger_ids['supplier']

        print(f"📊 Final Entries with Ledger IDs: {data['entries']}")

        # ✅ Create and save voucher
        serializer = VoucherSerializer(data=data)
        if not serializer.is_valid():
            print("❌ Validation Errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        voucher = serializer.save()
        print("✅ Voucher created with ID:", voucher.id)

        # ✅ Save line items
        items = request.data.get('items', [])
        print(f"📦 Received {len(items)} line-items:", items)

        created_ids = []
        for idx, item in enumerate(items, start=1):
            payload = {
                'voucher': voucher.id,  # must use 'voucher' not 'voucher_id'
                'item_name': item['product'],
                'qty': item['quantity'],
                'rate': item['price'],
                'discount': item.get('discount_amt', 0),
                'gst': item.get('gst_pct', 0),
                'unit': item.get('unit')
            }
            print(f"   → Creating VoucherItem #{idx} payload:", payload)
            vi_ser = VoucherItemSerializer(data=payload)
            if vi_ser.is_valid():
                vi = vi_ser.save()
                created_ids.append(vi.id)
                print(f"   ✔ Item#{idx} ID: {vi.id}")
            else:
                print(f"   ❌ Item#{idx} validation errors:", vi_ser.errors)

        print("📝 All VoucherItems created:", created_ids)

        # ✅ Return full voucher response
        response_data = VoucherSerializer(voucher).data
        print("📤 Returning full payload:", response_data)
        return Response(response_data, status=status.HTTP_201_CREATED)

    except Exception as e:
        print("🔥 Exception in Purchase Voucher Creation:", str(e))
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# Expense 
from decimal import Decimal
import traceback

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .serializers import VoucherSerializer
from .utils import ensure_expense_ledgers, generate_voucher_number
from accounting.models import LedgerAccount

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_expense_voucher(request, company_id):
    """
    Create an Expense Voucher with multiple items, optional GST,
    and direct/indirect routing. Posts:
      - Debit Expense ledger for each line's full amount
      - Debit GST Payable for each line's GST amount
      - Credit Supplier ledger for the gross total
    """
    print("\n📈 Expense Voucher API Called")
    try:
        # 1. Prepare base data
        data = request.data.copy()
        data['company'] = company_id
        data['voucher_type'] = 'EXPENSE'
        print("📦 Raw Payload:", data)

        # 2. Extract supplier name
        ref = data.get('reference', '').strip()
        if ' to ' in ref:
            party_name = ref.split(' to ', 1)[1].strip()
        else:
            party_name = ref.replace('Expense', '').strip()
        print(f"👤 Expense Party Name Extracted: {party_name}")

        # 3. Validate items & compute per-line GST
        raw_items = data.get('items', [])
        items = []
        for it in raw_items:
            desc = it.get('description', '').strip()
            amt  = Decimal(str(it.get('amount', 0)))
            rate = Decimal(str(it.get('gst', 0)))
            if desc and amt > 0:
                gst_amt = (amt * rate / 100).quantize(Decimal('0.01'))
                items.append({
                    'description': desc,
                    'amount':      amt,
                    'gst_rate':    rate,
                    'gst_amount':  gst_amt,
                    'notes':       it.get('notes', '')
                })
        if not items:
            return Response({'error': 'No valid expense items'}, status=status.HTTP_400_BAD_REQUEST)
        print(f"📝 Valid Line-items Count: {len(items)}")

        # 4. Totals
        total_amount = sum(it['amount']     for it in items)
        total_gst    = sum(it['gst_amount'] for it in items)
        gross_total  = (total_amount + total_gst).quantize(Decimal('0.01'))
        print(f"📝 Total Amount (sum of lines): ₹{total_amount}")
        print(f"💸 Total GST (sum of GST): ₹{total_gst}")
        print(f"💰 Gross Total (to pay): ₹{gross_total}")

        # 5. Expense classification
        expense_type = data.get('expense_type', 'INDIRECT')
        print(f"🏷️ Expense Type Chosen: {expense_type}")

        # 6. Build journal entries
        entries = []
        party_ledger_id = None
        for line in items:
            # ensure ledgers for this line
            ledgers = ensure_expense_ledgers(
                company_id,
                party_name,
                line['description'],
                expense_type
            )
            print(f"🔍 Ensured Ledgers for '{line['description']}':", ledgers)

            # debit full expense amount
            entries.append({
                'ledger':  ledgers['expense'],
                'is_debit': True,
                'amount':   str(line['amount'].quantize(Decimal('0.01')))
            })
            # debit GST Payable for the gst portion
            if line['gst_amount'] > 0:
                entries.append({
                    'ledger':  ledgers['gst'],
                    'is_debit': True,
                    'amount':   str(line['gst_amount'])
                })
            # remember the party ledger
            party_ledger_id = ledgers['party']

        # credit supplier for gross
        entries.append({
            'ledger':  party_ledger_id,
            'is_debit': False,
            'amount':   str(gross_total)
        })
        print("🧾 Final Computed Entries:", entries)

        # 7. Assign voucher number
        voucher_number = generate_voucher_number('EXPENSE', company_id)
        data['voucher_number'] = voucher_number
        print(f"🔢 Assigned Voucher Number: {voucher_number}")

        # 8. Attach entries & save
        data['entries'] = entries
        serializer = VoucherSerializer(data=data)
        if not serializer.is_valid():
            print("❌ Validation Errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        voucher = serializer.save()
        print("✅ Expense Voucher Saved:", serializer.data)

        # 9. Update ledger balances
        print("🔄 Updating Ledger Balances...")
        for e in entries:
            amt = Decimal(e['amount'])
            ledger = LedgerAccount.objects.get(id=e['ledger'])
            ledger.balance = ledger.balance + amt if e['is_debit'] else ledger.balance - amt
            ledger.save()
            print(f"🔁 Ledger Updated: {ledger.name} => ₹{ledger.balance}")

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as exc:
        print("🔥 Exception in Expense Voucher Creation:", str(exc))
        traceback.print_exc()
        return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)





    


    # Income voucher
from decimal import Decimal
import traceback

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .serializers import VoucherSerializer
from .utils import ensure_income_ledgers, generate_voucher_number
from accounting.models import LedgerAccount

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_income_voucher(request, company_id):
    """
    Create an Income Voucher with multiple items, optional GST,
    and direct/indirect routing. Posts:
      - Credit Income ledger for each line's amount
      - Credit GST Receivable for each line's GST amount
      - Debit Customer ledger for the gross total
    """
    print("\n📈 Income Voucher API Called")
    try:
        # 1. Prepare base data
        data = request.data.copy()
        data['company'] = company_id
        data['voucher_type'] = 'INCOME'
        print("📦 Raw Payload:", data)

        # 2. Extract party name
        ref = data.get('reference', '').strip()
        party_name = ref.replace('Income from ', '').strip() or 'Unnamed Party'
        print(f"👤 Income Party Name Extracted: {party_name}")

        # 3. Validate items & compute per-line GST
        raw_items = data.get('items', [])
        items = []
        for it in raw_items:
            desc = it.get('description', '').strip()
            amt  = Decimal(str(it.get('amount', 0)))
            rate = Decimal(str(it.get('gst', 0)))
            if desc and amt > 0:
                gst_amt = (amt * rate / 100).quantize(Decimal('0.01'))
                items.append({
                    'description': desc,
                    'amount':      amt,
                    'gst_rate':    rate,
                    'gst_amount':  gst_amt,
                    'notes':       it.get('notes', '')
                })
        if not items:
            return Response({'error': 'No valid income items'}, status=status.HTTP_400_BAD_REQUEST)
        print(f"📝 Valid Line-items Count: {len(items)}")

        # 4. Totals
        total_amount = sum(it['amount']     for it in items)
        total_gst    = sum(it['gst_amount'] for it in items)
        gross_total  = (total_amount + total_gst).quantize(Decimal('0.01'))
        print(f"💰 Total Amount: ₹{total_amount}")
        print(f"💸 Total GST:    ₹{total_gst}")
        print(f"🧾 Gross Total:  ₹{gross_total}")

        # 5. Income classification
        income_type = data.get('income_type', 'DIRECT')
        print(f"🏷️ Income Type Chosen: {income_type}")

        # 6. Build journal entries
        entries = []
        party_ledger_id = None

        for line in items:
            # ensure ledgers for this line
            ledgers = ensure_income_ledgers(
                company_id,
                party_name,
                line['description'],
                income_type
            )
            print(f"🌟 Ensured Ledgers for '{line['description']}':", ledgers)

            # credit Income ledger
            entries.append({
                'ledger':   ledgers['income'],
                'is_debit': False,
                'amount':   str(line['amount'].quantize(Decimal('0.01')))
            })
            # credit GST Receivable if applicable
            if line['gst_amount'] > 0:
                entries.append({
                    'ledger':   ledgers['gst'],
                    'is_debit': False,
                    'amount':   str(line['gst_amount'])
                })

            # remember the party ledger
            party_ledger_id = ledgers['party']

        # 7. Debit party for gross total
        entries.append({
            'ledger':   party_ledger_id,
            'is_debit': True,
            'amount':   str(gross_total)
        })
        print("🧾 Final Computed Entries:", entries)

        # 8. Assign voucher number & serialize
        voucher_number = generate_voucher_number('INCOME', company_id)
        data['voucher_number'] = voucher_number
        print(f"🔢 Assigned Voucher Number: {voucher_number}")

        data['entries'] = entries
        serializer = VoucherSerializer(data=data)
        if not serializer.is_valid():
            print("❌ Validation Errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        voucher = serializer.save()
        print("✅ Income Voucher Saved:", serializer.data)

        # 9. Update ledger balances
        print("🔄 Updating Ledger Balances...")
        for e in entries:
            amt = Decimal(e['amount'])
            ledger = LedgerAccount.objects.get(id=e['ledger'])
            ledger.balance = ledger.balance + amt if e['is_debit'] else ledger.balance - amt
            ledger.save()
            print(f"🔁 Ledger Updated: {ledger.name} => ₹{ledger.balance}")

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as exc:
        print("🔥 Exception in Income Voucher Creation:", str(exc))
        traceback.print_exc()
        return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)









# from rest_framework.decorators import api_view, permission_classes
# backend/vouchers/views.py

from decimal import Decimal
from django.db.models.functions import Coalesce

import traceback

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from accounting.models import LedgerAccount, AccountGroup
from vouchers.models import Voucher
from vouchers.serializers import VoucherSerializer
from vouchers.utils import (
    ensure_receipt_ledgers,
    ensure_sales_ledgers,   # make sure this exists in your utils
    generate_voucher_number
)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_receipt_voucher(request, company_id):
    print("\n📥 Receipt Voucher API Called")

    try:
        # 0) Copy incoming JSON
        data = request.data.copy()
        data['company'] = company_id
        data['voucher_type'] = 'RECEIPT'

        # 1) Pull out the “against” invoice ID and keep it in data
        against_id = data.get('against_voucher')
        data['against_voucher'] = against_id
        print(f"🔗 Applying against_voucher ID: {against_id}")

        print("📦 Raw Payload:", data)

        # 2) Extract Customer Name from the reference string
        customer_name = (
            data.get("reference", "")
                .replace("Received from ", "")
                .strip()
            or "Unnamed Customer"
        )
        print(f"👤 Customer Name Extracted: {customer_name}")

        # 3) Ensure receipt‐side ledgers (Debtor & Bank)
        ledger_ids = ensure_receipt_ledgers(company_id, customer_name)
        print("💳 Ensured Receipt Ledgers:", ledger_ids)

        # 4) Which payment mode? (cash vs bank)
        payment_mode = data.get("payment_mode", "").lower()
        print(f"💰 Payment Mode selected: {payment_mode}")

        # 5) Replace the two placeholder-ledgers in entries:
        for i, entry in enumerate(data.get("entries", [])):
            if entry['ledger'] is None:
                if entry['is_debit']:
                    # debit side → cash or bank
                    if payment_mode == "cash":
                        cash_ledger = LedgerAccount.objects.filter(
                            name__iexact="Cash", company=company_id
                        ).first()
                        if not cash_ledger:
                            # create Cash‐in‐Hand group if needed
                            group = AccountGroup.objects.filter(
                                group_name__icontains="Cash", company=company_id
                            ).first()
                            if not group:
                                group = AccountGroup.objects.create(
                                    group_name="Cash-in-Hand",
                                    nature="Asset",
                                    company_id=company_id
                                )
                            cash_ledger = LedgerAccount.objects.create(
                                name="Cash",
                                opening_balance=0,
                                opening_balance_type="Dr",
                                account_group=group,
                                company_id=company_id,
                                balance=0
                            )
                            print(f"✅ New Cash ledger created: {cash_ledger.id}")
                        data['entries'][i]['ledger'] = cash_ledger.id
                        print("💵 Assigned 'Cash' ledger for receipt.")
                    else:
                        data['entries'][i]['ledger'] = ledger_ids['bank']
                        print("🏦 Assigned 'Bank' ledger for receipt.")
                else:
                    # credit side → either apply to sales ledger or sundry debtors
                    if against_id:
                        sales_ids = ensure_sales_ledgers(company_id, customer_name)
                        data['entries'][i]['ledger'] = sales_ids['sales']
                        print(f"📄 Applied against sale → ledger {sales_ids['sales']}")
                    else:
                        data['entries'][i]['ledger'] = ledger_ids['customer']
                        print("👤 Assigned 'Customer' ledger for credit.")

        # 6) Voucher numbering
        data['voucher_number'] = generate_voucher_number("RECEIPT", company_id)

        # 7) Validate & save via serializer (which handles against_voucher)
        serializer = VoucherSerializer(data=data)
        if not serializer.is_valid():
            print("❌ Validation Errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        voucher = serializer.save()
        print("✅ Receipt Voucher saved:", serializer.data)

        # 8) Update ledger balances
        print("🔄 Updating Ledger Balances...")
        for entry in data.get("entries", []):
            try:
                ledger = LedgerAccount.objects.get(id=entry['ledger'])
                amt = Decimal(entry['amount'])
                ledger.balance = ledger.balance + amt if entry['is_debit'] else ledger.balance - amt
                ledger.save()
                print(f"🔁 Ledger Updated: {ledger.name} => ₹{ledger.balance}")
            except Exception as e:
                print("⚠️ Error updating ledger:", e)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as exc:
        print("🔥 Exception in Receipt Voucher Creation:", str(exc))
        traceback.print_exc()
        return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



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



# Payment Voucher

from decimal import Decimal
import traceback

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .serializers import VoucherSerializer
from .utils import ensure_purchase_ledgers, generate_voucher_number
from accounting.models import LedgerAccount, AccountGroup

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_voucher(request, company_id):
    """
    Create a Payment Voucher:
      - Debit Supplier ledger (clearing the payable)
      - Credit Cash/Bank ledger
      - Optionally link back to a purchase invoice via against_voucher
    """
    print("\n📤 Payment Voucher API Called")
    try:
        # 0) Prepare incoming data
        data = request.data.copy()
        data['company']      = company_id
        data['voucher_type'] = 'PAYMENT'
        # 0.1) Carry through the invoice ID being paid, if provided
        data['against_voucher'] = data.get('against_voucher')
        print("📦 Raw Payload:", data)

        # 1) Extract supplier name and payment mode
        ref = data.get('reference', '').strip()
        supplier_name = ref.replace('Payment to ', '').strip() or 'Unnamed Supplier'
        payment_mode  = data.get('payment_mode', '').lower()
        print(f"👤 Supplier: {supplier_name}")
        print(f"💰 Payment Mode: {payment_mode}")

        # 2) Ensure supplier / purchase ledgers
        ledger_ids = ensure_purchase_ledgers(company_id, supplier_name)
        supplier_ledger_id = ledger_ids['supplier']
        print("🧾 Supplier Ledger ID:", supplier_ledger_id)

        # 3) Determine payment ledger (Cash or Bank)
        if payment_mode == 'cash':
            payment_ledger = LedgerAccount.objects.filter(
                name__iexact='Cash', company=company_id
            ).first()
            if not payment_ledger:
                # create Cash-in-Hand group if missing
                cash_group = AccountGroup.objects.filter(
                    group_name__icontains='Cash', company=company_id
                ).first()
                if not cash_group:
                    cash_group = AccountGroup.objects.create(
                        group_name='Cash-in-Hand',
                        nature='Asset',
                        company_id=company_id
                    )
                payment_ledger = LedgerAccount.objects.create(
                    name='Cash',
                    opening_balance=0,
                    opening_balance_type='Dr',
                    account_group=cash_group,
                    company_id=company_id,
                    balance=0
                )
                print("✅ Created Cash ledger ID:", payment_ledger.id)
            payment_ledger_id = payment_ledger.id
            print("💵 Using Cash ledger ID:", payment_ledger_id)
        else:
            payment_ledger = LedgerAccount.objects.filter(
                account_group__group_name__icontains='Bank', company=company_id
            ).first()
            if not payment_ledger:
                raise Exception('No Bank ledger found for company')
            payment_ledger_id = payment_ledger.id
            print("🏦 Using Bank ledger ID:", payment_ledger_id)

        # 4) Build entries: expect exactly two entries in data
        entries = data.get('entries', [])
        if len(entries) != 2:
            return Response(
                {'error': 'Expected 2 entries for payment'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Debit supplier ledger, Credit cash/bank ledger
        entries[0]['ledger']   = supplier_ledger_id
        entries[0]['is_debit'] = True
        entries[1]['ledger']   = payment_ledger_id
        entries[1]['is_debit'] = False
        print("📊 Final Entries with Ledger IDs:", entries)

        # 5) Assign voucher number
        voucher_number = generate_voucher_number('PAYMENT', company_id)
        data['voucher_number'] = voucher_number
        print("🔢 Voucher Number:", voucher_number)

        # 6) Serialize & save (serializer will handle against_voucher)
        serializer = VoucherSerializer(data=data)
        if not serializer.is_valid():
            print("❌ Validation Errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        voucher = serializer.save()
        print("✅ Payment Voucher saved:", serializer.data)

        # 7) Update ledger balances
        print("🔄 Updating Ledger Balances...")
        for e in entries:
            amt = Decimal(str(e['amount']))
            ledger = LedgerAccount.objects.get(id=e['ledger'])
            ledger.balance = ledger.balance + amt if e['is_debit'] else ledger.balance - amt
            ledger.save()
            print(f"🔁 Ledger Updated: {ledger.name} => ₹{ledger.balance}")

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as ex:
        print("🔥 Exception in Payment Voucher Creation:", str(ex))
        traceback.print_exc()
        return Response({'error': str(ex)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# for quotation and purchase order form
# backend/vouchers/serializers.py

# backend/vouchers/views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .serializers import QuotationSerializer, PurchaseOrderSerializer

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_quotation(request, company_id):
    data = request.data.copy()
    data['company'] = company_id
    data['reference'] = data.get('reference','').strip()
    serializer = QuotationSerializer(data=data)
    if serializer.is_valid():
        quote = serializer.save()
        return Response(QuotationSerializer(quote).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_purchase_order(request, company_id):
    data = request.data.copy()
    data['company'] = company_id
    data['reference'] = data.get('reference','').strip()
    serializer = PurchaseOrderSerializer(data=data)
    if serializer.is_valid():
        po = serializer.save()
        return Response(PurchaseOrderSerializer(po).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




# debit note and credit note
# backend/vouchers/views.py

from decimal import Decimal
import traceback

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .serializers import VoucherSerializer
from accounting.models import LedgerAccount
from .utils import generate_voucher_number


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_debit_note_voucher(request, company_id):
    """
    Create a Debit Note:
      - Line 1: Debit ↓
      - Line 2: Credit ↑
    """
    print("\n📄 Debit Note API Called")
    try:
        data = request.data.copy()
        data.update({
            'company': company_id,
            'voucher_type': 'DEBIT_NOTE',
            'date': data.get('date'),          # assume date passed
            'reference': data.get('reference', ''),
        })
        entries = data.pop('entries', [])
        print("📦 Raw Payload:", data, "Entries:", entries)

        # assign voucher number
        data['voucher_number'] = generate_voucher_number('DEBIT_NOTE', company_id)
        data['entries'] = entries

        serializer = VoucherSerializer(data=data)
        if not serializer.is_valid():
            print("❌ Validation Errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        voucher = serializer.save()
        print("✅ Debit Note Saved:", serializer.data)

        # update ledger balances
        for e in entries:
            amt = Decimal(str(e['amount']))
            ledger = LedgerAccount.objects.get(id=e['ledger'])
            ledger.balance += amt if e['is_debit'] else -amt
            ledger.save()
            print(f"🔁 Ledger Updated: {ledger.name} => ₹{ledger.balance}")

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as exc:
        print("🔥 Exception in Debit Note Creation:", exc)
        traceback.print_exc()
        return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_credit_note_voucher(request, company_id):
    """
    Create a Credit Note:
      - Line 1: Credit ↑
      - Line 2: Debit ↓
    """
    print("\n📃 Credit Note API Called")
    try:
        data = request.data.copy()
        data.update({
            'company': company_id,
            'voucher_type': 'CREDIT_NOTE',
            'date': data.get('date'),
            'reference': data.get('reference', ''),
        })
        entries = data.pop('entries', [])
        print("📦 Raw Payload:", data, "Entries:", entries)

        # assign voucher number
        data['voucher_number'] = generate_voucher_number('CREDIT_NOTE', company_id)
        data['entries'] = entries

        serializer = VoucherSerializer(data=data)
        if not serializer.is_valid():
            print("❌ Validation Errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        voucher = serializer.save()
        print("✅ Credit Note Saved:", serializer.data)

        # update ledger balances
        for e in entries:
            amt = Decimal(str(e['amount']))
            ledger = LedgerAccount.objects.get(id=e['ledger'])
            ledger.balance += amt if e['is_debit'] else -amt
            ledger.save()
            print(f"🔁 Ledger Updated: {ledger.name} => ₹{ledger.balance}")

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as exc:
        print("🔥 Exception in Credit Note Creation:", exc)
        traceback.print_exc()
        return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



#Delete handler of voucher in ledgers

# views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from vouchers.models import Voucher
import logging

logger = logging.getLogger(__name__)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_voucher(request, company_id, voucher_id):
    user = request.user
    logger.info(f"🧨 DELETE voucher attempt by user: {user} | Company ID: {company_id} | Voucher ID: {voucher_id}")

    try:
        voucher = Voucher.objects.get(id=voucher_id, company_id=company_id)
        voucher_number = voucher.voucher_number
        voucher_type = voucher.voucher_type
        logger.info(f"🔍 Found voucher ID {voucher.id} | Type: {voucher_type} | Number: {voucher_number}")

        # Check for linked vouchers (e.g., against_voucher)
        dependent_vouchers = Voucher.objects.filter(against_voucher=voucher)
        if dependent_vouchers.exists():
            linked_ids = list(dependent_vouchers.values_list('id', flat=True))
            logger.warning(f"⚠️ Cannot delete voucher {voucher.id} — linked vouchers exist: {linked_ids}")
            return Response({
                'error': 'Cannot delete. Linked vouchers exist.',
                'linked_voucher_ids': linked_ids
            }, status=400)

        voucher.delete()
        logger.info(f"✅ Voucher ID {voucher.id} deleted successfully.")
        return Response({
            'success': True,
            'voucher_number': voucher_number,
            'voucher_type': voucher_type
        }, status=200)

    except Voucher.DoesNotExist:
        logger.error(f"❌ Voucher ID {voucher_id} not found for deletion.")
        return Response({'error': 'Voucher not found'}, status=404)
