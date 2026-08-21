import React, {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Link} from "react-router-dom";
import {BookOpen, FileText, Plus, Users} from "lucide-react";
import {Button} from "../components/Button";
import {EmptyState} from "../components/EmptyState";
import {ErrorBanner} from "../components/ErrorBanner";
import {Input} from "../components/Input";
import {Modal} from "../components/Modal";
import {PageHeader} from "../components/PageHeader";
import {useAuth} from "../context/AuthContext";
import {courses, errorMessage} from "../services/api";

export const DashboardPage: React.FC = () => {
  const {user} = useAuth();
  const queryClient = useQueryClient();
  const isTeacher = user?.role === "teacher";

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const {data: courseList = [], isLoading} = useQuery({
    queryKey: ["courses"],
    queryFn: courses.list,
  });

  const invalidate = () => queryClient.invalidateQueries({queryKey: ["courses"]});

  const createCourse = useMutation({
    mutationFn: () => courses.create({title, description}),
    onSuccess: () => {
      invalidate();
      setShowCreate(false);
      setTitle("");
      setDescription("");
      setError("");
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const joinCourse = useMutation({
    mutationFn: () => courses.join(code),
    onSuccess: () => {
      invalidate();
      setShowJoin(false);
      setCode("");
      setError("");
    },
    onError: (err) => setError(errorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your courses"
        description={
          isTeacher
            ? "Create a course, upload its syllabus, and share the code with your students."
            : "Join a course with the code your teacher gives you, then start asking questions."
        }
        actions={
          isTeacher ? (
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} className="mr-1.5" />
              New course
            </Button>
          ) : (
            <Button onClick={() => setShowJoin(true)}>
              <Plus size={16} className="mr-1.5" />
              Join a course
            </Button>
          )
        }
      />

      {isLoading ? (
        <p className="t-body text-slate-500">Loading courses…</p>
      ) : courseList.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          body={
            isTeacher
              ? "Create your first course to upload a syllabus."
              : "Ask your teacher for a course code to get started."
          }
          action={
            isTeacher ? (
              <Button onClick={() => setShowCreate(true)}>Create a course</Button>
            ) : (
              <Button onClick={() => setShowJoin(true)}>Join a course</Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courseList.map((course) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="block bg-white border border-amber-200 rounded-2xl p-5 hover:border-amber-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="t-title">
                  {course.title}
                </h2>
                <span className="shrink-0 t-micro px-2 py-1 rounded-md bg-amber-100 text-amber-900">
                  {course.my_role}
                </span>
              </div>

              {course.description && (
                <p className="t-body mt-2 line-clamp-2 text-slate-500">
                  {course.description}
                </p>
              )}

              <div className="flex items-center gap-4 mt-4 t-meta">
                <span className="inline-flex items-center gap-1">
                  <FileText size={13} /> {course.document_count} documents
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users size={13} /> {course.student_count} students
                </span>
              </div>

              {course.my_role === "teacher" && (
                <p className="mt-3 t-meta">
                  Share code:{" "}
                  <code className="font-mono font-semibold text-rose-700">
                    {course.course_code}
                  </code>
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create a course"
      >
        <div className="space-y-4">
          <Input
            label="Course title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Computer Networks - 7th Sem"
          />
          <Input
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <ErrorBanner message={error} />
          <Button
            className="w-full"
            isLoading={createCourse.isPending}
            disabled={!title.trim()}
            onClick={() => createCourse.mutate()}
          >
            Create course
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showJoin} onClose={() => setShowJoin(false)} title="Join a course">
        <div className="space-y-4">
          <Input
            label="Course code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            className="font-mono tracking-widest"
          />
          <ErrorBanner message={error} />
          <Button
            className="w-full"
            isLoading={joinCourse.isPending}
            disabled={!code.trim()}
            onClick={() => joinCourse.mutate()}
          >
            Join course
          </Button>
        </div>
      </Modal>
    </div>
  );
};
