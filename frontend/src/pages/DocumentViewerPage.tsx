import React, {useEffect, useState} from "react";
import {Link, useParams, useSearchParams} from "react-router-dom";
import {ArrowLeft, Download, FileWarning} from "lucide-react";
import {Button} from "../components/Button";
import {documents, errorMessage} from "../services/api";

/**
 * Reads the PDF in the browser.
 *
 * The file sits behind an authenticated endpoint, and an <iframe> cannot send
 * an Authorization header. So the file is fetched with axios (which attaches
 * the token), turned into an object URL, and handed to the iframe. The URL is
 * revoked on unmount, or the blob stays in memory for the life of the tab.
 */
export const DocumentViewerPage: React.FC = () => {
  const {documentId} = useParams();
  const id = Number(documentId);
  const [params] = useSearchParams();
  const page = params.get("page");

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    let revoked = false;
    let url: string | null = null;

    documents
      .fileUrl(id)
      .then((created) => {
        url = created;
        if (!revoked) setObjectUrl(created);
      })
      .catch((err) => setError(errorMessage(err, "Could not open this document.")));

    return () => {
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  // #page=N is a PDF viewer fragment; most browsers honour it.
  const src = objectUrl ? `${objectUrl}#page=${page ?? 1}` : undefined;

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      <header className="flex items-center justify-between gap-4 pb-3 border-b border-amber-200">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to=".."
            relative="path"
            className="p-1.5 -ml-1.5 rounded-lg text-zinc-500 hover:bg-amber-100 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <h1 className="font-display text-xl text-slate-900 truncate">
              Source document
            </h1>
            {page && (
              <p className="text-xs text-slate-500">Opened at page {page}</p>
            )}
          </div>
        </div>

        {objectUrl && (
          <a href={objectUrl} download>
            <Button variant="outline" size="sm">
              <Download size={15} className="mr-1.5" />
              Download
            </Button>
          </a>
        )}
      </header>

      {error ? (
        <div className="flex-1 grid place-items-center">
          <div className="text-center max-w-sm">
            <FileWarning size={30} className="mx-auto text-amber-400 mb-3" />
            <p className="font-medium text-slate-900">{error}</p>
            <p className="text-sm text-slate-500 mt-1">
              You may not be enrolled in this course, or the file has been removed
              from storage.
            </p>
          </div>
        </div>
      ) : !objectUrl ? (
        <div className="flex-1 grid place-items-center text-slate-500 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
            Loading document…
          </span>
        </div>
      ) : (
        <iframe
          src={src}
          title="Source document"
          className="flex-1 w-full mt-3 rounded-xl border border-amber-200 bg-white"
        />
      )}
    </div>
  );
};
