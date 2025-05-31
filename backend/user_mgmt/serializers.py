from rest_framework import serializers
from user_mgmt.models import AdminRegistration, UserRole, Company
from django.contrib.auth import get_user_model

User = get_user_model()

# ✅ Admin Registration Serializer
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
        print("🔍 Validating admin registration data:", data)
        if data['password'] != data['confirm_password']:
            print("❌ Passwords do not match.")
            raise serializers.ValidationError("Passwords do not match.")
        return data

    def create(self, validated_data):
        print("🛠️ Creating new AdminRegistration...")
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')

        admin = AdminRegistration(**validated_data)
        admin.set_password(password)
        admin.save()

        print("✅ Admin created successfully:", admin.username)
        return admin


# ✅ Company Serializer with console logs
from rest_framework import serializers
from user_mgmt.models import Company

class CompanySerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    qr_code_url = serializers.SerializerMethodField()
    signature_url = serializers.SerializerMethodField()

    logo = serializers.ImageField(required=False, allow_null=True)
    qr_code = serializers.ImageField(required=False, allow_null=True)
    signature = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Company
        fields = '__all__'
        read_only_fields = ['admin']

    def validate(self, data):
        print("🔍 Validating company data:", data)
        return super().validate(data)

    def update(self, instance, validated_data):
        print("🔄 Updating Company instance:", instance.company_name)
        print("📦 Incoming update payload:", validated_data)
        updated_instance = super().update(instance, validated_data)
        print("✅ Company updated successfully:", updated_instance.company_name)
        return updated_instance

    def get_logo_url(self, obj):
        request = self.context.get('request')
        if obj.logo and hasattr(obj.logo, 'url') and request:
            url = request.build_absolute_uri(obj.logo.url)
            print(f"🌐 Logo URL: {url}")
            return url
        return None

    def get_qr_code_url(self, obj):
        request = self.context.get('request')
        if obj.qr_code and hasattr(obj.qr_code, 'url') and request:
            url = request.build_absolute_uri(obj.qr_code.url)
            print(f"🌐 QR Code URL: {url}")
            return url
        return None

    def get_signature_url(self, obj):
        request = self.context.get('request')
        if obj.signature and hasattr(obj.signature, 'url') and request:
            url = request.build_absolute_uri(obj.signature.url)
            print(f"🌐 Signature URL: {url}")
            return url
        return None

# ✅ User Role Serializer
class UserRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRole
        fields = ['id', 'user', 'role', 'company']



