# Generated by Django 5.1.7 on 2025-04-11 07:38

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounting', '0005_alter_accountgroup_company'),
        ('user_mgmt', '0006_company_chart_of_accounts_type'),
    ]

    operations = [
        migrations.AlterField(
            model_name='accountgroup',
            name='company',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='account_groups', to='user_mgmt.company'),
        ),
        migrations.AlterField(
            model_name='ledgeraccount',
            name='company',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ledgers', to='user_mgmt.company'),
        ),
    ]
