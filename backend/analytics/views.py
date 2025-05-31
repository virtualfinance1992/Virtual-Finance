from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, F, FloatField, DecimalField
from django.db.models.functions import Coalesce
from datetime import date
from decimal import Decimal
from vouchers.models import VoucherItem, JournalEntry


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def financial_kpi_summary(request, company_id):
    print("📡 KPI Summary API called for company:", company_id)

    # ─── Financial Year Dates ───────────────────────
    today = date.today()
    fy_start = date(today.year if today.month > 3 else today.year - 1, 4, 1)
    fy_end = date(today.year + 1, 3, 31) if today.month > 3 else date(today.year, 3, 31)
    start_date = request.GET.get('from_date', fy_start)
    end_date = request.GET.get('to_date', fy_end)
    print(f"📅 Period: {start_date} to {end_date}")

    # ─── Sales Aggregation ──────────────────────────
    sales_data = VoucherItem.objects.filter(
        voucher__company_id=company_id,
        voucher__voucher_type='SALES',
        voucher__date__range=[start_date, end_date]
    ).aggregate(
        total_sales=Coalesce(Sum(F('qty') * F('rate'), output_field=FloatField()), 0.0),
        total_units_sold=Coalesce(Sum('qty'), 0.0)
    )

    # ─── Purchase Aggregation ───────────────────────
    purchase_data = VoucherItem.objects.filter(
        voucher__company_id=company_id,
        voucher__voucher_type='PURCHASE',
        voucher__date__range=[start_date, end_date]
    ).aggregate(
        total_purchases=Coalesce(Sum(F('qty') * F('rate'), output_field=FloatField()), 0.0),
        total_units_purchased=Coalesce(Sum('qty'), 0.0)
    )

    # ─── Expense Aggregation ────────────────────────
    expense_total = JournalEntry.objects.filter(
        voucher__company_id=company_id,
        voucher__voucher_type='EXPENSE',
        voucher__date__range=[start_date, end_date],
        is_debit=True
    ).aggregate(
        total=Coalesce(Sum('amount', output_field=DecimalField()), Decimal('0.00'))
    )['total']

    # ─── Convert to Decimals ────────────────────────
    total_sales = Decimal(sales_data['total_sales'])
    total_purchases = Decimal(purchase_data['total_purchases'])
    total_expenses = Decimal(expense_total)
    total_units_sold = Decimal(sales_data['total_units_sold'])
    total_units_purchased = Decimal(purchase_data['total_units_purchased'])

    # ─── Profit Calculations ────────────────────────
    gross_profit = total_sales - total_purchases
    net_profit = gross_profit - total_expenses
    days = (fy_end - fy_start).days or 1

    # ─── Ratio Calculations ─────────────────────────
    gross_profit_margin = round((gross_profit / total_sales) * 100, 2) if total_sales > 0 else 0
    net_profit_margin = round((net_profit / total_sales) * 100, 2) if total_sales > 0 else 0
    operating_expense_ratio = round((total_expenses / total_sales) * 100, 2) if total_sales > 0 else 0
    avg_sale_per_unit = round((total_sales / total_units_sold), 2) if total_units_sold > 0 else 0
    unit_profit_margin = round((net_profit / total_units_sold), 2) if total_units_sold > 0 else 0
    avg_cost_per_unit = round((total_purchases / total_units_purchased), 2) if total_units_purchased > 0 else 0
    sales_to_purchase_ratio = round((total_sales / total_purchases), 4) if total_purchases > 0 else 0
    purchase_to_sales_ratio = round((total_purchases / total_sales), 4) if total_sales > 0 else 0
    inventory_turnover = round((total_units_sold / total_units_purchased), 2) if total_units_purchased > 0 else 0
    avg_sales_per_day = round((total_sales / days), 2)

    # ─── Business Health (Basic Logic) ──────────────
    if net_profit_margin > 15 and inventory_turnover > 1:
        business_health = "Healthy"
    elif net_profit_margin > 5:
        business_health = "Moderate"
    else:
        business_health = "Critical"

    # ─── Debug Logs ─────────────────────────────────
    print("🔎 KPI Summary Breakdown:")
    print(f"💰 Total Sales: ₹{total_sales}")
    print(f"📦 Units Sold: {total_units_sold}")
    print(f"💸 Total Purchases: ₹{total_purchases}")
    print(f"📥 Units Purchased: {total_units_purchased}")
    print(f"💼 Total Expenses: ₹{total_expenses}")
    print(f"📈 Gross Profit: ₹{gross_profit}")
    print(f"📉 Net Profit: ₹{net_profit}")
    print(f"📊 Gross Profit Margin: {gross_profit_margin}%")
    print(f"📊 Net Profit Margin: {net_profit_margin}%")
    print(f"📊 Operating Expense Ratio: {operating_expense_ratio}%")
    print(f"📊 Avg Sales/Day: ₹{avg_sales_per_day}")
    print(f"📊 Avg Sale per Unit: ₹{avg_sale_per_unit}")
    print(f"📊 Avg Cost per Unit: ₹{avg_cost_per_unit}")
    print(f"📊 Profit per Unit: ₹{unit_profit_margin}")
    print(f"📊 Purchase to Sales Ratio: {purchase_to_sales_ratio}")
    print(f"📊 Sales to Purchase Ratio: {sales_to_purchase_ratio}")
    print(f"🔁 Inventory Turnover: {inventory_turnover}")
    print(f"🏥 Business Health: {business_health}")

    # ─── Final Response ─────────────────────────────
    return Response({
        "total_sales": float(total_sales),
        "total_purchases": float(total_purchases),
        "total_expenses": float(total_expenses),
        "gross_profit": float(gross_profit),
        "net_profit": float(net_profit),
        "total_units_sold": float(total_units_sold),
        "avg_sales_per_day": float(avg_sales_per_day),
        "sales_to_purchase_ratio": sales_to_purchase_ratio,
        "purchase_to_sales_ratio": purchase_to_sales_ratio,
        "avg_cost_per_unit": float(avg_cost_per_unit),
        "avg_sale_per_unit": float(avg_sale_per_unit),
        "unit_profit_margin": float(unit_profit_margin),
        "gross_profit_margin": float(gross_profit_margin),
        "net_profit_margin": float(net_profit_margin),
        "operating_expense_ratio": float(operating_expense_ratio),
        "inventory_turnover": float(inventory_turnover),
        "business_health": business_health
    })




# Revenue Vs purchase graph
from django.db.models.functions import TruncMonth

from django.db.models.functions import TruncDay, TruncMonth

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sales_purchase_trend(request, company_id):
    from datetime import datetime
    print(f"📊 Revenue vs Purchase Trend API Called for company {company_id}")

    try:
        from_date = request.GET.get('from')
        to_date = request.GET.get('to')

        if not from_date or not to_date:
            return Response({"error": "Please provide 'from' and 'to' dates in YYYY-MM-DD format."}, status=400)

        from_date = datetime.strptime(from_date, "%Y-%m-%d").date()
        to_date = datetime.strptime(to_date, "%Y-%m-%d").date()
        day_range = (to_date - from_date).days

        print(f"📅 Date Range: {from_date} → {to_date} ({day_range} days)")

        # Use day granularity if range is small, else month
        trunc_fn = TruncDay if day_range <= 30 else TruncMonth
        label_key = 'day' if trunc_fn == TruncDay else 'month'

        # SALES
        sales_qs = VoucherItem.objects.filter(
            voucher__company_id=company_id,
            voucher__voucher_type='SALES',
            voucher__date__range=[from_date, to_date]
        ).annotate(time=trunc_fn('voucher__date')) \
         .values('time') \
         .annotate(sales=Sum(F('qty') * F('rate'), output_field=FloatField())) \
         .order_by('time')

        # PURCHASES
        purchase_qs = VoucherItem.objects.filter(
            voucher__company_id=company_id,
            voucher__voucher_type='PURCHASE',
            voucher__date__range=[from_date, to_date]
        ).annotate(time=trunc_fn('voucher__date')) \
         .values('time') \
         .annotate(purchases=Sum(F('qty') * F('rate'), output_field=FloatField())) \
         .order_by('time')

        # Merge results
        trend = {}
        for item in sales_qs:
            key = item['time'].strftime('%Y-%m-%d' if label_key == 'day' else '%Y-%m')
            trend[key] = {
                'label': item['time'].strftime('%d %b' if label_key == 'day' else '%b %Y'),
                'sales': float(item['sales']),
                'purchases': 0
            }

        for item in purchase_qs:
            key = item['time'].strftime('%Y-%m-%d' if label_key == 'day' else '%Y-%m')
            if key not in trend:
                trend[key] = {
                    'label': item['time'].strftime('%d %b' if label_key == 'day' else '%b %Y'),
                    'sales': 0,
                    'purchases': float(item['purchases'])
                }
            else:
                trend[key]['purchases'] = float(item['purchases'])

        sorted_data = []
        print("🔍 Trend Breakdown:")
        for key in sorted(trend):
            row = trend[key]
            print(f"📅 {row['label']} → 🟢 Sales: ₹{row['sales']:.2f}, 🔴 Purchases: ₹{row['purchases']:.2f}")
            sorted_data.append(row)

        print(f"✅ Returning {len(sorted_data)} data points.")
        return Response(sorted_data)

    except Exception as e:
        print("❌ Trend API Error:", str(e))
        return Response({"error": "Server error occurred."}, status=500)

# outsnading sales and purchases
# backend/analytics/views.py
# backend/analytics/views.py

from datetime import date
import logging

from django.db.models import Sum
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from user_mgmt.models import Company
from vouchers.models import Voucher, JournalEntry  # JournalEntry holds each dr/cr amount :contentReference[oaicite:0]{index=0}:contentReference[oaicite:1]{index=1}

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request, company_id):
    # 0) Setup
    company = get_object_or_404(Company, id=company_id, admin=request.user)
    today = date.today()
    print(f"[Dashboard Summary] Starting summary for company {company_id} on {today}")

    # 1) SALES side
    sales_vouchers = Voucher.objects.filter(company=company, voucher_type='SALES')
    print(f"[Dashboard Summary] Found {sales_vouchers.count()} SALES vouchers")
    sales_total = sales_current = sales_1_15 = sales_16_30 = sales_30_plus = 0

    for v in sales_vouchers:
        # a) Invoice total = sum of debit entries on this voucher
        inv_agg = JournalEntry.objects.filter(voucher=v, is_debit=True) \
                     .aggregate(total=Sum('amount'))
        invoice_total = inv_agg['total'] or 0
        print(f"[Sales:{v.id}] Invoice total (debit side) = {invoice_total}")

        # b) Payments applied = sum of credit entries on RECEIPT vouchers against this invoice
        pay_agg = JournalEntry.objects.filter(
            voucher__voucher_type='RECEIPT',
            voucher__against_voucher=v.id,
            is_debit=False
        ).aggregate(paid=Sum('amount'))
        paid_amount = pay_agg['paid'] or 0
        print(f"[Sales:{v.id}] Paid back via RECEIPT (credit side) = {paid_amount}")

        # c) Outstanding
        outstanding = invoice_total - paid_amount
        print(f"[Sales:{v.id}] Outstanding = {invoice_total} - {paid_amount} = {outstanding}")
        if outstanding <= 0:
            continue

        # d) Aging bucket
        days_old = (today - v.date).days
        sales_total += outstanding
        if days_old <= 0:
            sales_current += outstanding
        elif days_old <= 15:
            sales_1_15 += outstanding
        elif days_old <= 30:
            sales_16_30 += outstanding
        else:
            sales_30_plus += outstanding

    # 2) PURCHASE side (mirror logic, but invoice is credit side and payments from PAYMENT vouchers)
    purchase_vouchers = Voucher.objects.filter(company=company, voucher_type='PURCHASE')
    print(f"[Dashboard Summary] Found {purchase_vouchers.count()} PURCHASE vouchers")
    purchase_total = purchase_current = purchase_1_15 = purchase_16_30 = purchase_30_plus = 0

    for v in purchase_vouchers:
        # a) Invoice total = sum of credit entries on this voucher
        inv_agg = JournalEntry.objects.filter(voucher=v, is_debit=False) \
                     .aggregate(total=Sum('amount'))
        invoice_total = inv_agg['total'] or 0
        print(f"[Purchase:{v.id}] Invoice total (credit side) = {invoice_total}")

        # b) Payments applied = sum of debit entries on PAYMENT vouchers against this invoice
        pay_agg = JournalEntry.objects.filter(
            voucher__voucher_type='PAYMENT',
            voucher__against_voucher=v.id,
            is_debit=True
        ).aggregate(paid=Sum('amount'))
        paid_amount = pay_agg['paid'] or 0
        print(f"[Purchase:{v.id}] Paid back via PAYMENT (debit side) = {paid_amount}")

        # c) Outstanding
        outstanding = invoice_total - paid_amount
        print(f"[Purchase:{v.id}] Outstanding = {invoice_total} - {paid_amount} = {outstanding}")
        if outstanding <= 0:
            continue

        # d) Aging bucket
        days_old = (today - v.date).days
        purchase_total += outstanding
        if days_old <= 0:
            purchase_current += outstanding
        elif days_old <= 15:
            purchase_1_15 += outstanding
        elif days_old <= 30:
            purchase_16_30 += outstanding
        else:
            purchase_30_plus += outstanding

    # 3) Build & return final summary
    summary = {
        'salesTotal':      sales_total,
        'salesCurrent':    sales_current,
        'sales1_15':       sales_1_15,
        'sales16_30':      sales_16_30,
        'sales30_plus':    sales_30_plus,
        'purchaseTotal':   purchase_total,
        'purchaseCurrent': purchase_current,
        'purchase1_15':    purchase_1_15,
        'purchase16_30':   purchase_16_30,
        'purchase30_plus': purchase_30_plus,
    }

    print(f"[Dashboard Summary] Computed summary: {summary}")
    return Response(summary)
