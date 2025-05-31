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




from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .models import Company
from .serializers import CompanySerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_company_details(request, company_id):
    try:
        print(f"🔁 Attempting to fetch company details for ID: {company_id}")
        
        company = get_object_or_404(Company, id=company_id)

        # Admin access check
        if company.admin != request.user:
            print(f"⛔ Access denied: {request.user.username} is not the admin of company ID {company_id}")
            return JsonResponse({'error': 'Unauthorized access'}, status=403)

        print(f"✅ Company data fetched for ID {company_id}: {company.company_name}")

        # Serialize for absolute media URLs
        serializer = CompanySerializer(company, context={'request': request})
        data = serializer.data  # contains logo_url, qr_code_url, signature_url

        company_data = {
            "company_name": company.company_name,
            "pan_number": company.pan_number,
            "email": company.email,
            "phone_number": company.phone_number,
            "address": company.address,
            "gst_number": company.gst_number,
            "industry_type": company.industry_type,
            "website_url": company.website_url,
            "is_active": company.is_active,
            "account_name": company.account_name,
            "account_number": company.account_number,
            "bank_name": company.bank_name,
            "branch": company.branch,
            "ifsc_code": company.ifsc_code,
            "upi_id": company.upi_id,

            # ✅ Serialized absolute URLs
            "logo": data.get("logo_url"),
            "qr_code": data.get("qr_code_url"),
            "signature": data.get("signature_url"),
        }

        print(f"🧾 Final company data returned: {company_data}")
        return JsonResponse(company_data, status=200)

    except Company.DoesNotExist:
        print(f"❌ Company with ID {company_id} does not exist.")
        return JsonResponse({"error": "Company not found"}, status=404)





    # To update company details




@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_company_profile(request, company_id):
    print(f"🔐 Authenticated user: {request.user} | Is authenticated: {request.user.is_authenticated}")
    
    if not request.user.is_authenticated:
        print("❌ Unauthorized access attempt: token is expired or invalid")
        return Response({'error': 'Authentication required or token expired.'}, status=401)

    print(f"🔄 Incoming PATCH update request for company ID: {company_id}")

    try:
        company = Company.objects.get(id=company_id)
        print(f"✅ Company found: {company.company_name}")
    except Company.DoesNotExist:
        print(f"❌ Company with ID {company_id} does not exist.")
        return Response({'error': 'Company not found'}, status=404)

    # Optional admin check
    if company.admin != request.user:
        print(f"⛔ Access denied: {request.user.username} is not the admin of company ID {company_id}")
        return Response({'error': 'You are not authorized to update this company.'}, status=403)

    serializer = CompanySerializer(company, data=request.data, partial=True)

    if serializer.is_valid():
        updated_company = serializer.save()
        print(f"📝 Company profile updated by {request.user.username}: {updated_company.company_name}")
        return Response(serializer.data)
    else:
        print(f"⚠️ Validation error during company update: {serializer.errors}")
        return Response(serializer.errors, status=400)
