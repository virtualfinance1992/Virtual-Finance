# Generated by Django 5.2 on 2025-04-14 11:02

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounting', '0007_alter_accountgroup_company'),
    ]

    operations = [
        migrations.AddField(
            model_name='ledgeraccount',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='ledgeraccount',
            name='opening_balance_type',
            field=models.CharField(choices=[('Dr', 'Dr'), ('Cr', 'Cr')], default='Dr', max_length=2),
        ),
    ]
