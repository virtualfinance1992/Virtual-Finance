from django.shortcuts import render
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from user_mgmt.models import AdminRegistration, Company
from user_mgmt.serializers import AdminRegistrationSerializer, UserRoleSerializer, CompanySerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
import logging

# Create a logger
logger = logging.getLogger(__name__)

from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import AdminRegistrationSerializer

class AdminRegistrationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = AdminRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            admin = serializer.save()
            return Response({"message": "Admin registered successfully", "admin_id": admin.id}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Company
from .serializers import CompanySerializer
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_company(request):
    print("Incoming request data:", request.data)
    required_fields = [
        'company_name', 'address', 'phone_number', 'email', 'pan_number',"gst_number", "industry_type", "website_url"
    ]

    # Validate required fields
    for field in required_fields:
        if field not in request.data:
            return Response({"detail": f"{field} is required."}, status=status.HTTP_400_BAD_REQUEST)

    # Check if the PAN number already exists
    pan = request.data.get('pan_number')
    if Company.objects.filter(pan_number=pan).exists():
        return Response(
            {"detail": f"Company with PAN number '{pan}' already exists."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create the company with all available fields (including extra fields like gst_number, industry_type, website_url)
    company = Company.objects.create(
        admin=request.user,
        company_name=request.data['company_name'],
        address=request.data['address'],
        phone_number=request.data['phone_number'],
        email=request.data['email'],
        pan_number=pan,
        gst_number=request.data.get('gst_number'),
        industry_type=request.data.get('industry_type'),
        website_url=request.data.get('website_url'),
    )

    # Serialize the company data and return a response
    serializer = CompanySerializer(company)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_companies(request):
    companies = Company.objects.all()
    serializer = CompanySerializer(companies, many=True)
    return Response(serializer.data)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_company(request, company_id):
    try:
        company = Company.objects.get(id=company_id)
        company.delete()
        return Response({'message': 'Company deleted'}, status=204)
    except Company.DoesNotExist:
        return Response({'error': 'Company not found'}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def activate_company(request, company_id):
    try:
        company = Company.objects.get(id=company_id)
        company.is_active = not company.is_active
        company.save()
        return Response({'message': 'Company status updated'})
    except Company.DoesNotExist:
        return Response({'error': 'Company not found'}, status=404)

# user_mgmt/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_role(request):
    # sample dummy logic
    return Response({"message": "Role assigned successfully"})
