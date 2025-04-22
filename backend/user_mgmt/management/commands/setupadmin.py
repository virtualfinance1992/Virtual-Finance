from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = "Create admin user if not exists"

    def handle(self, *args, **kwargs):
        User = get_user_model()
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser("admin", "admin@example.com", "admin1234")
            self.stdout.write(self.style.SUCCESS("✅ Admin user created"))
        else:
            self.stdout.write("ℹ️ Admin already exists.")
