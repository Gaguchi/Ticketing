from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tickets", "0015_ticket_archived_at_ticket_archived_by_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="company",
            name="name",
            field=models.CharField(max_length=255),
        ),
    ]
