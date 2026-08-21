"""
End-to-end API tests.

The mock generation provider is forced throughout, so the whole suite runs
with no network access and no API spend. Embeddings are real -- the retrieval
path is what these tests exist to prove.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.chat.models import ChatSession
from apps.courses.models import Course
from apps.documents.models import Document, DocumentChunk
from services.embedder import embed_text
from services.generation import reset_provider_cache

User = get_user_model()


@override_settings(LLM_PROVIDER='mock')
class ApiTestCase(TestCase):
    """Shared fixtures: one teacher with a course, one enrolled student."""

    def setUp(self):
        reset_provider_cache()
        self.client = APIClient()

        self.teacher = User.objects.create_user(
            username='teacher', email='teacher@tu.edu.np',
            password='syllabus-pass-123', role=User.Role.TEACHER,
        )
        self.student = User.objects.create_user(
            username='student', email='student@tu.edu.np',
            password='syllabus-pass-123', role=User.Role.STUDENT,
        )
        self.course = Course.objects.create(
            title='Computer Networks - 7th Sem', teacher=self.teacher
        )
        self.course.students.add(self.student)

    def auth(self, user):
        self.client.force_authenticate(user=user)


class AuthTests(ApiTestCase):
    def test_register_then_login_returns_tokens_and_user(self):
        response = self.client.post('/api/auth/register/', {
            'username': 'newbie', 'email': 'newbie@tu.edu.np',
            'password': 'a-strong-passphrase-42', 'role': 'student',
        }, format='json')
        self.assertEqual(response.status_code, 201)

        response = self.client.post('/api/auth/login/', {
            'email': 'newbie@tu.edu.np', 'password': 'a-strong-passphrase-42',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['role'], 'student')

    def test_endpoints_reject_anonymous_callers(self):
        self.assertEqual(self.client.get('/api/courses/').status_code, 401)


class CourseTests(ApiTestCase):
    def test_teacher_creates_course_and_gets_a_share_code(self):
        self.auth(self.teacher)
        response = self.client.post(
            '/api/courses/', {'title': 'Operating Systems'}, format='json'
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data['course_code']), 6)
        self.assertEqual(response.data['my_role'], 'teacher')

    def test_student_joins_by_code(self):
        other = Course.objects.create(title='Databases', teacher=self.teacher)
        self.auth(self.student)

        response = self.client.post(
            '/api/courses/join/', {'course_code': other.course_code}, format='json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(other.students.filter(pk=self.student.pk).exists())

    def test_join_with_a_bad_code_is_rejected(self):
        self.auth(self.student)
        response = self.client.post(
            '/api/courses/join/', {'course_code': 'NOPE99'}, format='json'
        )
        self.assertEqual(response.status_code, 400)

    def test_course_list_excludes_courses_the_user_has_no_part_in(self):
        stranger = User.objects.create_user(
            username='stranger', email='stranger@tu.edu.np', password='x-y-z-123456'
        )
        self.auth(stranger)
        response = self.client.get('/api/courses/')
        self.assertEqual(response.data['count'], 0)


class EnrollmentSecurityTests(ApiTestCase):
    """
    The source spec passed course_id straight into the retriever with no
    authorization check, so any authenticated student could read any course.
    """

    def setUp(self):
        super().setUp()
        self.private = Course.objects.create(
            title='Someone Else\'s Course', teacher=self.teacher
        )
        self.outsider = User.objects.create_user(
            username='outsider', email='outsider@tu.edu.np', password='x-y-z-123456'
        )

    def test_asking_about_an_unenrolled_course_is_forbidden(self):
        self.auth(self.outsider)
        response = self.client.post('/api/chat/ask/', {
            'question': 'What is in this syllabus?', 'course_id': self.private.id,
        }, format='json')
        self.assertEqual(response.status_code, 403)

    def test_listing_documents_of_an_unenrolled_course_is_forbidden(self):
        self.auth(self.outsider)
        response = self.client.get(f'/api/documents/?course_id={self.private.id}')
        self.assertEqual(response.status_code, 403)

    def test_downloading_a_pdf_from_an_unenrolled_course_is_blocked(self):
        """
        Django serves MEDIA_ROOT unprotected, so the file endpoint is the only
        thing standing between a guessed id and another course's material.
        """
        document = Document.objects.create(
            course=self.private, title='Private notes',
            file='documents/private.pdf', uploaded_by=self.teacher,
            status=Document.Status.READY,
        )
        self.auth(self.outsider)
        response = self.client.get(f'/api/documents/{document.id}/file/')
        # Filtered out of the queryset entirely, so it does not even exist.
        self.assertEqual(response.status_code, 404)

    def test_a_missing_course_reports_not_found(self):
        self.auth(self.student)
        response = self.client.post('/api/chat/ask/', {
            'question': 'anything', 'course_id': 999999,
        }, format='json')
        self.assertEqual(response.status_code, 404)


class ApiDocsTests(ApiTestCase):
    """
    The docs routes were once silently broken by an unrelated edit that blanked
    a path string: the URL name still resolved, just to '/'. Nothing failed,
    because nothing checked. These assert the addresses, not merely that the
    views exist.
    """

    def test_documentation_routes_are_where_they_claim_to_be(self):
        from django.urls import reverse

        self.assertEqual(reverse('swagger-ui'), '/api/docs/')
        self.assertEqual(reverse('schema'), '/api/schema/')
        self.assertEqual(reverse('redoc'), '/api/redoc/')

    def test_swagger_ui_renders(self):
        response = self.client.get('/api/docs/')
        self.assertEqual(response.status_code, 200)

    def test_schema_lists_the_main_endpoints(self):
        response = self.client.get('/api/schema/')
        self.assertEqual(response.status_code, 200)
        body = response.content.decode()
        for path in ('/api/chat/ask/', '/api/documents/', '/api/courses/'):
            self.assertIn(path, body)


class ChatTests(ApiTestCase):
    """Retrieval runs against real embeddings in the real pgvector column."""

    def setUp(self):
        super().setUp()
        self.document = Document.objects.create(
            course=self.course, title='Unit 3 - Network Layer',
            file='documents/test.pdf', uploaded_by=self.teacher,
            status=Document.Status.READY, total_chunks=2,
        )
        self._add_chunk(
            0, 34,
            'The OSI model divides network communication into seven layers: '
            'physical, data link, network, transport, session, presentation '
            'and application.',
        )
        self._add_chunk(
            1, 35,
            'Normalization in relational databases removes redundancy by '
            'decomposing tables into first, second and third normal form.',
        )

    def _add_chunk(self, index, page, text):
        DocumentChunk.objects.create(
            document=self.document, content=text, embedding=embed_text(text),
            chunk_index=index, page_number=page,
        )

    def test_ask_retrieves_the_topically_matching_chunk(self):
        self.auth(self.student)
        response = self.client.post('/api/chat/ask/', {
            'question': 'Explain the layers of the OSI model',
            'course_id': self.course.id,
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertGreater(response.data['chunks_used'], 0)

        # The OSI chunk must rank above the unrelated database-normalization one.
        top = response.data['citations'][0]
        self.assertEqual(top['page_number'], 34)
        self.assertLess(top['distance'], 0.7)

    def test_answer_carries_citations_for_the_defense_demo(self):
        self.auth(self.student)
        response = self.client.post('/api/chat/ask/', {
            'question': 'What are the seven layers?', 'course_id': self.course.id,
        }, format='json')

        citation = response.data['citations'][0]
        self.assertEqual(citation['document_title'], 'Unit 3 - Network Layer')
        self.assertIn('distance', citation)
        self.assertIn('chunk_id', citation)

    def test_citations_store_the_passage_text_not_just_a_reference(self):
        """
        The UI shows the passages behind an answer, and the evidence should
        survive the document being re-ingested or deleted -- so the text is
        stored with the message rather than looked up by id later.
        """
        self.auth(self.student)
        response = self.client.post('/api/chat/ask/', {
            'question': 'Explain the OSI model layers',
            'course_id': self.course.id,
        }, format='json')

        citation = response.data['citations'][0]
        self.assertIn('OSI model', citation['content'])
        self.assertEqual(citation['document_id'], self.document.id)

    def test_off_syllabus_question_declines_instead_of_inventing(self):
        self.auth(self.student)
        response = self.client.post('/api/chat/ask/', {
            'question': 'What is the best recipe for chicken momo?',
            'course_id': self.course.id,
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['chunks_used'], 0)
        self.assertIn('not covered in your uploaded syllabus', response.data['answer'])

    def test_question_and_answer_are_both_persisted(self):
        self.auth(self.student)
        response = self.client.post('/api/chat/ask/', {
            'question': 'Describe the transport layer', 'course_id': self.course.id,
        }, format='json')

        session = ChatSession.objects.get(pk=response.data['session_id'])
        roles = list(session.messages.values_list('role', flat=True))
        self.assertEqual(roles, ['user', 'assistant'])

    def test_follow_up_reuses_the_same_session(self):
        self.auth(self.student)
        first = self.client.post('/api/chat/ask/', {
            'question': 'What is the OSI model?', 'course_id': self.course.id,
        }, format='json')
        session_id = first.data['session_id']

        second = self.client.post('/api/chat/ask/', {
            'question': 'Explain the third layer further',
            'course_id': self.course.id, 'session_id': session_id,
        }, format='json')

        self.assertEqual(second.data['session_id'], session_id)
        self.assertEqual(ChatSession.objects.count(), 1)
        self.assertEqual(ChatSession.objects.get(pk=session_id).messages.count(), 4)

    def test_chunks_from_documents_still_processing_are_not_retrieved(self):
        self.document.status = Document.Status.PROCESSING
        self.document.save()

        self.auth(self.student)
        response = self.client.post('/api/chat/ask/', {
            'question': 'Explain the OSI model', 'course_id': self.course.id,
        }, format='json')
        self.assertEqual(response.data['chunks_used'], 0)


class DocumentTests(ApiTestCase):
    def test_non_pdf_upload_is_rejected(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        self.auth(self.teacher)
        response = self.client.post('/api/documents/', {
            'course': self.course.id, 'title': 'Notes',
            'file': SimpleUploadedFile('notes.txt', b'hello', content_type='text/plain'),
        }, format='multipart')

        self.assertEqual(response.status_code, 400)
        self.assertIn('file', response.data)

    def test_student_cannot_upload_to_a_course_they_only_attend(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        self.auth(self.student)
        response = self.client.post('/api/documents/', {
            'course': self.course.id, 'title': 'Sneaky',
            'file': SimpleUploadedFile('x.pdf', b'%PDF-1.4', content_type='application/pdf'),
        }, format='multipart')

        self.assertEqual(response.status_code, 400)

    def test_teacher_can_rename_a_document(self):
        document = Document.objects.create(
            course=self.course, title='Unit 1', file='documents/u1.pdf',
            uploaded_by=self.teacher, status=Document.Status.READY,
        )
        self.auth(self.teacher)
        response = self.client.patch(
            f'/api/documents/{document.id}/', {'title': 'Unit 1 - Revised'},
            format='multipart',
        )
        self.assertEqual(response.status_code, 200)
        document.refresh_from_db()
        self.assertEqual(document.title, 'Unit 1 - Revised')

    def test_student_cannot_rename_a_document(self):
        document = Document.objects.create(
            course=self.course, title='Unit 1', file='documents/u1.pdf',
            uploaded_by=self.teacher, status=Document.Status.READY,
        )
        self.auth(self.student)
        response = self.client.patch(
            f'/api/documents/{document.id}/', {'title': 'Hacked'},
            format='multipart',
        )
        self.assertEqual(response.status_code, 403)

    def test_upload_without_a_file_is_rejected(self):
        self.auth(self.teacher)
        response = self.client.post(
            '/api/documents/', {'course': self.course.id, 'title': 'No file'},
            format='multipart',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('file', response.data)

    def test_status_endpoint_reports_progress(self):
        document = Document.objects.create(
            course=self.course, title='Unit 1', file='documents/u1.pdf',
            uploaded_by=self.teacher, status=Document.Status.PENDING,
        )
        self.auth(self.student)
        response = self.client.get(f'/api/documents/{document.id}/status/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'pending')
