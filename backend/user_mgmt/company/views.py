from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from user_mgmt.models import Company  

from .serializers import CompanySerializer  # Update path if needed

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_company(request):
    try:
        # Get authenticated user from token
        user = request.user
        print("User making request:", user.username)

        # Validate and pass admin explicitly
        serializer = CompanySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(admin=user)  # Link to logged-in user
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_companies(request):
    companies = Company.objects.filter(admin=request.user)  # ✅ Only show their companies
    serializer = CompanySerializer(companies, many=True)
    return Response(serializer.data)