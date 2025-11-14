from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from tickets.models import Column, Project, Ticket
from tickets.services import auto_archive_completed_tickets


class TicketArchivingTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="archiver",
            email="archiver@example.com",
            password="password123",
        )
        self.project = Project.objects.create(key="ARC", name="Archive Project")
        self.project.members.add(self.user)
        self.todo_column = Column.objects.create(name="To Do", project=self.project, order=1)
        self.done_column = Column.objects.create(name="Done", project=self.project, order=4)

    def create_ticket(self, column=None):
        column = column or self.todo_column
        return Ticket.objects.create(
            name="Test Ticket",
            project=self.project,
            column=column,
            type="task",
            status="new",
            priority_id=2,
            urgency="normal",
            importance="normal",
        )

    def test_done_at_set_when_ticket_enters_done_column(self):
        ticket = self.create_ticket(column=self.todo_column)
        self.assertIsNone(ticket.done_at)

        ticket.column = self.done_column
        ticket.status = "done"
        ticket.save()

        self.assertIsNotNone(ticket.done_at)

        ticket.column = self.todo_column
        ticket.status = "in_progress"
        ticket.save()
        self.assertIsNone(ticket.done_at)

    def test_auto_archive_archives_old_done_tickets(self):
        ticket = self.create_ticket(column=self.done_column)
        self.assertTrue(ticket.done_at)

        ticket.done_at = timezone.now() - timedelta(days=5)
        ticket.save(update_fields=["done_at"])

        archived_count = auto_archive_completed_tickets(project_id=self.project.id)
        self.assertEqual(archived_count, 1)

        ticket.refresh_from_db()
        self.assertTrue(ticket.is_archived)
        self.assertIsNotNone(ticket.archived_at)
        self.assertEqual(ticket.archived_reason, "Auto-archived after 3 days in Done")
