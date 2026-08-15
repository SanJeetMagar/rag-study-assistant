"""
Clear documents stranded mid-ingestion.

Ingestion runs in a background thread, so a server restart while a document is
processing leaves it stuck at 'processing' forever with nothing to finish it.
This is the documented cost of not running Celery.
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.documents.models import Document
from services.ingestion import process_document_async


class Command(BaseCommand):
    help = 'Re-run ingestion for documents stuck in the processing state.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--older-than',
            type=int,
            default=15,
            help='Minutes a document must have been processing to count as stuck.',
        )

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(minutes=options['older_than'])
        stuck = Document.objects.filter(
            status=Document.Status.PROCESSING, uploaded_at__lt=cutoff
        )

        if not stuck.exists():
            self.stdout.write(self.style.SUCCESS('No stuck documents.'))
            return

        for document in stuck:
            self.stdout.write(f'Requeuing "{document.title}" (id={document.pk})')
            process_document_async(document)

        self.stdout.write(self.style.SUCCESS(f'Requeued {stuck.count()} document(s).'))
