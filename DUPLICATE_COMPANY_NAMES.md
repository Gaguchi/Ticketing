# Duplicate Company Names Feature

## Overview
The ticketing system now supports multiple companies with identical names, as long as they are assigned to different projects. This feature enables flexible multi-tenant environments where different teams or departments can manage their own company lists independently.

## Key Features

### 1. Non-Unique Company Names
- Company names are **NOT globally unique**
- Multiple companies can share the same name in the database
- Companies are distinguished by their unique `id` field

### 2. Project-Based Scoping
- Companies are associated with projects via `Project.companies` (Many-to-Many relationship)
- Each company can belong to multiple projects
- Each project can have multiple companies
- The UI filters companies based on the selected project

### 3. Separate Ticket Queues
- Tickets reference companies by `id`, not by name
- Two companies with the same name maintain completely separate ticket lists
- Ticket filtering and assignment work correctly regardless of duplicate names

## Implementation Details

### Database Schema

```python
class Company(models.Model):
    name = models.CharField(max_length=255)  # No unique constraint
    description = models.TextField(...)
    # ... other fields
    
    class Meta:
        ordering = ['name']
        # Note: No unique_together or unique constraint on 'name'

class Project(models.Model):
    # ...
    companies = models.ManyToManyField('Company', related_name='projects', ...)

class Ticket(models.Model):
    # ...
    company = models.ForeignKey(Company, ...)  # References specific company instance
    project = models.ForeignKey(Project, ...)
```

### Migration
- **File**: `backend/tickets/migrations/0016_company_name_nonunique.py`
- **Purpose**: Ensures the `Company.name` field has no unique constraint
- **Applied**: Yes (already in production)

### Backend API

**Endpoint**: `GET /api/tickets/companies/`

**Query Parameters**:
- `?project={id}` - Filter companies by project (optional)

**Examples**:
```bash
# Get all companies user has access to
GET /api/tickets/companies/

# Get only companies assigned to Project 5
GET /api/tickets/companies/?project=5
```

**Creating Companies**:
```json
POST /api/tickets/companies/
{
  "name": "Acme Corp",
  "description": "...",
  "project_ids": [1, 2, 3]
}
```

### Frontend Implementation

**Companies Page** (`frontend/src/pages/Companies.tsx`):
- Automatically filters companies by selected project
- Shows project context in the header
- New companies are auto-associated with the selected project

**Company Selection**:
- Always uses company `id` for referencing
- Dropdowns and selectors work correctly with duplicate names
- Users see only companies relevant to their current project context

## Use Cases

### Case 1: Same Client, Different Services
```
Project: IT Support
└── Company: "Acme Corp" (id=1) - Internal IT tickets

Project: Consulting Services  
└── Company: "Acme Corp" (id=2) - External consulting tickets

Result: Complete separation of ticket queues
```

### Case 2: Multi-Tenant Departments
```
Project: HR Department
└── Company: "Main Office" (id=1)
    ├── Ticket A: "Fix printer"
    └── Ticket B: "Update employee records"

Project: IT Department
└── Company: "Main Office" (id=2)
    ├── Ticket C: "Server maintenance"
    └── Ticket D: "Network issue"

Result: Each department manages their own "Main Office" company independently
```

### Case 3: Testing/Staging Environments
```
Project: Production
└── Company: "Test Client" (id=1) - Real production data

Project: Staging
└── Company: "Test Client" (id=2) - Test data

Result: Same name, different data, no conflicts
```

## Best Practices

### ✅ DO

**Always reference companies by ID**:
```python
# Backend
company = Company.objects.get(id=company_id)
ticket.company = company

# API requests
POST /api/tickets/tickets/
{
  "company": 5  # Use ID
}
```

**Filter by project when showing companies**:
```python
# Backend
companies = Company.objects.filter(projects__id=project_id)

# Frontend
const url = `${API_ENDPOINTS.COMPANIES}?project=${selectedProject.id}`;
```

**Include project context in displays** (if needed):
```jsx
// Show company with project indicator if duplicates might exist
<Select>
  {companies.map(company => (
    <Option key={company.id} value={company.id}>
      {company.name}
      {company.project_count > 1 && ` (${company.project_count} projects)`}
    </Option>
  ))}
</Select>
```

### ❌ DON'T

**Don't query by name alone**:
```python
# ❌ WRONG - Will fail if multiple "Acme Corp" exist
company = Company.objects.get(name="Acme Corp")  # MultipleObjectsReturned!

# ✅ CORRECT
company = Company.objects.get(id=company_id)
```

**Don't assume names are unique**:
```python
# ❌ WRONG - Assumes unique name
company_name = "Acme Corp"
ticket.company = Company.objects.get(name=company_name)

# ✅ CORRECT - Use ID
ticket.company_id = 5
```

**Don't filter tickets by company name**:
```python
# ❌ WRONG - May return tickets from wrong company
tickets = Ticket.objects.filter(company__name="Acme Corp")

# ✅ CORRECT - Use company ID
tickets = Ticket.objects.filter(company_id=company_id)
```

## Troubleshooting

### Issue: "MultipleObjectsReturned" Error

**Cause**: Code is using `.get(name=...)` to query companies

**Solution**: Always use `.get(id=...)` or `.filter(name=..., projects__id=...)`

```python
# Before (broken)
company = Company.objects.get(name=request.data['company_name'])

# After (fixed)
company = Company.objects.get(id=request.data['company_id'])
```

### Issue: Wrong Tickets Showing for Company

**Cause**: Filtering tickets by company name instead of company ID

**Solution**: Always filter by the specific company instance

```python
# Before (broken)
tickets = Ticket.objects.filter(
    project=project,
    company__name="Acme Corp"
)

# After (fixed)  
tickets = Ticket.objects.filter(
    project=project,
    company_id=company_id
)
```

### Issue: Company Dropdown Shows Duplicates

**Expected Behavior**: This is correct! Multiple companies with the same name can exist.

**If confusing to users**: Add project context to dropdown labels:

```jsx
<Select>
  {companies.map(company => (
    <Option key={company.id} value={company.id}>
      {company.name}
      {showProjectInfo && ` (Projects: ${company.project_count})`}
    </Option>
  ))}
</Select>
```

## Testing Scenarios

### Test 1: Create Duplicate Company Names
1. Select Project A
2. Create company named "Test Company"
3. Select Project B  
4. Create another company named "Test Company"
5. Verify both appear in their respective projects
6. Verify they have different IDs

### Test 2: Ticket Assignment with Duplicates
1. Create two companies with same name in different projects
2. Create ticket in Project A, assign to first company
3. Create ticket in Project B, assign to second company
4. Verify tickets only show in their respective company views
5. Verify ticket counts are separate

### Test 3: Company Filtering
1. Create company "Shared Co" assigned to Projects A and B
2. Select Project A → verify "Shared Co" appears
3. Select Project B → verify "Shared Co" appears
4. Verify it's the same company instance (same ID)

## Migration Path (If Previously Unique)

If your installation previously enforced unique company names:

1. **Backup Database** - Always backup before migrations
2. **Check for Unique Constraint**:
   ```sql
   -- PostgreSQL
   SELECT constraint_name 
   FROM information_schema.table_constraints 
   WHERE table_name = 'tickets_company' 
   AND constraint_type = 'UNIQUE';
   ```
3. **Apply Migration**: `python manage.py migrate tickets 0016`
4. **Verify**: Try creating duplicate company names
5. **Update Code**: Search codebase for `.get(name=...)` and replace with `.get(id=...)`

## Documentation References

- **Main Reference**: `PROJECT_REFERENCE.md` - Version 1.19
- **Model Definition**: `backend/tickets/models.py` - Company class
- **API View**: `backend/tickets/views.py` - CompanyViewSet
- **Frontend**: `frontend/src/pages/Companies.tsx`

## Summary

This feature provides the flexibility needed for multi-tenant ticketing systems while maintaining data integrity through proper ID-based references. Companies with duplicate names are isolated by their project associations, ensuring that tickets, users, and admins remain properly separated.

**Key Takeaway**: Always reference companies by **ID**, never by **name** alone.
