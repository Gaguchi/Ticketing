"""
Script to add default columns to projects that are missing them.
This ensures all projects have the standard Kanban columns.

Run with: python manage.py shell < fix_project_columns.py
Or: python fix_project_columns.py
"""

import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from tickets.models import Project, Column

# Default columns that should exist in every project
DEFAULT_COLUMNS = [
    {'name': 'To Do', 'order': 1},
    {'name': 'In Progress', 'order': 2},
    {'name': 'Review', 'order': 3},
    {'name': 'Done', 'order': 4},
]


def fix_project_columns(dry_run=False):
    """
    Check all projects and add default columns to those missing them.
    
    Args:
        dry_run: If True, only report what would be done without making changes
    """
    projects = Project.objects.all()
    fixed_count = 0
    skipped_count = 0
    
    mode = "[DRY RUN] " if dry_run else ""
    
    print(f"\n{mode}🔍 Checking {projects.count()} projects for missing columns...\n")
    print("=" * 70)
    
    for project in projects:
        existing_columns = list(project.columns.values_list('name', flat=True))
        column_count = len(existing_columns)
        
        print(f"\n📁 Project: {project.key} - {project.name}")
        print(f"   Existing columns ({column_count}): {existing_columns if existing_columns else '(none)'}")
        
        if column_count == 0:
            # Project has no columns - create all defaults
            print(f"   ❌ No columns found!")
            
            if not dry_run:
                created_columns = []
                for col_data in DEFAULT_COLUMNS:
                    col = Column.objects.create(
                        project=project,
                        name=col_data['name'],
                        order=col_data['order']
                    )
                    created_columns.append(f"{col.name} (id={col.id})")
                
                print(f"   ✅ Created {len(DEFAULT_COLUMNS)} columns: {created_columns}")
            else:
                print(f"   🔄 Would create: {[c['name'] for c in DEFAULT_COLUMNS]}")
            
            fixed_count += 1
        
        elif column_count < len(DEFAULT_COLUMNS):
            # Project has some columns but not all defaults
            missing = [c['name'] for c in DEFAULT_COLUMNS if c['name'] not in existing_columns]
            
            if missing:
                print(f"   ⚠️  Missing columns: {missing}")
                
                if not dry_run:
                    max_order = project.columns.aggregate(models.Max('order'))['order__max'] or 0
                    created_columns = []
                    
                    for col_data in DEFAULT_COLUMNS:
                        if col_data['name'] not in existing_columns:
                            max_order += 1
                            col = Column.objects.create(
                                project=project,
                                name=col_data['name'],
                                order=max_order
                            )
                            created_columns.append(f"{col.name} (id={col.id})")
                    
                    print(f"   ✅ Created missing columns: {created_columns}")
                else:
                    print(f"   🔄 Would create: {missing}")
                
                fixed_count += 1
            else:
                print(f"   ✅ Has all required column names")
                skipped_count += 1
        else:
            # Project has 4+ columns
            print(f"   ✅ Has {column_count} columns - looks good!")
            skipped_count += 1
    
    print("\n" + "=" * 70)
    print(f"\n{mode}📊 Summary:")
    print(f"   🔧 Fixed: {fixed_count} projects")
    print(f"   ⏭️  Skipped: {skipped_count} projects (already have columns)")
    print(f"   📁 Total: {projects.count()} projects")
    print()
    
    return fixed_count, skipped_count


def show_all_columns():
    """Display all columns for all projects"""
    from django.db import models as db_models
    
    print("\n📋 All Columns by Project:\n")
    print("=" * 70)
    
    for project in Project.objects.all():
        columns = project.columns.all().order_by('order')
        print(f"\n📁 {project.key} - {project.name}")
        
        if columns.exists():
            for col in columns:
                print(f"   [{col.order}] {col.name} (id={col.id})")
        else:
            print("   ❌ No columns!")
    
    print("\n" + "=" * 70)


if __name__ == '__main__':
    from django.db import models
    
    # Parse arguments
    args = sys.argv[1:]
    
    if '--help' in args or '-h' in args:
        print("""
Usage: python fix_project_columns.py [OPTIONS]

Options:
  --dry-run     Show what would be done without making changes
  --show        Show all columns for all projects
  --help, -h    Show this help message

Examples:
  python fix_project_columns.py --dry-run    # Preview changes
  python fix_project_columns.py              # Apply fixes
  python fix_project_columns.py --show       # View current state
        """)
        sys.exit(0)
    
    if '--show' in args:
        show_all_columns()
    elif '--dry-run' in args:
        fix_project_columns(dry_run=True)
    else:
        fix_project_columns(dry_run=False)
