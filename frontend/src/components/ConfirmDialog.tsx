import React from "react";
import {AlertTriangle} from "lucide-react";
import {Button} from "./Button";
import {Modal} from "./Modal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** Say what is lost, concretely — "and its 53 passages", not "permanently". */
  body: React.ReactNode;
  confirmLabel?: string;
  isPending?: boolean;
}

/**
 * Confirmation before anything irreversible.
 *
 * Deletes cascade here — removing a document takes its chunks, removing a
 * course takes its documents and every chat about it — so the body text is
 * expected to spell out what actually goes.
 */
export const ConfirmDialog: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Delete",
  isPending = false,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title}>
    <div className="flex gap-3">
      <span className="shrink-0 mt-0.5 text-red-600">
        <AlertTriangle size={20} />
      </span>
      <div className="text-sm text-slate-600 leading-relaxed">{body}</div>
    </div>

    <div className="flex gap-2 mt-5">
      <Button variant="outline" className="flex-1" onClick={onClose}>
        Cancel
      </Button>
      <Button
        variant="danger"
        className="flex-1"
        onClick={onConfirm}
        isLoading={isPending}
      >
        {confirmLabel}
      </Button>
    </div>
  </Modal>
);
