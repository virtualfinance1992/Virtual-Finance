# backend/vouchers/models.py

from django.db import models
from django.utils import timezone
from accounting.models import LedgerAccount
from user_mgmt.models import Company

VOUCHER_TYPES = [
    ("SALES", "Sales"),
    ("PURCHASE", "Purchase"),
    ("RECEIPT", "Receipt from Customer"),
    ("PAYMENT", "Payment to Supplier"),
    ("EXPENSE", "Expense"),
    ("INCOME", "Income"),
    ("ESTIMATION", "Estimation"),
    ("PURCHASE_ORDER", "Purchase Order"),
    ("CONTRA", "Contra"),
    ("JOURNAL", "Journal Entry"),
    ("DEBIT_NOTE",    "Debit Note"),    # ← exactly here
    ("CREDIT_NOTE",   "Credit Note"),
]

class Voucher(models.Model):
    company        = models.ForeignKey(Company, on_delete=models.CASCADE)
    voucher_type   = models.CharField(choices=VOUCHER_TYPES, max_length=20)
    voucher_number = models.CharField(max_length=20, default='UNSET-0000')
    date           = models.DateField(default=timezone.now)
    reference      = models.CharField(max_length=255, blank=True)
    notes          = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    payment_mode = models.CharField(max_length=20, blank=True, null=True)

    # single self‐FK for both payments and receipts
    against_voucher = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='related_vouchers',  # generic reverse accessor
    )

    def __str__(self):
        return f"{self.voucher_type} - {self.voucher_number}"


class JournalEntry(models.Model):
    voucher = models.ForeignKey(Voucher, related_name='entries', on_delete=models.CASCADE)
    ledger = models.ForeignKey(LedgerAccount, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_debit = models.BooleanField(default=True)

    def __str__(self):
        return f"{'Dr' if self.is_debit else 'Cr'} {self.ledger.name} ₹{self.amount}"

class VoucherItem(models.Model):
    voucher = models.ForeignKey(Voucher, related_name="items", on_delete=models.CASCADE)
    item_name = models.CharField(max_length=255, default='UNSET-ITEM')
    qty = models.FloatField(default=0)
    rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    unit = models.CharField(max_length=50, blank=True, null=True)
    notes       = models.TextField(blank=True)  
    remarks = models.TextField(blank=True)
    

    def __str__(self):
        return f"{self.item_name} ({self.qty} x ₹{self.rate})"



# For quotation and purchases

class Quotation(models.Model):
    company    = models.ForeignKey(Company, on_delete=models.CASCADE)
    date       = models.DateField(default=timezone.now)
    reference  = models.CharField(max_length=255, blank=True)
    customer   = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

class QuotationItem(models.Model):
    voucher    = models.ForeignKey(Quotation, related_name='items', on_delete=models.CASCADE)
    description= models.CharField(max_length=255)
    amount     = models.DecimalField(max_digits=14, decimal_places=2)

class PurchaseOrder(models.Model):
    company    = models.ForeignKey(Company, on_delete=models.CASCADE)
    date       = models.DateField(default=timezone.now)
    reference  = models.CharField(max_length=255, blank=True)
    supplier   = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

class POItem(models.Model):
    voucher    = models.ForeignKey(PurchaseOrder, related_name='items', on_delete=models.CASCADE)
    description= models.CharField(max_length=255)
    amount     = models.DecimalField(max_digits=14, decimal_places=2)
