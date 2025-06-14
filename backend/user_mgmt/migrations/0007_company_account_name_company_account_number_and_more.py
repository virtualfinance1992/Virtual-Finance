# Generated by Django 5.2 on 2025-05-26 09:06

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('user_mgmt', '0006_company_chart_of_accounts_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='company',
            name='account_name',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='company',
            name='account_number',
            field=models.CharField(blank=True, max_length=30, null=True),
        ),
        migrations.AddField(
            model_name='company',
            name='bank_name',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='company',
            name='branch',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='company',
            name='ifsc_code',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='company',
            name='qr_code',
            field=models.ImageField(blank=True, null=True, upload_to='company_qr_codes/'),
        ),
        migrations.AddField(
            model_name='company',
            name='upi_id',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
