# Generated by Django 5.2 on 2025-04-16 13:04

import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vouchers', '0002_remove_voucher_party_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='journalentry',
            old_name='credit',
            new_name='amount',
        ),
        migrations.RenameField(
            model_name='voucher',
            old_name='narration',
            new_name='notes',
        ),
        migrations.RenameField(
            model_name='voucheritem',
            old_name='credit',
            new_name='discount',
        ),
        migrations.RenameField(
            model_name='voucheritem',
            old_name='debit',
            new_name='rate',
        ),
        migrations.RemoveField(
            model_name='journalentry',
            name='company',
        ),
        migrations.RemoveField(
            model_name='journalentry',
            name='created_at',
        ),
        migrations.RemoveField(
            model_name='journalentry',
            name='date',
        ),
        migrations.RemoveField(
            model_name='journalentry',
            name='debit',
        ),
        migrations.RemoveField(
            model_name='voucher',
            name='created_by',
        ),
        migrations.RemoveField(
            model_name='voucher',
            name='reference_number',
        ),
        migrations.RemoveField(
            model_name='voucheritem',
            name='description',
        ),
        migrations.RemoveField(
            model_name='voucheritem',
            name='ledger',
        ),
        migrations.AddField(
            model_name='journalentry',
            name='is_debit',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='voucher',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='voucher',
            name='reference',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='voucher',
            name='voucher_number',
            field=models.CharField(default='UNSET-0000', max_length=20),
        ),
        migrations.AddField(
            model_name='voucheritem',
            name='gst',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name='voucheritem',
            name='item_name',
            field=models.CharField(default='UNSET-ITEM', max_length=255),
        ),
        migrations.AddField(
            model_name='voucheritem',
            name='qty',
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name='voucheritem',
            name='unit',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AlterField(
            model_name='journalentry',
            name='voucher',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='entries', to='vouchers.voucher'),
        ),
        migrations.AlterField(
            model_name='voucher',
            name='date',
            field=models.DateField(default=django.utils.timezone.now),
        ),
        migrations.AlterField(
            model_name='voucher',
            name='voucher_type',
            field=models.CharField(choices=[('SALES', 'Sales'), ('PURCHASE', 'Purchase'), ('RECEIPT', 'Receipt from Customer'), ('PAYMENT', 'Payment to Supplier'), ('EXPENSE', 'Expense'), ('INCOME', 'Income'), ('ESTIMATION', 'Estimation'), ('PURCHASE_ORDER', 'Purchase Order'), ('CONTRA', 'Contra')], max_length=20),
        ),
    ]
