# backend/vouchers/utils.py

from datetime import datetime
from .models import Voucher
from django.utils.timezone import now



def generate_voucher_number(voucher_type, company_id):
    year = now().year
    count = Voucher.objects.filter(company_id=company_id, voucher_type=voucher_type).count() + 1
    return f"{voucher_type[:3].upper()}-{year}-{count:04d}"



# vouchers/utils/ledger_utils.py

from accounting.models import AccountGroup, LedgerAccount
from user_mgmt.models import Company

def ensure_sales_ledgers(company_id, customer):
    print(f"🔧 Ensuring ledgers for company {company_id} and customer '{customer}'")
    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        raise Exception(f"❌ Company {company_id} not found")

    # Step 1: Get or Create Account Groups
    print("🔍 Getting account groups...")
    sales_group, _ = AccountGroup.objects.get_or_create(
        group_name="Sales Accounts", company=company, defaults={"nature": "Income"}
    )
    gst_group, _ = AccountGroup.objects.get_or_create(
        group_name="GST Payable", company=company, defaults={"nature": "Liability"}
    )
    sundry_debtors, _ = AccountGroup.objects.get_or_create(
        group_name="Sundry Debtors", company=company, defaults={"nature": "Asset"}
    )

    # Step 2: Get or Create Ledgers
    print("🔍 Checking for existing ledgers...")

    # Sales Ledger
    sales_ledger = LedgerAccount.objects.filter(name="Sales", account_group=sales_group, company=company).first()
    if not sales_ledger:
        sales_ledger = LedgerAccount.objects.create(name="Sales", company=company, account_group=sales_group)
        print(f"✅ Created Sales Ledger (ID: {sales_ledger.id})")
    else:
        print(f"♻️ Reusing existing Sales Ledger (ID: {sales_ledger.id})")

    # GST Ledger
    gst_ledger = LedgerAccount.objects.filter(name="GST Payable", account_group=gst_group, company=company).first()
    if not gst_ledger:
        gst_ledger = LedgerAccount.objects.create(name="GST Payable", company=company, account_group=gst_group)
        print(f"✅ Created GST Ledger (ID: {gst_ledger.id})")
    else:
        print(f"♻️ Reusing existing GST Ledger (ID: {gst_ledger.id})")

    # Customer Ledger (Named after `customer` string)
    customer_ledger = LedgerAccount.objects.filter(name=customer, account_group=sundry_debtors, company=company).first()
    if not customer_ledger:
        customer_ledger = LedgerAccount.objects.create(name=customer, company=company, account_group=sundry_debtors)
        print(f"✅ Created Customer Ledger '{customer}' (ID: {customer_ledger.id})")
    else:
        print(f"♻️ Reusing existing Customer Ledger '{customer}' (ID: {customer_ledger.id})")

    return {
        "sales": sales_ledger.id,
        "gst": gst_ledger.id,
        "customer": customer_ledger.id,
    }


# Purchase Ledger

from accounting.models import AccountGroup, LedgerAccount
from user_mgmt.models import Company

def ensure_purchase_ledgers(company_id, supplier_name):
    print(f"🔧 Ensuring ledgers for company {company_id} and supplier '{supplier_name}'")
    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        raise Exception(f"❌ Company {company_id} not found")

    # Step 1: Get or Create Account Groups
    purchase_group, _ = AccountGroup.objects.get_or_create(
        group_name="Purchase Accounts", company=company, defaults={"nature": "Expense"}
    )
    gst_group, _ = AccountGroup.objects.get_or_create(
        group_name="GST Payable", company=company, defaults={"nature": "Liability"}
    )
    creditors_group, _ = AccountGroup.objects.get_or_create(
        group_name="Sundry Creditors", company=company, defaults={"nature": "Liability"}
    )

    # Step 2: Ledgers
    purchase_ledger = LedgerAccount.objects.filter(name="Purchase", company=company, account_group=purchase_group).first()
    if not purchase_ledger:
        purchase_ledger = LedgerAccount.objects.create(name="Purchase", company=company, account_group=purchase_group)

    gst_ledger = LedgerAccount.objects.filter(name="GST Payable", company=company, account_group=gst_group).first()
    if not gst_ledger:
        gst_ledger = LedgerAccount.objects.create(name="GST Payable", company=company, account_group=gst_group)

    supplier_ledger = LedgerAccount.objects.filter(name=supplier_name, company=company, account_group=creditors_group).first()
    if not supplier_ledger:
        supplier_ledger = LedgerAccount.objects.create(name=supplier_name, company=company, account_group=creditors_group)

    return {
        "purchase": purchase_ledger.id,
        "gst": gst_ledger.id,
        "supplier": supplier_ledger.id,
    }



# Expense
from accounting.models import AccountGroup, LedgerAccount

def ensure_expense_ledgers(company_id, expense_account_name):
    print(f"✨ Ensuring ledgers for company {company_id} and expense account '{expense_account_name}'")

    # Get or create Expense Account Group
    expense_group, _ = AccountGroup.objects.get_or_create(
        company_id=company_id,
        group_name="Direct Expenses",
        defaults={"nature": "Expense", "description": "Expenses directly related to operations"}
    )

    # Get or create GST Payable Group
    gst_group, _ = AccountGroup.objects.get_or_create(
        company_id=company_id,
        group_name="GST Payable",
        defaults={"nature": "Liability", "description": "GST liability"}
    )

    # 👇 Party Ledger (credited)
    party_group, _ = AccountGroup.objects.get_or_create(
        company_id=company_id,
        group_name="Creditors",
        defaults={"nature": "Liability", "description": "Expenses Payable to vendors"}
    )

    # ✅ Expense Ledger
    expense_ledger, _ = LedgerAccount.objects.get_or_create(
        company_id=company_id,
        name=f"{expense_account_name} (Expense)",  # ✅ Unique name
        defaults={"account_group": expense_group}
    )

    # ✅ Party Ledger
    party_ledger, _ = LedgerAccount.objects.get_or_create(
        company_id=company_id,
        name=f"{expense_account_name} (Payable)",  # ✅ Unique name
        defaults={"account_group": party_group}
    )

    # ✅ GST Ledger
    gst_ledger, _ = LedgerAccount.objects.get_or_create(
        company_id=company_id,
        name="GST Payable",
        defaults={"account_group": gst_group}
    )

    return {
        "expense": expense_ledger.id,
        "gst": gst_ledger.id,
        "party": party_ledger.id
    }

#Income 
from accounting.models import AccountGroup, LedgerAccount

def ensure_income_ledgers(company_id, income_account_name):
    print(f"✨ Ensuring ledgers for company {company_id} and income account '{income_account_name}'")

    # ✅ Get or create Income Account Group
    try:
        income_group, _ = AccountGroup.objects.get_or_create(
            company_id=company_id,
            group_name="Direct Income",
            defaults={"nature": "Income", "description": "Primary income sources"}
        )
        print(f"✅ Income group ensured: {income_group.group_name}")
    except Exception as e:
        print("❌ Error creating/fetching income group:", e)
        raise

    # ✅ Get or create GST Receivable Group (Asset)
    try:
        gst_group, _ = AccountGroup.objects.get_or_create(
            company_id=company_id,
            group_name="GST Receivable",
            defaults={"nature": "Asset", "description": "GST to be received from customers"}
        )
        print(f"✅ GST group ensured: {gst_group.group_name}")
    except Exception as e:
        print("❌ Error creating/fetching GST group:", e)
        raise

    # ✅ Create or fetch income ledger
    try:
        income_ledger, _ = LedgerAccount.objects.get_or_create(
            company_id=company_id,
            name=income_account_name,
            defaults={"account_group": income_group}
        )
        print(f"✅ Income ledger ensured: {income_ledger.name}")
    except Exception as e:
        print("❌ Error creating/fetching income ledger:", e)
        raise

    # ✅ Create or fetch GST Receivable ledger
    try:
        gst_ledger, _ = LedgerAccount.objects.get_or_create(
            company_id=company_id,
            name="GST Receivable",
            defaults={"account_group": gst_group}
        )
        print(f"✅ GST Receivable ledger ensured: {gst_ledger.name}")
    except Exception as e:
        print("❌ Error creating/fetching GST Receivable ledger:", e)
        raise

    # ✅ Create or fetch Party ledger (same as income ledger name — for amount received from customer)
    try:
        party_ledger, _ = LedgerAccount.objects.get_or_create(
            company_id=company_id,
            name=income_account_name,
            defaults={"account_group": income_group}
        )
        print(f"✅ Party ledger ensured: {party_ledger.name}")
    except Exception as e:
        print("❌ Error creating/fetching party ledger:", e)
        raise

    return {
        "income": income_ledger.id,
        "gst": gst_ledger.id,
        "party": party_ledger.id
    }



# Recipt From Customer
# ✅ backend/vouchers/utils.py
from accounting.models import AccountGroup, LedgerAccount
from .models import Voucher
from django.utils.timezone import now
from decimal import Decimal


def ensure_receipt_ledgers(company_id, customer_name):
    print(f"\n✨ Ensuring ledgers for company {company_id} and customer '{customer_name}'")

    # 🧾 Group: Sundry Debtors
    debtors_group, _ = AccountGroup.objects.get_or_create(
        company_id=company_id,
        group_name="Sundry Debtors",
        defaults={"nature": "Asset", "description": "Customers who owe money"}
    )

    # 💰 Group: Bank
    bank_group, _ = AccountGroup.objects.get_or_create(
        company_id=company_id,
        group_name="Bank",
        defaults={"nature": "Asset", "description": "Bank Accounts"}
    )

    # 📥 Ledger: Customer (Debtor)
    debtor_ledger, _ = LedgerAccount.objects.get_or_create(
        company_id=company_id,
        name=customer_name,
        defaults={"account_group": debtors_group}
    )

    # 🏦 Ledger: Bank Account
    bank_ledger, _ = LedgerAccount.objects.get_or_create(
        company_id=company_id,
        name="Bank Account",
        defaults={"account_group": bank_group}
    )

    return {
        "customer": debtor_ledger.id,
        "bank": bank_ledger.id,
    }


def generate_voucher_number(voucher_type, company_id):
    year = now().year
    count = Voucher.objects.filter(company_id=company_id, voucher_type=voucher_type).count() + 1
    return f"{voucher_type[:3].upper()}-{year}-{count:04d}"
