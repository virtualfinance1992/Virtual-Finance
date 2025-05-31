from django.db import models
from django.conf import settings
from user_mgmt.models import Company
from django.utils import timezone


class AccountGroup(models.Model):
    group_name = models.CharField(max_length=255)
    nature = models.CharField(max_length=50)
    description = models.TextField(blank=True, null=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    is_contra = models.BooleanField(default=False)

    # ✅ Add this line for hierarchical grouping
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='subgroups')

    def __str__(self):
        return self.group_name

    def get_root_nature(self):
        return self.parent.get_root_nature() if self.parent else self.nature


class LedgerAccount(models.Model):
    name = models.CharField(max_length=255)
    opening_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    opening_balance_type = models.CharField(max_length=2, choices=[('Dr', 'Dr'), ('Cr', 'Cr')], default='Dr')
    is_active = models.BooleanField(default=True)
    account_group = models.ForeignKey(AccountGroup, on_delete=models.CASCADE, related_name='ledgers')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='ledgers', null=False)
    created_at = models.DateTimeField(auto_now_add=True)
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    main_party_type = models.CharField(max_length=50, null=True, blank=True)




    # ✅ Dual-role flags for parties
    is_customer = models.BooleanField(default=False)
    is_supplier = models.BooleanField(default=False)
    main_party_type = models.CharField(
        max_length=20,
        choices=[('customer', 'Customer'), ('supplier', 'Supplier'), ('dual', 'Dual')],
        default='customer'
    )

    class Meta:
        unique_together = ('name', 'company')  # 🔐 Prevents multiple "Sales" in same company

    def __str__(self):
        return self.name
