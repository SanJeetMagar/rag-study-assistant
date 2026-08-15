"""
Tests for chunking and cleaning.

These are pure functions -- no database, no Django settings, no embedding
model -- so they run in milliseconds.
"""

from django.test import SimpleTestCase

from services.pdf_processor import Page, clean_text, split_into_chunks


def page(number, words):
    """A page whose text is `words` numbered tokens, so positions are checkable."""
    return Page(number=number, text=' '.join(f'w{i}' for i in range(words)))


class SplitIntoChunksTests(SimpleTestCase):
    def test_overlap_repeats_words_across_the_boundary(self):
        pages = [page(1, 10)]
        chunks = split_into_chunks(pages, chunk_size=5, overlap=2, min_tail_words=1)

        self.assertEqual(chunks[0].text.split(), ['w0', 'w1', 'w2', 'w3', 'w4'])
        # Stride is 3, so chunk 2 starts at w3 and repeats w3/w4 for continuity.
        self.assertEqual(chunks[1].text.split()[:2], ['w3', 'w4'])

    def test_tail_of_document_is_not_dropped(self):
        """
        The original spec ended the loop with `if len(chunk_words) < 50: break`,
        which silently discarded the final short chunk of every document. The
        last words of the file must survive.
        """
        pages = [page(1, 20)]
        chunks = split_into_chunks(pages, chunk_size=8, overlap=2, min_tail_words=1)

        covered = {word for chunk in chunks for word in chunk.text.split()}
        self.assertIn('w19', covered, 'final word of the document was dropped')

    def test_trivial_tail_is_skipped_when_already_covered(self):
        pages = [page(1, 100)]
        chunks = split_into_chunks(pages, chunk_size=30, overlap=10, min_tail_words=25)

        self.assertTrue(all(len(c.text.split()) >= 25 for c in chunks))

    def test_chunks_record_their_page(self):
        """
        page_number is unpopulatable in the original design, which flattens all
        pages into one string before chunking.
        """
        pages = [page(1, 6), page(2, 6), page(3, 6)]
        chunks = split_into_chunks(pages, chunk_size=6, overlap=0, min_tail_words=1)

        self.assertEqual([c.page_number for c in chunks], [1, 2, 3])

    def test_chunk_spanning_a_page_break_cites_the_dominant_page(self):
        """
        A chunk that takes 2 words from page 1 and 8 from page 2 is really
        page-2 content. Citing page 1 — the page it merely started on — would
        send the student to the wrong page.
        """
        pages = [page(1, 2), page(2, 8)]
        chunks = split_into_chunks(pages, chunk_size=10, overlap=0, min_tail_words=1)

        self.assertEqual(chunks[0].page_number, 2)

    def test_page_ties_resolve_to_the_earlier_page(self):
        pages = [page(1, 5), page(2, 5)]
        chunks = split_into_chunks(pages, chunk_size=10, overlap=0, min_tail_words=1)

        self.assertEqual(chunks[0].page_number, 1)

    def test_chunk_indexes_are_sequential_from_zero(self):
        chunks = split_into_chunks([page(1, 50)], chunk_size=10, overlap=2, min_tail_words=1)
        self.assertEqual([c.index for c in chunks], list(range(len(chunks))))

    def test_empty_input_yields_no_chunks(self):
        self.assertEqual(split_into_chunks([Page(number=1, text='   ')]), [])

    def test_overlap_must_be_smaller_than_chunk_size(self):
        with self.assertRaises(ValueError):
            split_into_chunks([page(1, 10)], chunk_size=5, overlap=5)


class CleanTextTests(SimpleTestCase):
    def test_strips_standalone_page_numbers(self):
        cleaned = clean_text('Data Link Layer\n23\nThe OSI model')
        self.assertNotIn('23', cleaned)
        self.assertIn('Data Link Layer', cleaned)
        self.assertIn('The OSI model', cleaned)

    def test_strips_page_x_of_y_footers(self):
        cleaned = clean_text('Real content here\nPage 4 of 100\nMore content')
        self.assertNotIn('Page 4', cleaned)
        self.assertIn('More content', cleaned)

    def test_collapses_runs_of_whitespace(self):
        self.assertEqual(clean_text('a     b\n\n\n\nc'), 'a b\n\nc')

    def test_keeps_numbers_that_are_part_of_a_sentence(self):
        cleaned = clean_text('The OSI model has 7 layers.')
        self.assertIn('7 layers', cleaned)
