from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Create an admin user for deployment'

    def handle(self, *args, **kwargs):
        call_command('migrate', interactive=False)
        User = get_user_model()
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@example.com', 'admin1234')
            self.stdout.write(self.style.SUCCESS("✅ Admin user created."))
        else:
            self.stdout.write(self.style.WARNING("ℹ️ Admin already exists."))
