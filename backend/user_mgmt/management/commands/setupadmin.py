from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        User = get_user_model()
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser(username="admin", password="admin1234")
            self.stdout.write(self.style.SUCCESS("✅ Superuser 'admin' created"))
        else:
            self.stdout.write("ℹ️ Admin already exists.")
