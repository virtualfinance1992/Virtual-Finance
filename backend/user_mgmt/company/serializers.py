# company/serializers.py

from rest_framework import serializers
from user_mgmt.models import Company

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'
        read_only_fields = ['admin']  # ✅ Prevent frontend from overriding admin
