"""
Database Reset Management Command for Development

This command safely resets the database by:
1. Dropping all tables
2. Running migrations from scratch
3. Optionally creating a superuser
4. Optionally loading initial data

⚠️ WARNING: This will DELETE ALL DATA in the database!
Only use this in development environments.
"""

from django.core.management.base import BaseCommand, CommandError
from django.core.management import call_command
from django.db import connection
from django.conf import settings
import os


class Command(BaseCommand):
    help = 'Reset the database (DEV ONLY - deletes all data!)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--no-input',
            action='store_true',
            help='Skip confirmation prompts',
        )
        parser.add_argument(
            '--create-superuser',
            action='store_true',
            help='Create a default superuser after reset',
        )
        parser.add_argument(
            '--load-fixtures',
            action='store_true',
            help='Load initial fixtures after reset',
        )
        parser.add_argument(
            '--force-dev',
            action='store_true',
            help='Force run in development mode (bypasses DEBUG check - use with caution!)',
        )

    def handle(self, *args, **options):
        # Safety check - only allow in DEBUG mode or with --force-dev flag
        if not settings.DEBUG and not options.get('force_dev'):
            raise CommandError(
                '❌ Database reset is only allowed when DEBUG=True\n'
                'This prevents accidental data loss in production.\n\n'
                'If you are sure this is a development environment, you can:\n'
                '  1. Set DEBUG=True in your .env file (recommended), OR\n'
                '  2. Use --force-dev flag (use with extreme caution!)\n'
                '\n⚠️  NEVER use this command on production data!'
            )

        # Confirmation prompt
        if not options['no_input']:
            self.stdout.write(
                self.style.WARNING('\n⚠️  WARNING: This will DELETE ALL DATA in the database!\n')
            )
            confirm = input('Are you sure you want to reset the database? Type "yes" to continue: ')
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.ERROR('❌ Database reset cancelled.'))
                return

        self.stdout.write(self.style.WARNING('\n🔄 Starting database reset...\n'))

        # Step 1: Drop all tables
        self.stdout.write('📋 Step 1/4: Dropping all tables...')
        self._drop_all_tables()
        self.stdout.write(self.style.SUCCESS('✅ All tables dropped\n'))

        # Step 2: Run migrations
        self.stdout.write('📋 Step 2/4: Running migrations...')
        call_command('migrate', '--noinput', verbosity=0)
        self.stdout.write(self.style.SUCCESS('✅ Migrations completed\n'))

        # Step 3: Create superuser if requested
        if options['create_superuser']:
            self.stdout.write('📋 Step 3/4: Creating superuser...')
            self._create_default_superuser()
        else:
            self.stdout.write('📋 Step 3/4: Skipping superuser creation')

        # Step 4: Load fixtures if requested
        if options['load_fixtures']:
            self.stdout.write('\n📋 Step 4/4: Loading fixtures...')
            self._load_fixtures()
        else:
            self.stdout.write('\n📋 Step 4/4: Skipping fixtures')

        self.stdout.write(
            self.style.SUCCESS(
                '\n✅ Database reset complete!\n'
                f'Database: {settings.DATABASES["default"]["NAME"]}\n'
                f'Host: {settings.DATABASES["default"]["HOST"]}\n'
            )
        )

        if options['create_superuser']:
            self.stdout.write(
                self.style.WARNING(
                    '\n🔐 Default Superuser Credentials:\n'
                    '   Username: admin\n'
                    '   Password: admin123\n'
                    '   ⚠️  Change this password in production!\n'
                )
            )

    def _drop_all_tables(self):
        """Drop all tables in the database."""
        with connection.cursor() as cursor:
            # Get all table names
            cursor.execute("""
                SELECT tablename FROM pg_tables
                WHERE schemaname = 'public'
            """)
            tables = cursor.fetchall()

            # Drop each table
            for table in tables:
                table_name = table[0]
                cursor.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')

            # Also drop the django_migrations table to start fresh
            cursor.execute('DROP TABLE IF EXISTS django_migrations CASCADE')

    def _create_default_superuser(self):
        """Create a default superuser for development."""
        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            if not User.objects.filter(username='admin').exists():
                User.objects.create_superuser(
                    username='admin',
                    email='admin@example.com',
                    password='admin123'
                )
                self.stdout.write(self.style.SUCCESS('✅ Superuser created (admin/admin123)\n'))
            else:
                self.stdout.write(self.style.WARNING('⚠️  Superuser already exists\n'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error creating superuser: {e}\n'))

    def _load_fixtures(self):
        """Load initial fixtures if they exist."""
        fixtures_dir = os.path.join(settings.BASE_DIR, 'fixtures')
        
        if not os.path.exists(fixtures_dir):
            self.stdout.write(self.style.WARNING('⚠️  No fixtures directory found'))
            return

        fixtures = [f for f in os.listdir(fixtures_dir) if f.endswith('.json')]
        
        if not fixtures:
            self.stdout.write(self.style.WARNING('⚠️  No fixture files found'))
            return

        for fixture in fixtures:
            try:
                call_command('loaddata', fixture, verbosity=0)
                self.stdout.write(self.style.SUCCESS(f'✅ Loaded {fixture}'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Error loading {fixture}: {e}'))
