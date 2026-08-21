export type Role = "teacher" | "student";

export type DocumentStatus = "pending" | "processing" | "ready" | "error";

export interface User {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  role: Role;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  teacher: User;
  course_code: string;
  created_at: string;
  is_active: boolean;
  student_count: number;
  document_count: number;
  my_role: Role;
}

export interface StudyDocument {
  id: number;
  course: number;
  title: string;
  file: string;
  uploaded_by_email: string;
  uploaded_at: string;
  status: DocumentStatus;
  total_chunks: number;
  error_message: string;
}

/** Where an answer came from — rendered under assistant messages. */
export interface Citation {
  chunk_id: number;
  document_id: number;
  document_title: string;
  page_number: number | null;
  /** Cosine distance: 0 is identical meaning, 1 is unrelated. */
  distance: number;
  /**
   * The passage itself, stored with the answer rather than looked up later,
   * so the evidence survives the document being re-ingested or removed.
   * Older messages predate this field.
   */
  content?: string;
}

export interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  chunks_used: number;
  citations: Citation[];
}

export interface ChatSession {
  id: number;
  course: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface AskResponse {
  session_id: number;
  answer: string;
  chunks_used: number;
  citations: Citation[];
  message: Message;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
