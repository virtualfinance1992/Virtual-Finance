# voucher_audit/signals.py

import logging
from django.db import transaction
from django.db.models import Sum
from django.db.models.signals import post_save
from django.dispatch import receiver

from vouchers.models import Voucher, JournalEntry
from vouchers.serializers import VoucherSerializer
from .models import VoucherView
import middleware  # your thread‐local request/user helper

logger = logging.getLogger(__name__)


def _create_snapshot(voucher):
    """Create a fresh VoucherView snapshot for SALES and placeholders for RECEIPT."""
    try:
        user = middleware.get_current_user()
        print(f"👤 [Signal] Current user: {user}")

        company = voucher.company
        print(f"🏢 [Signal] Company: {company}")

        # serialize the voucher
        serialized = VoucherSerializer(voucher, context={'request_user': user}).data
        print(f"📄 [Signal] Serialized fields: {list(serialized.keys())}")

        # override the against_voucher in the payload so it always matches the actual FK
        av_id = voucher.against_voucher_id
        serialized['against_voucher'] = av_id
        print(f"🔗 [Signal] Forcing serialized['against_voucher'] = {av_id!r}")

        # log the key bits
        print(f"📅 [Signal] Date: {serialized.get('date')}")
        print(f"📑 [Signal] Type: {serialized.get('voucher_type')}")
        print(f"🔢 [Signal] Number: {serialized.get('voucher_number')}")
        print(f"📝 [Signal] Reference: {serialized.get('reference')}")
        print(f"🧾 [Signal] Items Count: {len(serialized.get('items', []))}")
        print(f"💰 [Signal] Entries Count: {len(serialized.get('entries', []))}")

        vv = VoucherView.objects.create(
            voucher=voucher,
            company=company,
            user=user,
            snapshot=serialized
        )
        print(f"✅ [Signal] VoucherView snapshot saved (ID: {vv.id}) for Voucher ID: {voucher.id}")

        # log any linked vouchers
        linked = Voucher.objects.filter(against_voucher=voucher).exclude(id=voucher.id)
        if linked.exists():
            print(f"🔁 [Signal] Found {linked.count()} linked voucher(s):")
            for lv in linked:
                print(f"    • ID {lv.id} | Type {lv.voucher_type} | Number {lv.voucher_number}")
        else:
            print("ℹ️ [Signal] No vouchers linked *to* this one.")

        if voucher.against_voucher:
            print(f"🔗 [Signal] This voucher is linked *to* Voucher ID: {voucher.against_voucher.id}")

    except Exception as e:
        logger.error(f"[Signal] Error saving snapshot for Voucher {voucher.id}: {e}")
        print(f"❌ [Signal] Failed to save VoucherView for Voucher {voucher.id}: {e}")


@receiver(post_save, sender=Voucher)
def snapshot_voucher(sender, instance, created, raw=False, **kwargs):
    # Skip fixtures or updates
    if raw:
        print(f"⚠️ [Signal] Raw save for Voucher {instance.id}, skipping.")
        return
    if not created:
        print(f"ℹ️ [Signal] Voucher {instance.id} updated, skipping snapshot.")
        return

    if instance.voucher_type == 'SALES':
        print(f"\n📌 [Signal] snapshot_voucher triggered for SALES Voucher ID: {instance.id}")
        transaction.on_commit(lambda: _create_snapshot(instance))
        return

    if instance.voucher_type == 'RECEIPT':
        print(f"\n📌 [Signal] snapshot_voucher triggered for RECEIPT Voucher ID: {instance.id}; deferring amount until JournalEntry saves.")
        # make a placeholder snapshot
        transaction.on_commit(lambda: _create_snapshot(instance))
        return


@receiver(post_save, sender=JournalEntry)
def update_receipt_snapshot(sender, instance, created, **kwargs):
    voucher = instance.voucher
    # only care about the first debit on a RECEIPT
    if not created or voucher.voucher_type != 'RECEIPT' or not instance.is_debit:
        return

    def _update():
        try:
            vv = VoucherView.objects.filter(voucher=voucher).order_by('-id').first()
            if not vv:
                print(f"⚠️ [Signal] No VoucherView found to update for RECEIPT {voucher.id}")
                return

            total = JournalEntry.objects.filter(
                voucher=voucher, is_debit=True
            ).aggregate(sum=Sum('amount'))['sum'] or 0

            snap = vv.snapshot
            snap['total_amount'] = float(total)
            vv.snapshot = snap
            vv.save(update_fields=['snapshot'])

            print(f"💡 [Signal] Injected receipt total_amount ₹{total:.2f} into VoucherView ID: {vv.id}")

        except Exception as e:
            logger.error(f"[Signal] Error updating receipt snapshot for Voucher {voucher.id}: {e}")
            print(f"❌ [Signal] Failed to update receipt total for Voucher {voucher.id}: {e}")

    print(f"📌 [Signal] first debit JournalEntry for RECEIPT {voucher.id} saved; updating snapshot.")
    transaction.on_commit(_update)
