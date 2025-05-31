from django.urls import path
from .views import create_company, list_companies

urlpatterns = [
    path('create/', create_company, name='create_company'),
    path('list/', list_companies, name='list_companies'),
]
