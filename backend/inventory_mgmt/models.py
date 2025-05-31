from django.db import models
from user_mgmt.models import Company

class InventoryStockLog(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    item_name = models.CharField(max_length=100)
    change_type = models.CharField(max_length=20, choices=[("PURCHASE", "PURCHASE"), ("SALES", "SALES")])
    quantity_changed = models.DecimalField(max_digits=10, decimal_places=2)
    resulting_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    reference = models.CharField(max_length=100, null=True, blank=True)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.date.strftime('%Y-%m-%d')} | {self.item_name} | {self.change_type} | {self.quantity_changed}"
    

from django.db import models
from user_mgmt.models import Company

class InventoryItem(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    unit = models.CharField(max_length=50)
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    barcode = models.CharField(max_length=100, blank=True, null=True)
    hsn_code = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    opening_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_applicable = models.BooleanField(default=False)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)


    def __str__(self):
        return f"{self.name} ({self.company})"
