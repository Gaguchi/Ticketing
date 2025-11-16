from django.contrib.auth.models import User
from django.test import TestCase

from tickets.models import Column, Company, Project, Ticket


class CompanyProjectIsolationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="companytester",
            email="companytester@example.com",
            password="password123",
        )
        self.project_one = Project.objects.create(key="P1", name="Project One")
        self.project_two = Project.objects.create(key="P2", name="Project Two")
        self.project_one.members.add(self.user)
        self.project_two.members.add(self.user)

        self.column_one = Column.objects.create(name="To Do", project=self.project_one, order=1)
        self.column_two = Column.objects.create(name="To Do", project=self.project_two, order=1)

    def test_companies_with_same_name_are_independent_per_project(self):
        """Two companies can share a name if they belong to different projects."""
        company_one = Company.objects.create(name="Acme Corp")
        company_two = Company.objects.create(name="Acme Corp")

        self.project_one.companies.add(company_one)
        self.project_two.companies.add(company_two)

        ticket_one = Ticket.objects.create(
            name="Issue P1",
            project=self.project_one,
            column=self.column_one,
            company=company_one,
            type="task",
            status="new",
            priority_id=2,
            urgency="normal",
            importance="normal",
        )
        ticket_two = Ticket.objects.create(
            name="Issue P2",
            project=self.project_two,
            column=self.column_two,
            company=company_two,
            type="task",
            status="new",
            priority_id=2,
            urgency="normal",
            importance="normal",
        )

        self.assertNotEqual(company_one.id, company_two.id)
        self.assertEqual(company_one.tickets.count(), 1)
        self.assertEqual(company_two.tickets.count(), 1)
        self.assertIn(ticket_one, company_one.tickets.all())
        self.assertIn(ticket_two, company_two.tickets.all())
        self.assertEqual(list(self.project_one.companies.all()), [company_one])
        self.assertEqual(list(self.project_two.companies.all()), [company_two])
