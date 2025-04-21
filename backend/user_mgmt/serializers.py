from rest_framework import serializers
from user_mgmt.models import AdminRegistration, UserRole, Company
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError

# Serializer for AdminRegistration
from rest_framework import serializers
from user_mgmt.models import AdminRegistration
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'
        read_only_fields = ['admin']  # ✅ Prevent frontend from modifying it

User = get_user_model()

from rest_framework import serializers
from .models import AdminRegistration

class AdminRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = AdminRegistration
        fields = [
            'username', 'password', 'confirm_password',
            'full_name', 'phone_number', 'email',
            'pan_card', 'company_name'
        ]

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match.")
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')

        admin = AdminRegistration(**validated_data)
        admin.set_password(password)
        admin.save()

        return admin





# Serializer for UserRole
class UserRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRole
        fields = ['id', 'user', 'role', 'company']

# Serializer for Company
class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'admin', 'company_name', 'registration_date']
