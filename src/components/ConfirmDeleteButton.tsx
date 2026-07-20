"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";

export function ConfirmDeleteButton({
  label,
  title,
  description,
  onConfirm,
  className = "delete-button",
}: {
  label: React.ReactNode;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const canConfirm = text.trim().toLowerCase() === "deletar";

  function handleConfirm() {
    startTransition(async () => {
      await onConfirm();
      setOpen(false);
      setText("");
    });
  }

  function handleClose() {
    setOpen(false);
    setText("");
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <Modal title={title} onClose={handleClose}>
          <p>{description}</p>
          <p>
            Digite <strong>DELETAR</strong> para confirmar.
          </p>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="DELETAR"
            className="confirm-delete-input"
            autoFocus
          />
          <div className="confirm-delete-actions">
            <button type="button" className="secondary-button" onClick={handleClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="danger-button"
              disabled={!canConfirm || isPending}
              onClick={handleConfirm}
            >
              {isPending ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
