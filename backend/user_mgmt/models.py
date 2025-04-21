from django.db import models
from django.utils import timezone
from django.core.validators import RegexValidator
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.conf import settings


# ✅ Admin User Manager (no change)
class AdminUserManager(BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError("Username is required")
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(username, password, **extra_fields)


# ✅ AdminRegistration model (untouched as requested)
class AdminRegistration(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=150, unique=True)
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=15, unique=True)
    email = models.EmailField(unique=True)
    pan_card = models.CharField(max_length=10, unique=True)
    company_name = models.CharField(max_length=255)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'phone_number', 'pan_card']

    objects = AdminUserManager()

    def __str__(self):
        return self.username


# ✅ Company model (final clean version)

class Company(models.Model):
    company_name = models.CharField(max_length=255)
    pan_number = models.CharField(max_length=10, unique=True)
    email = models.EmailField()
    phone_number = models.CharField(max_length=15)
    address = models.TextField()
    gst_number = models.CharField(max_length=15, blank=True, null=True)
    industry_type = models.CharField(max_length=100, blank=True, null=True)
    website_url = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)  # ✅ ADD THIS LINE
    admin = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    chart_of_accounts_type = models.CharField(
        max_length=10, choices=[('default', 'Default'), ('custom', 'Custom')], default='default')

    def __str__(self):
        return self.company_name

# ✅ Role & UserRole Models
class Role(models.Model):
    name = models.CharField(max_length=50)
    permissions = models.TextField()

    def __str__(self):
        return self.name


class UserRole(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.user.username} - {self.role.name}"
