from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Run migrations and create initial admin user'

    def handle(self, *args, **options):
        call_command('migrate', interactive=False)

        User = get_user_model()
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(username='admin', email='admin@example.com', password='admin1234')
            self.stdout.write(self.style.SUCCESS('✅ Admin user created.'))
        else:
            self.stdout.write(self.style.WARNING('⚠️ Admin user already exists.'))
