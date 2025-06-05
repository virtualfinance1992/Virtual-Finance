from django.urls import path
from .views import ping

urlpatterns = [
    path("health/", ping),
]
