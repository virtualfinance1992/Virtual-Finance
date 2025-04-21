from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Creates the default admin user'

    def handle(self, *args, **kwargs):
        User = get_user_model()
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser(
                username="admin",
                email="admin@virtualfinance.com",
                password="admin1234"
            )
            self.stdout.write(self.style.SUCCESS("✅ Superuser 'admin' created."))
        else:
            self.stdout.write(self.style.WARNING("⚠️ Superuser 'admin' already exists."))
