from django.db import models
from user_mgmt.models import Company

class Customer(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='customers')
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, default='Not Provided')
    address = models.CharField(max_length=255, default='Not Provided')
    gst_number = models.CharField(max_length=15, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
