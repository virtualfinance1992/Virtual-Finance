import traceback
import django.db.models as m
import django.db.models.functions as dbfunc
import traceback
from decimal import Decimal

from decimal import Decimal

from django.db.models import Q,Sum, Value, Case, When, F, ExpressionWrapper, DecimalField, FloatField
import django.db.models.functions as dbfunc
from django.utils.dateparse import parse_date

from rest_framework.decorators import api_view, permission_classes   # ← add this
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from vouchers.models import VoucherItem

from django.db.models.functions import Coalesce

REPORT_KEYS = {
    'sales-register', 'purchase-register', 'day-book',
    'balance-sheet', 'profit-and-loss', 'cash-flow', 'supplier-unpaid','customer-unpaid','balance-sheet', 'profit-and-loss', 'cash-flow',
}

class ReportView(APIView):
    def get(self, request, company_id, report_key):
        key = report_key.lower()
        print(f"\n📥 Report requested: {key} for company {company_id}")

        if key not in REPORT_KEYS:
            print(f"❌ Unknown report key: {key}")
            return Response({'error': f'Unknown report key: {report_key}'}, status=404)
        
            # ───────────────── Financia­l Statements ────────────────
        if key == 'balance-sheet':
            return balance_sheet(request, company_id)

        if key == 'profit-and-loss' or key == 'profit-loss':
            return profit_and_loss(request, company_id)

        if key == 'cash-flow' or key == 'cashflow':
            return cash_flow(request, company_id)
    # ────────────────────────────────────────────────────────


        # Extract date filters
        date_filter = {}
        if 'from' in request.GET and 'to' in request.GET:
            start = request.GET['from']
            end = request.GET['to']
            date_filter = {
                'voucher__date__gte': parse_date(start),
                'voucher__date__lte': parse_date(end),
            }
            print(f"🔎 Date filter: {start} → {end}")
        elif 'fy' in request.GET:
            fy = int(request.GET['fy'])
            date_filter = {'voucher__date__year': fy}
            print(f"🔎 Fiscal year filter: {fy}")
        elif 'quarter' in request.GET and 'year' in request.GET:
            q = request.GET['quarter']
            y = int(request.GET['year'])
            m1, m2 = {'Q1': (1, 3), 'Q2': (4, 6), 'Q3': (7, 9), 'Q4': (10, 12)}.get(q, (1, 12))
            date_filter = {
                'voucher__date__year': y,
                'voucher__date__month__gte': m1,
                'voucher__date__month__lte': m2,
            }
            print(f"🔎 Quarter filter: {q} {y}")
        else:
            print("⚠️ No date filter applied — pulling all data")



                # === CUSTOMER UNPAID VOUCHERS ===
        if key == 'customer-unpaid':
            try:
                # 1) Parse parameters
                customer_id = int(request.GET.get('customer_id', 0))
                raw_types   = request.GET.get('voucher_type', '')
                types = (
                    [t.strip().upper() for t in raw_types.split(',')]
                    if raw_types else ['SALES']
                )

                print(f"ℹ️ Report requested: customer-unpaid for company {company_id}")
                print(f"⚠️ No date filter applied — pulling all data")
                print(f"ℹ️ Fetching unpaid vouchers for customer {customer_id}")
                print(f"🔍 Including voucher types: {types}")

                # 2) Candidate invoices
                cand_qs = Voucher.objects.filter(
                    company_id=company_id,
                    voucher_type__in=types
                )
                print(f"📦 Candidate vouchers count: {cand_qs.count()}")

                data = []
                for v in cand_qs:
                    # 3) Total billed to this customer (debit entries)
                    billed_agg = JournalEntry.objects.filter(
                        voucher=v,
                        ledger=customer_id,
                        is_debit=True
                    ).aggregate(
                        total=dbfunc.Coalesce(
                            m.Sum('amount'),
                            m.Value(0),
                            output_field=m.DecimalField(max_digits=14, decimal_places=2)
                        )
                    )
                    billed = billed_agg['total']
                    print(f"   • {v.voucher_number} billed total: {billed}")

                    # 4) Total paid via receipts against this invoice
                    paid_agg = JournalEntry.objects.filter(
                        voucher__voucher_type='RECEIPT',
                        voucher__against_voucher_id=v.id,
                        ledger=customer_id,
                        is_debit=False
                    ).aggregate(
                        total=dbfunc.Coalesce(
                            m.Sum('amount'),
                            m.Value(0),
                            output_field=m.DecimalField(max_digits=14, decimal_places=2)
                        )
                    )
                    paid = paid_agg['total']
                    print(f"   • {v.voucher_number} paid total:  {paid}")

                    # 5) Compute outstanding
                    outstanding = billed - paid
                    if outstanding > 0:
                        print(
                            f"   ✓ {v.voucher_type} {v.voucher_number}: "
                            f"billed={billed:.2f}, paid={paid:.2f}, outstanding={outstanding:.2f}"
                        )
                        data.append({
                            'id':             v.id,
                            'voucher_type':   v.voucher_type,
                            'voucher_number': v.voucher_number,
                            'date':           v.date,
                            'billed':         float(billed),
                            'paid':           float(paid),
                            'outstanding':    float(outstanding),
                        })

                print(f"✅ Returning {len(data)} unpaid customer vouchers")
                return Response(data, status=status.HTTP_200_OK)

            except Exception as e:
                print("🔥 Exception in customer-unpaid report:", str(e))
                traceback.print_exc()
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )


        # === SUPPLIER UNPAID VOUCHERS ===
                # === SUPPLIER UNPAID VOUCHERS ===
                # === SUPPLIER UNPAID VOUCHERS ===
                # === SUPPLIER UNPAID VOUCHERS ===
        if key == 'supplier-unpaid':
            supplier_id = int(request.GET.get('supplier_id', 0))
            raw_types   = request.GET.get('voucher_type', '')
            types = [t.strip().upper() for t in raw_types.split(',')] if raw_types else ['EXPENSE', 'PURCHASE']
            print(f"ℹ️ Fetching unpaid vouchers for supplier {supplier_id}")
            print(f"🔍 Including voucher types: {types}")

            # 1) candidate vouchers
            cand_qs = Voucher.objects.filter(
                company_id=company_id,
                voucher_type__in=types
            )
            print(f"📦 Candidate vouchers count: {cand_qs.count()}")

            data = []
            for v in cand_qs:
                # 2) total billed on this voucher
                billed_agg = JournalEntry.objects.filter(
                    voucher=v,
                    ledger=supplier_id,
                    is_debit=False
                ).aggregate(
                    total=Coalesce(
                        Sum('amount'),
                        Value(0),
                        output_field=DecimalField(max_digits=14, decimal_places=2)
                    )
                )
                billed = billed_agg['total']

                # 3) total paid via Payment vouchers against this voucher
                paid_agg = JournalEntry.objects.filter(
                    voucher__voucher_type='PAYMENT',
                    voucher__against_voucher_id=v.id,
                    ledger=supplier_id,
                    is_debit=True
                ).aggregate(
                    total=Coalesce(
                        Sum('amount'),
                        Value(0),
                        output_field=DecimalField(max_digits=14, decimal_places=2)
                    )
                )
                paid = paid_agg['total']

                outstanding = billed - paid
                if outstanding > 0:
                    print(f"  • {v.voucher_type} {v.voucher_number}: billed={billed:.2f}, paid={paid:.2f}, outstanding={outstanding:.2f}")
                    data.append({
                        'id':             v.id,
                        'voucher_type':   v.voucher_type,
                        'voucher_number': v.voucher_number,
                        'date':           v.date,
                        'billed':         float(billed),
                        'paid':           float(paid),
                        'outstanding':    float(outstanding),
                    })

            print(f"✅ Returning {len(data)} unpaid vouchers")
            return Response(data)


        # === SALES REGISTER ===
        if key == 'sales-register':
            sales_ids = JournalEntry.objects.filter(
                voucher__company_id=company_id,
                voucher__voucher_type='SALES',
                **date_filter
            ).values_list('voucher_id', flat=True).distinct()
            print(f"📦 Sales voucher IDs: {list(sales_ids)}")

            items_qs = VoucherItem.objects.filter(voucher_id__in=sales_ids).select_related('voucher')
            print(f"📦 Found {items_qs.count()} VoucherItems")

            data = items_qs.annotate(
                sale_date=F('voucher__date'),
                invoice_no=F('voucher__voucher_number'),
                party_ref=F('voucher__reference'),
                product_name=F('item_name'),
                quantity=F('qty'),
                unit_name=F('unit'),
                unit_price=F('rate'),
                discount_amt=F('discount'),
                gst_pct=F('gst'),
                net_amount=ExpressionWrapper(
                    F('qty') * F('rate') - F('discount'),
                    output_field=DecimalField(max_digits=14, decimal_places=2)
                ),
                gst_amount=ExpressionWrapper(
                    (F('qty') * F('rate') - F('discount')) * F('gst') / 100,
                    output_field=DecimalField(max_digits=14, decimal_places=2)
                )
            ).annotate(
                total_amount=ExpressionWrapper(F('net_amount') + F('gst_amount'), output_field=DecimalField())
            ).values(
                'sale_date', 'invoice_no', 'party_ref', 'product_name', 'quantity', 'unit_name',
                'unit_price', 'discount_amt', 'gst_pct', 'net_amount', 'gst_amount', 'total_amount'
            ).order_by('sale_date', 'invoice_no')

            print(f"✅ Returning {len(data)} rows for sales register")
            return Response(data)

        # === PURCHASE REGISTER ===
        # ─── PURCHASE REGISTER ──────────────────────────────────────────
        if key == 'purchase-register':
            purchase_voucher_ids = list(
                JournalEntry.objects.filter(
                    voucher__company_id=company_id,
                    voucher__voucher_type='PURCHASE',
                    **date_filter
                ).values_list('voucher_id', flat=True).distinct()
            )
            print(f"📦 Purchase voucher IDs: {purchase_voucher_ids}")

            items_qs = VoucherItem.objects.filter(voucher__id__in=purchase_voucher_ids).select_related('voucher')

            print("📦 Raw VoucherItem count:", items_qs.count())
            print("📋 Sample VoucherItems:", list(items_qs.values()[:5]))

            data = items_qs.annotate(
                purchase_date=F('voucher__date'),
                invoice_no=F('voucher__voucher_number'),
                party_ref=F('voucher__reference'),
                product_name=F('item_name'),
                quantity=F('qty'),
                unit_name=F('unit'),
                unit_price=F('rate'),
                discount_amt=F('discount'),
                gst_pct=F('gst'),
                net_amount=ExpressionWrapper(
                    F('qty') * F('rate') - F('discount'),
                    output_field=DecimalField(max_digits=14, decimal_places=2)
                ),
                gst_amount=ExpressionWrapper(
                    (F('qty') * F('rate') - F('discount')) * F('gst') / 100,
                    output_field=DecimalField(max_digits=14, decimal_places=2)
                ),
                total_amount=ExpressionWrapper(
                    (F('qty') * F('rate') - F('discount')) + ((F('qty') * F('rate') - F('discount')) * F('gst') / 100),
                    output_field=DecimalField(max_digits=14, decimal_places=2)
                )
            ).values(
                'purchase_date', 'invoice_no', 'party_ref',
                'product_name', 'quantity', 'unit_name', 'unit_price',
                'discount_amt', 'gst_pct',
                'net_amount', 'gst_amount', 'total_amount'
            ).order_by('purchase_date', 'invoice_no')

            print("ℹ️ Purchase rows:", len(data))
            return Response(list(data), status=status.HTTP_200_OK)

             


       
        # === DAY BOOK REPORT ===
        # === DAY BOOK REPORT ===
        # Add inside: if key == 'day-book':

        


        if key == 'day-book':
            vouchers = Voucher.objects.filter(
                company_id=company_id,
                **{k.replace('voucher__', ''): v for k, v in date_filter.items()}
            ).order_by('date', 'voucher_number')

            print(f"📘 Found {vouchers.count()} vouchers for Day Book")

            data = []
            total_debit = Decimal('0.00')
            total_credit = Decimal('0.00')
            total_tax = Decimal('0.00')

            for v in vouchers:
                journal_entries = JournalEntry.objects.filter(voucher=v).select_related('ledger')

                for je in journal_entries:
                    ledger_name = je.ledger.name.lower()

                    # ✅ Identify GST or Tax purely by ledger name
                    is_tax = any(keyword in ledger_name for keyword in ['gst', 'tax'])

                    row = {
                        'date': v.date,
                        'voucher_type': v.voucher_type,
                        'voucher_number': v.voucher_number,
                        'reference': v.reference,
                        'ledger_name': je.ledger.name,
                        'debit': '',
                        'credit': '',
                        'tax': ''
                    }

                    if is_tax:
                        row['tax'] = f"{je.amount:.2f}"
                        total_tax += Decimal(je.amount)
                    elif je.is_debit:
                        row['debit'] = f"{je.amount:.2f}"
                        total_debit += Decimal(je.amount)
                    else:
                        row['credit'] = f"{je.amount:.2f}"
                        total_credit += Decimal(je.amount)

                    print("🧾 Entry Row →", row)
                    data.append(row)

            summary_row = {
                'date': 'SUMMARY',
                'voucher_type': '',
                'voucher_number': '',
                'reference': 'Total',
                'ledger_name': '',
                'debit': f"{total_debit:.2f}",
                'credit': f"{total_credit:.2f}",
                'tax': f"{total_tax:.2f}",
                'net': f"{(total_credit - total_debit):.2f}",
                'status': 'Profit' if total_credit > total_debit else 'Loss'
            }

            print("📊 Summary Row →", summary_row)
            data.append(summary_row)

            return Response(data, status=status.HTTP_200_OK)



        
        return Response({'message': 'Report key recognized but not yet implemented.'})
     







#from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Value, Case, When, F, ExpressionWrapper, DecimalField, FloatField
from decimal import Decimal

from vouchers.models import Voucher, JournalEntry


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request, company_id):
    fiscal_year = int(request.GET.get('fy', '2025'))  # Default to 2025 if not passed
    print(f"📊 Dashboard summary requested for company {company_id}, FY {fiscal_year}")

    try:
        base_filter = Q(voucher__company_id=company_id) & Q(voucher__date__year=fiscal_year)

        sales = JournalEntry.objects.filter(base_filter & Q(voucher__voucher_type='SALES') & Q(is_debit=False)).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        purchase = JournalEntry.objects.filter(base_filter & Q(voucher__voucher_type='PURCHASE') & Q(is_debit=True)).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        expense = JournalEntry.objects.filter(base_filter & Q(voucher__voucher_type='EXPENSE') & Q(is_debit=True)).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        income = JournalEntry.objects.filter(base_filter & Q(voucher__voucher_type='INCOME') & Q(is_debit=False)).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        gst_paid = JournalEntry.objects.filter(base_filter & Q(ledger__name__icontains='gst') & Q(is_debit=True)).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        gst_collected = JournalEntry.objects.filter(base_filter & Q(ledger__name__icontains='gst') & Q(is_debit=False)).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        print(f"✅ Totals: Sales={sales}, Purchase={purchase}, Expense={expense}, Income={income}, GST Paid={gst_paid}, GST Collected={gst_collected}")

        return Response({
            'sales': float(sales),
            'purchases': float(purchase),
            'expenses': float(expense),
            'income': float(income),
            'gst_paid': float(gst_paid),
            'gst_collected': float(gst_collected),
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print("🔥 Dashboard summary error:", str(e))
        return Response({'error': str(e)}, status=500)


from rest_framework.decorators import api_view
from rest_framework.response import Response
from inventory_mgmt.models import InventoryItem
from django.db.models import Sum

@api_view(['GET'])
def inventory_pie_data(request, company_id):
    items = (
        InventoryItem.objects
        .filter(company_id=company_id)
        .values('name')
        .annotate(quantity=Sum('quantity'))
        .order_by('-quantity')
    )
    labels = [item['name'] for item in items]
    data = [item['quantity'] for item in items]

    return Response({
        'labels': labels,
        'data': data
    })



# reports/views.py
# reports/views.py
# reports/views.py
# reports/views.py

# reports/views.py

import decimal
import traceback
from decimal import Decimal
from datetime import date

from django.db.models import Sum, F, Case, When, DecimalField, Value
from django.db.models.functions import Coalesce
from rest_framework.response import Response
from rest_framework import status

from vouchers.models import JournalEntry as Entry
from accounting.models import AccountGroup
from .serializers import ProfitLossSerializer, BalanceSheetSerializer, CashFlowSerializer


def parse_dates(request):
    """
    Examine query params in this order:
      1) If 'from' & 'to' are present, use them verbatim (YYYY-MM-DD).
      2) Elif 'fy' is present, interpret it as a financial year:
         → APRIL 1 of fy  to MARCH 31 of (fy+1).
      3) Elif 'quarter' & 'year' are present, map quarter to first/last day.
      4) Otherwise: return (None, None) → no date filtering.
    """
    qs = request.query_params

    # 1) explicit from/to
    frm = qs.get('from')
    to  = qs.get('to')
    if frm and to:
        print(f"[parse_dates] using explicit from/to → {frm} to {to}")
        return frm, to

    # 2) financial year "fy=2025" means Apr 1 2025 → Mar 31 2026
    fy = qs.get('fy')
    if fy:
        try:
            fy_int = int(fy)
            start = date(fy_int,     4,  1).isoformat()   # APR 1, fy
            end   = date(fy_int + 1, 3, 31).isoformat()   # MAR 31, fy+1
            print(f"[parse_dates] using financial year {fy} → {start} to {end}")
            return start, end
        except ValueError:
            print(f"[parse_dates] invalid fy='{fy}', falling back to no dates")
            return None, None

    # 3) quarter + year
    q  = qs.get('quarter')
    yr = qs.get('year')
    if q and yr:
        try:
            yr_int = int(yr)
            quarter_map = {
                'Q1': (1,  3),
                'Q2': (4,  6),
                'Q3': (7,  9),
                'Q4': (10, 12),
            }
            m1, m2 = quarter_map.get(q.upper(), (None, None))
            if m1 and m2:
                start = date(yr_int, m1, 1).isoformat()
                # last day of m2:
                last_day = {
                    1: 31, 2: 28, 3: 31, 4: 30, 5: 31,  6: 30,
                    7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31
                }[m2]
                # adjust February for leap years
                if m2 == 2:
                    if (yr_int % 400 == 0) or (yr_int % 100 != 0 and yr_int % 4 == 0):
                        last_day = 29
                end = date(yr_int, m2, last_day).isoformat()
                print(f"[parse_dates] using quarter {q} {yr} → {start} to {end}")
                return start, end
        except ValueError:
            pass

    # 4) no dates
    print("[parse_dates] no valid date params found; returning (None, None)")
    return None, None



import decimal
import traceback
from decimal import Decimal
from datetime import date

from django.db.models import Sum, F, Case, When, DecimalField
from rest_framework.response import Response
from rest_framework import status

from vouchers.models import JournalEntry as Entry
from accounting.models import AccountGroup
from .serializers import ProfitLossSerializer


def parse_dates(request):
    """
    1) If 'from' & 'to' are passed, use them.
    2) Elif 'fy' is passed, treat fy=2025 as Apr 1, 2025 → Mar 31, 2026
    3) Elif 'quarter' & 'year' are present, map accordingly.
    4) Otherwise, return (None, None).
    """
    qs = request.query_params

    # 1) explicit from/to
    frm = qs.get('from')
    to = qs.get('to')
    if frm and to:
        print(f"[parse_dates] Using explicit from/to → {frm} to {to}")
        return frm, to

    # 2) financial year "fy=2025" → Apr 1 2025 → Mar 31 2026
    fy = qs.get('fy')
    if fy:
        try:
            fy_int = int(fy)
            start = date(fy_int, 4, 1).isoformat()
            end = date(fy_int + 1, 3, 31).isoformat()
            print(f"[parse_dates] Using financial year {fy} → {start} to {end}")
            return start, end
        except ValueError:
            print(f"[parse_dates] Invalid fy='{fy}'; returning (None, None)")
            return None, None

    # 3) quarter + year
    q = qs.get('quarter')
    yr = qs.get('year')
    if q and yr:
        try:
            yr_int = int(yr)
            quarter_map = {
                'Q1': (1, 3),
                'Q2': (4, 6),
                'Q3': (7, 9),
                'Q4': (10, 12),
            }
            m1, m2 = quarter_map.get(q.upper(), (None, None))
            if m1 and m2:
                start = date(yr_int, m1, 1).isoformat()
                last_day = {
                    1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30,
                    7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31
                }[m2]
                # adjust February for leap years
                if m2 == 2 and ((yr_int % 400 == 0) or (yr_int % 100 != 0 and yr_int % 4 == 0)):
                    last_day = 29
                end = date(yr_int, m2, last_day).isoformat()
                print(f"[parse_dates] Using quarter {q} {yr} → {start} to {end}")
                return start, end
        except ValueError:
            pass

    # 4) no dates
    print("[parse_dates] No valid date params found; returning (None, None)")
    return None, None


import decimal
import traceback

from django.db.models import F, Sum, Case, When
from django.db.models.fields import DecimalField
from rest_framework.response import Response
from rest_framework import status

from accounting.models import AccountGroup
from vouchers.models import JournalEntry as Entry   # <-- adjust import if needed
from .serializers import ProfitLossSerializer


def profit_and_loss(request, company_id):
    """
    GET /api/reports/<company_id>/profit-loss/?from=YYYY-MM-DD&to=YYYY-MM-DD
      OR
    GET /api/reports/<company_id>/profit-loss/?fy=2025

    Returns a fully broken‐out P&L.  Each section only sums the “correct side”
    of each ledger group to avoid debits cancelling credits.
    """
    try:
        # ─── 1) Parse from/to dates (or financial year) ───
        start, end = parse_dates(request)
        print(f"[profit_and_loss] Called with company_id={company_id}, from={start}, to={end}")

        # ─── 2) Base QuerySet: all JournalEntry (for this company/date range) ───
        base_qs = Entry.objects.filter(
            voucher__company_id=company_id,
            voucher__date__range=[start, end]
        ).select_related('voucher', 'ledger__account_group')
        total_entries = base_qs.count()
        print(f"[profit_and_loss] Fetched {total_entries} JournalEntry records total")

        # ─── 3) SALES (voucher_type='SALES') ───
        sales_entries = base_qs.filter(voucher__voucher_type='SALES')
        print(f"[profit_and_loss] Total SALES JournalEntry records: {sales_entries.count()}")

        # 3.1) “Sales Accounts” top‐line = sum of credits under group="Sales Accounts"
        total_sales_amount = decimal.Decimal("0.00")
        print("[profit_and_loss]   ─── Computing Sales Accounts total (only credits under 'Sales Accounts') ───")
        for idx, e in enumerate(sales_entries, start=1):
            grp_name = e.ledger.account_group.group_name
            ledger_name = e.ledger.name
            amt = e.amount.quantize(decimal.Decimal("0.01"))
            is_debit = e.is_debit

            print(
                f"[profit_and_loss]    [{idx:>2}] Voucher=SALES "
                f"| Group={grp_name:<20} "
                f"| Ledger={ledger_name:<15} "
                f"| Amount={amt:>8} "
                f"| is_debit={is_debit}"
            )

            # Include only if group="Sales Accounts" AND is_debit=False (i.e. credit to Sales Accounts)
            if (grp_name == "Sales Accounts") and (not is_debit):
                total_sales_amount += e.amount
                print(f"[profit_and_loss]       → INCLUDED for Sales Accounts: +{amt}")
            else:
                print(f"[profit_and_loss]       → SKIPPED for Sales Accounts")

        total_sales_amount = total_sales_amount.quantize(decimal.Decimal("0.01"))
        print(f"[profit_and_loss] Total Sales (Sales Accounts) = {total_sales_amount}")

        sales_dict = {
            "group":   "Sales Accounts",
            "amount":  total_sales_amount,
            "entries": []    # No voucher‐level drill‐down here; we show party‐wise next
        }

        # 3.2) SALES BY PARTY: only the debit side (is_debit=True) under group="Sundry Debtors"
        party_agg = (
            sales_entries
            .filter(
                is_debit=True,
                ledger__account_group__group_name="Sundry Debtors"
            )
            .values(party=F("ledger__name"))
            .annotate(
                total=Sum(
                    F("amount"),
                    output_field=DecimalField(max_digits=14, decimal_places=2)
                )
            )
        )

        sales_by_party = []
        print("[profit_and_loss]   ─── Computing Sales by Party (debits under 'Sundry Debtors') ───")
        for row in party_agg:
            party_name = row["party"] or "Unknown Party"
            amt = (row["total"] or decimal.Decimal("0.00")).quantize(decimal.Decimal("0.01"))
            sales_by_party.append({
                "party": str(party_name),
                "amount": amt
            })
            print(f"[profit_and_loss]   Sales Party '{party_name}' → {amt}")

        if not sales_by_party:
            print("[profit_and_loss]   No party‐wise sales returned.")

        # ─── 4) OTHER INCOME (voucher_type='INCOME') ───
        other_income_entries = base_qs.filter(voucher__voucher_type='INCOME')
        print(f"[profit_and_loss] Total INCOME JournalEntry records: {other_income_entries.count()}")

        other_income_list = []
        total_other_income = decimal.Decimal("0.00")
        if other_income_entries.exists():
            # Group by account_group, but only keep credits (is_debit=False)
            inc_groups = (
                other_income_entries
                .values(group=F("ledger__account_group__group_name"))
                .annotate(
                    amount=Sum(
                        Case(
                            When(is_debit=False, then=F("amount")),
                            When(is_debit=True, then=F("amount") * decimal.Decimal("-1")),
                            output_field=DecimalField(max_digits=14, decimal_places=2)
                        )
                    )
                )
            )

            for g in inc_groups:
                grp_name = g["group"] or "Unknown Income Group"
                amt = (g["amount"] or decimal.Decimal("0.00")).quantize(decimal.Decimal("0.01"))
                if amt != decimal.Decimal("0.00"):
                    group_entries = other_income_entries.filter(
                        ledger__account_group__group_name=grp_name
                    )
                    entry_list = []
                    for e in group_entries:
                        signed_amt = (e.amount if not e.is_debit else e.amount * decimal.Decimal("-1")).quantize(decimal.Decimal("0.01"))
                        entry_list.append({
                            "date":           e.voucher.date,
                            "voucher_number": e.voucher.voucher_number,
                            "ledger_name":    e.ledger.name,
                            "is_debit":       e.is_debit,
                            "amount":         e.amount,
                            "signed_amount":  signed_amt
                        })
                    other_income_list.append({
                        "group":   grp_name,
                        "amount":  amt,
                        "entries": entry_list
                    })
                    total_other_income += amt
                    print(f"[profit_and_loss]   Other Income '{grp_name}': {amt} ({len(entry_list)} rows)")

        total_other_income = total_other_income.quantize(decimal.Decimal("0.01"))
        print(f"[profit_and_loss] Total OTHER INCOME: {total_other_income}")

        # ─── 5) COGS (Purchase Accounts): voucher_type='PURCHASE' ───
        purchase_entries = base_qs.filter(voucher__voucher_type='PURCHASE')
        print(f"[profit_and_loss] Total PURCHASE JournalEntry records: {purchase_entries.count()}")

        total_cogs_amount = decimal.Decimal("0.00")
        cogs_entry_list = []
        for e in purchase_entries:
            grp_name = e.ledger.account_group.group_name
            ledger_name = e.ledger.name
            amt = e.amount.quantize(decimal.Decimal("0.01"))
            is_debit = e.is_debit

            print(
                f"[profit_and_loss]    Purchase Row → Group={grp_name:<20} "
                f"| Ledger={ledger_name:<15} | Amount={amt:>8} | is_debit={is_debit}"
            )

            # Only include if group="Purchase Accounts" AND is_debit=True
            if (grp_name == "Purchase Accounts") and is_debit:
                total_cogs_amount += e.amount
                print(f"[profit_and_loss]       → INCLUDED for COGS: +{amt}")
            else:
                print(f"[profit_and_loss]       → SKIPPED for COGS")

            # Always store every purchase entry (so that front end can expand if needed)
            signed_amt = (e.amount if e.is_debit else e.amount * decimal.Decimal("-1")).quantize(decimal.Decimal("0.01"))
            cogs_entry_list.append({
                "date":           e.voucher.date,
                "voucher_number": e.voucher.voucher_number,
                "ledger_name":    e.ledger.name,
                "is_debit":       e.is_debit,
                "amount":         e.amount,
                "signed_amount":  signed_amt
            })

        total_cogs_amount = total_cogs_amount.quantize(decimal.Decimal("0.01"))
        print(f"[profit_and_loss] Total COGS (Purchase Accounts) = {total_cogs_amount}")

        cogs_dict = {
            "group":   "Purchase Accounts",
            "amount":  total_cogs_amount,
            "entries": cogs_entry_list
        }

        # ─── 5.1) PURCHASE BY PARTY (credit side under “Sundry Creditors”) ───
        purchase_party_agg = (
            purchase_entries
            .filter(
                is_debit=False,
                ledger__account_group__group_name="Sundry Creditors"
            )
            .values(party=F("ledger__name"))
            .annotate(
                total=Sum(
                    F("amount"),
                    output_field=DecimalField(max_digits=14, decimal_places=2)
                )
            )
        )

        purchase_by_party = []
        print("[profit_and_loss]   ─── Computing Purchase by Party (credits under 'Sundry Creditors') ───")
        for row in purchase_party_agg:
            vendor_name = row["party"] or "Unknown Vendor"
            amt = (row["total"] or decimal.Decimal("0.00")).quantize(decimal.Decimal("0.01"))
            purchase_by_party.append({
                "party": str(vendor_name),
                "amount": amt
            })
            print(f"[profit_and_loss]   Purchase Party '{vendor_name}': {amt}")

        if not purchase_by_party:
            print("[profit_and_loss]   No party‐wise purchases returned.")

        # ─── 6) GROSS PROFIT = Sales – |COGS| ───
        gross_profit = (total_sales_amount - abs(total_cogs_amount)).quantize(decimal.Decimal("0.01"))
        print(f"[profit_and_loss] Calculated Gross Profit: {gross_profit}")

        # ─── 7) OPERATING EXPENSES (voucher_type='EXPENSE') ───
               # ─── 7) OPERATING EXPENSES (only groups whose nature == 'Expense') ───
        #     (previous version was grabbing all voucher_type='EXPENSE', which also pulled
        #      Sundry Creditors because its group.nature != 'Expense')
        expense_entries = base_qs.filter(
            voucher__voucher_type='EXPENSE',
            ledger__account_group__nature='Expense'
        )
        count_expense_entries = expense_entries.count()
        print(f"[profit_and_loss] Total EXPENSE JournalEntry records (nature='Expense'): {count_expense_entries}")

        operating_expense_list = []
        total_operating_expenses = decimal.Decimal("0.00")

        if count_expense_entries > 0:
            # Group only true‐expense rows by AccountGroup.group_name
            exp_groups = (
                expense_entries
                .values(group=F("ledger__account_group__group_name"))
                .annotate(
                    amount=Sum(
                        Case(
                            # Debits (actual расходы) count positive
                            When(is_debit=True,  then=F("amount")),
                            # Credits (if any) reduce expense
                            When(is_debit=False, then=F("amount") * decimal.Decimal("-1")),
                            output_field=DecimalField(max_digits=14, decimal_places=2)
                        )
                    )
                )
            )

            print("[profit_and_loss]   ─── Grouping only true Expense rows by AccountGroup →")
            for g in exp_groups:
                grp_name = g["group"] or "Unknown Expense Group"
                amt = (g["amount"] or decimal.Decimal("0.00")).quantize(decimal.Decimal("0.01"))

                # Skip groups that net out to zero
                if amt == decimal.Decimal("0.00"):
                    print(f"[profit_and_loss]    → Expense group '{grp_name}' nets to 0.00, skipping.")
                    continue

                # Fetch all entries for this account‐group
                group_entries = expense_entries.filter(
                    ledger__account_group__group_name=grp_name
                )
                entry_list = []

                print(f"[profit_and_loss]    → Expense group '{grp_name}': {amt} " 
                      f"({group_entries.count()} rows)")
                for idx, e in enumerate(group_entries.select_related("ledger__account_group"), start=1):
                    signed_amt = (
                        e.amount if e.is_debit
                        else (e.amount * decimal.Decimal("-1"))
                    ).quantize(decimal.Decimal("0.01"))

                    entry_list.append({
                        "date":           e.voucher.date,
                        "voucher_number": e.voucher.voucher_number,
                        "ledger_name":    e.ledger.name,
                        "is_debit":       e.is_debit,
                        "amount":         e.amount,
                        "signed_amount":  signed_amt
                    })

                    print(
                        f"[profit_and_loss]       [{idx:2d}] "
                        f"Voucher=EXPENSE | Group={grp_name:<20} "
                        f"| Ledger={e.ledger.name:<15} "
                        f"| Amount={e.amount:>8} "
                        f"| is_debit={e.is_debit} → signed={signed_amt}"
                    )

                operating_expense_list.append({
                    "group":   grp_name,
                    "amount":  amt,
                    "entries": entry_list
                })
                total_operating_expenses += amt

        total_operating_expenses = total_operating_expenses.quantize(decimal.Decimal("0.01"))
        print(f"[profit_and_loss] Total OPERATING EXPENSES: {total_operating_expenses}")

        # ─── 8) Operating Income = Gross Profit – |Operating Expenses| ───
        operating_income = (gross_profit - abs(total_operating_expenses)).quantize(decimal.Decimal("0.01"))
        print(f"[profit_and_loss] Calculated Operating Income: {operating_income}")

        # ─── 9) INCOME TAX EXPENSE (voucher_type='INCOME_TAX') ───
        tax_entries = base_qs.filter(voucher__voucher_type='INCOME_TAX')
        print(f"[profit_and_loss] Total INCOME_TAX JournalEntry records: {tax_entries.count()}")

        income_tax_list = []
        total_income_tax = decimal.Decimal("0.00")
        if tax_entries.exists():
            tax_groups = (
                tax_entries
                .values(group=F("ledger__account_group__group_name"))
                .annotate(
                    amount=Sum(
                        Case(
                            When(is_debit=True,  then=F("amount")),
                            When(is_debit=False, then=F("amount") * decimal.Decimal("-1")),
                            output_field=DecimalField(max_digits=14, decimal_places=2)
                        )
                    )
                )
            )

            for g in tax_groups:
                grp_name = g["group"] or "Income Tax Expense"
                amt = (g["amount"] or decimal.Decimal("0.00")).quantize(decimal.Decimal("0.01"))
                if amt != decimal.Decimal("0.00"):
                    group_entries = tax_entries.filter(
                        ledger__account_group__group_name=grp_name
                    )
                    entry_list = []
                    for e in group_entries:
                        signed_amt = (e.amount if e.is_debit else e.amount * decimal.Decimal("-1")).quantize(decimal.Decimal("0.01"))
                        entry_list.append({
                            "date":           e.voucher.date,
                            "voucher_number": e.voucher.voucher_number,
                            "ledger_name":    e.ledger.name,
                            "is_debit":       e.is_debit,
                            "amount":         e.amount,
                            "signed_amount":  signed_amt
                        })
                    income_tax_list.append({
                        "group":   grp_name,
                        "amount":  amt,
                        "entries": entry_list
                    })
                    total_income_tax += amt
                    print(f"[profit_and_loss]   Income Tax '{grp_name}': {amt} ({len(entry_list)} rows)")

        total_income_tax = total_income_tax.quantize(decimal.Decimal("0.01"))
        print(f"[profit_and_loss] Total Income Tax Expense: {total_income_tax}")

        # ─── 10) NET INCOME = Operating Income + Other Income – |Income Tax Expense| ───
        net_income = (
            operating_income
            + total_other_income
            - abs(total_income_tax)
        ).quantize(decimal.Decimal("0.01"))
        print(f"[profit_and_loss] Calculated Net Income: {net_income}")

        # ─── 11) Build payload ───
        payload = {
            "revenue":            [sales_dict],
            "sales_by_party":     sales_by_party,
            "other_income":       other_income_list,
            "cogs":               [cogs_dict],
            "purchase_by_party":  purchase_by_party,
            "gross_profit":       gross_profit,
            "expenses":           operating_expense_list,
            "operating_income":   operating_income,
            "income_tax":         income_tax_list,
            "net_income":         net_income
        }
        print(f"[profit_and_loss] Payload keys: {list(payload.keys())}")

        # ─── 12) Serialize & return ───
        serializer = ProfitLossSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        print("[profit_and_loss] Serialization successful, returning HTTP 200")
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        print("[profit_and_loss] Exception:", str(e))
        traceback.print_exc()
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
