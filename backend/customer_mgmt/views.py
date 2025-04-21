from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .models import Customer
from .serializers import CustomerSerializer
from user_mgmt.models import Company


class CustomerListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company_id = request.query_params.get('company')

        if not company_id:
            return Response({'error': 'Company ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({'error': 'Invalid company ID'}, status=status.HTTP_404_NOT_FOUND)

        customers = Customer.objects.filter(company=company)
        serializer = CustomerSerializer(customers, many=True)
        return Response(serializer.data)

    def post(self, request):
        company_id = request.data.get('company')

        if not company_id:
            return Response({'error': 'Company ID is required in request body'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({'error': 'Invalid company ID'}, status=status.HTTP_404_NOT_FOUND)

        name = request.data.get('name')
        if Customer.objects.filter(name=name, company=company).exists():
            return Response({"error": "Customer with this name already exists in your company."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CustomerSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(company=company)  # ✅ company assigned here
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

# T0 get customer list
class CustomerListByCompanyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, company_id):
        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({'error': 'Invalid company ID'}, status=status.HTTP_404_NOT_FOUND)

        customers = Customer.objects.filter(company=company)
        serializer = CustomerSerializer(customers, many=True)
        return Response(serializer.data)

    def post(self, request, company_id):
        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({'error': 'Invalid company ID'}, status=status.HTTP_404_NOT_FOUND)

        serializer = CustomerSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(company=company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



class CustomerRetrieveUpdateDestroyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        try:
            # Get the company associated with the logged-in user
            company = request.user.company  # Assuming you have a relationship to Company from User
            
            # Fetch the customer that belongs to the logged-in user's company
            customer = Customer.objects.get(id=id, company=company)
        except Customer.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CustomerSerializer(customer)
        return Response(serializer.data)

    def put(self, request, id):
        try:
            # Get the company associated with the logged-in user
            company = request.user.company  # Assuming you have a relationship to Company from User
            
            # Fetch the customer that belongs to the logged-in user's company
            customer = Customer.objects.get(id=id, company=company)
        except Customer.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CustomerSerializer(customer, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, id):
        try:
            # Get the company associated with the logged-in user
            company = request.user.company  # Assuming you have a relationship to Company from User
            
            # Fetch the customer that belongs to the logged-in user's company
            customer = Customer.objects.get(id=id, company=company)
        except Customer.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        customer.delete()
        return Response({"detail": "Deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
