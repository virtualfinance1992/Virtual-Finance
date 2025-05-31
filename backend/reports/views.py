import traceback
import django.db.models as m
import django.db.models.functions as dbfunc
import traceback
from decimal import Decimal

from decimal import Decimal

from django.db.models import Sum, Value, Case, When, F, ExpressionWrapper, DecimalField, FloatField
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

import decimal
from django.db.models import Sum, F, Case, When, DecimalField
from rest_framework.response import Response

from vouchers.models import JournalEntry as Entry
from .serializers import (
    BalanceSheetSerializer,
    ProfitLossSerializer,
    CashFlowSerializer,
)


def parse_dates(request):
    """
    Extract 'from' and 'to' from query params.
    """
    start = request.query_params.get('from')
    end   = request.query_params.get('to')
    print(f"[parse_dates] start={start}, end={end}")
    return start, end


def summarize(entries, nature):
    """
    Group entries whose ledger.account_group.nature == nature.
    Debits are counted positively; credits are subtracted.
    Returns a list of dicts: [{'group': <group_name>, 'amount': <Decimal>}, …]
    """
    total_count = entries.count()
    print(f"[summarize] Summarizing nature='{nature}', total entries={total_count}")

    qs = entries.filter(ledger__account_group__nature=nature)
    # Use 'group_name' on AccountGroup instead of 'name'
    agg = qs.values(group_name=F('ledger__account_group__group_name')).annotate(
        amount=Sum(
            Case(
                When(is_debit=True,  then=F('amount')),
                When(is_debit=False, then=F('amount') * decimal.Decimal(-1)),
                output_field=DecimalField()
            )
        )
    )

    summary = []
    for x in agg:
        grp = x['group_name']
        amt = x['amount'] or decimal.Decimal('0.00')
        summary.append({'group': grp, 'amount': amt})
        print(f"  [summarize] → Group '{grp}': amount={amt}")

    return summary


def balance_sheet(request, company_id):
    """
    GET /api/reports/<company_id>/balance-sheet/?from=YYYY-MM-DD&to=YYYY-MM-DD
    Returns JSON:
      {
        "assets":    [ {group, amount}, … ],
        "liabilities":[ {group, amount}, … ],
        "equity":    [ {group, amount}, … ]
      }
    """
    start, end = parse_dates(request)
    print(f"[balance_sheet] Called with company_id={company_id}, from={start}, to={end}")

    entries = Entry.objects.filter(
        voucher__company_id=company_id,
        voucher__date__range=[start, end]
    )
    print(f"[balance_sheet] Fetched {entries.count()} JournalEntry records")

    data = {
        'assets':      summarize(entries, 'Asset'),
        'liabilities': summarize(entries, 'Liability'),
        'equity':      summarize(entries, 'Equity'),
    }
    print("[balance_sheet] Assembled data for assets, liabilities, equity")
    return Response(BalanceSheetSerializer(data).data)


def profit_and_loss(request, company_id):
    """
    GET /api/reports/<company_id>/profit-loss/?from=YYYY-MM-DD&to=YYYY-MM-DD
    Returns JSON:
      {
        "revenue":    [ {group, amount}, … ],
        "expenses":   [ {group, amount}, … ],
        "net_profit": <Decimal>
      }
    """
    start, end = parse_dates(request)
    print(f"[profit_and_loss] Called with company_id={company_id}, from={start}, to={end}")

    entries = Entry.objects.filter(
        voucher__company_id=company_id,
        voucher__date__range=[start, end]
    )
    print(f"[profit_and_loss] Fetched {entries.count()} JournalEntry records")

    revenue_groups  = summarize(entries, 'Revenue')
    expense_groups  = summarize(entries, 'Expense')

    total_revenue = sum(item['amount'] for item in revenue_groups)
    total_expense = sum(item['amount'] for item in expense_groups)
    net_profit    = total_revenue - total_expense

    print(f"[profit_and_loss] Total revenue={total_revenue}, total expense={total_expense}, net_profit={net_profit}")

    payload = {
        'revenue':    revenue_groups,
        'expenses':   expense_groups,
        'net_profit': net_profit
    }
    return Response(ProfitLossSerializer(payload).data)


def cash_flow(request, company_id):
    """
    GET /api/reports/<company_id>/cash-flow/?from=YYYY-MM-DD&to=YYYY-MM-DD
    Returns JSON:
      {
        "operating": [ {group, amount}, … ],
        "investing": [ {group, amount}, … ],
        "financing": [ {group, amount}, … ],
        "net_change": <Decimal>
      }
    """
    start, end = parse_dates(request)
    print(f"[cash_flow] Called with company_id={company_id}, from={start}, to={end}")

    cash_entries = Entry.objects.filter(
        voucher__company_id=company_id,
        voucher__date__range=[start, end],
        ledger__account_group__name='Cash and Cash Equivalents'
    )
    print(f"[cash_flow] Fetched {cash_entries.count()} cash-related JournalEntry records")

    op_entries  = cash_entries.filter(voucher__voucher_type__in=['SALES', 'RECEIPT'])
    inv_entries = cash_entries.filter(voucher__voucher_type__in=['PURCHASE'])
    fin_entries = cash_entries.filter(voucher__voucher_type__in=['PAYMENT'])

    print(f"[cash_flow] Operating entries count:  {op_entries.count()}")
    print(f"[cash_flow] Investing entries count:  {inv_entries.count()}")
    print(f"[cash_flow] Financing entries count:  {fin_entries.count()}")

    op_summary  = summarize(op_entries,  'Asset')
    inv_summary = summarize(inv_entries, 'Asset')
    fin_summary = summarize(fin_entries, 'Asset')

    net_change = sum(item['amount'] for item in (op_summary + inv_summary + fin_summary))
    print(f"[cash_flow] Net cash change = {net_change}")

    payload = {
        'operating':  op_summary,
        'investing':  inv_summary,
        'financing':  fin_summary,
        'net_change': net_change
    }
    return Response(CashFlowSerializer(payload).data)
