# voucher_audit/models.py

from django.db import models
from django.conf import settings
from django.utils import timezone
from user_mgmt.models import Company   # your actual Company model
from vouchers.models import Voucher
import logging

logger = logging.getLogger(__name__)

class VoucherView(models.Model):
    voucher   = models.ForeignKey(
        Voucher,
        on_delete=models.CASCADE,
        related_name='views'
    )
    company   = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='voucher_snapshots',
        null=True,      # allow NULL for existing rows
        blank=True      # <-- now there’s a comma above this line
    )
    user      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    snapshot  = models.JSONField()
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-viewed_at']

    def save(self, *args, **kwargs):
        logger.info(
            f"[VoucherView] Saving snapshot: voucher={self.voucher_id}, "
            f"company={self.company_id}, user={self.user}"
        )
        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"VoucherView(voucher={self.voucher_id}, "
            f"company={self.company_id}, user={self.user}, at={self.viewed_at})"
        )
