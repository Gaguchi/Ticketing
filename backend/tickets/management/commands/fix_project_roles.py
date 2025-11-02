from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from tickets.models import Project, UserRole


class Command(BaseCommand):
    help = 'Assign superadmin role to existing project creators'

    def handle(self, *args, **options):
        """
        For each existing project:
        1. Find the project creator (first member or lead_username)
        2. Check if they have a UserRole
        3. If not, create UserRole with role='superadmin'
        """
        
        projects = Project.objects.all()
        fixed_count = 0
        skipped_count = 0
        
        self.stdout.write(f"\n🔍 Checking {projects.count()} projects...\n")
        
        for project in projects:
            self.stdout.write(f"📁 Project: {project.key} - {project.name}")
            
            # Try to determine the project creator
            creator = None
            
            # Method 1: Check lead_username
            if project.lead_username:
                try:
                    creator = User.objects.get(username=project.lead_username)
                    self.stdout.write(f"   → Found lead: {creator.username}")
                except User.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f"   ⚠️  Lead username '{project.lead_username}' not found")
                    )
            
            # Method 2: If no lead, use first member
            if not creator and project.members.exists():
                creator = project.members.first()
                self.stdout.write(f"   → Using first member: {creator.username}")
            
            if not creator:
                self.stdout.write(self.style.ERROR("   ❌ No creator found - skipping"))
                skipped_count += 1
                continue
            
            # Check if UserRole already exists
            existing_role = UserRole.objects.filter(
                user=creator,
                project=project
            ).first()
            
            if existing_role:
                self.stdout.write(
                    self.style.SUCCESS(f"   ✅ UserRole already exists: {existing_role.role}")
                )
                skipped_count += 1
                continue
            
            # Create UserRole with 'superadmin'
            UserRole.objects.create(
                user=creator,
                project=project,
                role='superadmin',
                assigned_by=creator  # Self-assigned
            )
            
            self.stdout.write(
                self.style.SUCCESS(f"   🎉 Created UserRole: {creator.username} as 'superadmin'")
            )
            fixed_count += 1
        
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS(f"✅ Fixed: {fixed_count} projects"))
        self.stdout.write(f"⏭️  Skipped: {skipped_count} projects (already have roles)")
        self.stdout.write(f"📊 Total: {projects.count()} projects")
        self.stdout.write("="*60 + "\n")
