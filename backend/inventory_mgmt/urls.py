from django.urls import path
from .views import list_inventory_items, get_stock_history, create_inventory_item

urlpatterns = [
    path('items/<int:company_id>/', list_inventory_items, name='inventory-items'),
    path('items/create/<int:company_id>/', create_inventory_item, name='create-inventory-item'),
    path('history/<int:company_id>/', get_stock_history, name='stock-history'),
]


