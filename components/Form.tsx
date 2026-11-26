"use client";
import { ReactNode, useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { Result } from "../lib/form";

// Endpoint API tujuan form, format "METHOD /api/path" (SAD §11.2), mis. "PATCH /api/items/3".
type Action = string;

export function Submit({
  children,
  className = "btn btn-primary",
  disabled,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending || disabled}>
      {pending ? "Memproses..." : children}
    </button>
  );
}

export function Message({ state }: { state: Result }) {
  if (state?.error)
    return (
      <div className="notice error" role="alert">
        {state.error}
      </div>
    );
  if (state?.ok)
    return (
      <div className="notice success" role="status">
        {state.ok}
      </div>
    );
  return null;
}

// Isian tidak hilang saat gagal simpan (SRS §5.4.2): input uncontrolled dan form tidak di-reset saat error.
// Browser -> API lewat HTTPS (SAD §5.2). Respons {ok}/{error} (+ redirect) dari lib/api.ts.
export function ActionForm({
  action,
  children,
  className,
  onSuccess,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  onSuccess?: (r: Result) => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (_: Result, fd: FormData): Promise<Result> => {
      const [method, url] = action.split(" ");
      let r: { ok?: string; error?: string; redirect?: string };
      try {
        r = await (await fetch(url, { method, body: fd })).json();
      } catch {
        return {
          error: "Gagal menyimpan. Periksa koneksi internet lalu coba lagi.",
        };
      }
      if (r.redirect) router.replace(r.redirect);
      else if (r.ok) router.refresh(); // muat ulang data halaman dari API
      if (r.ok) onSuccess?.(r);
      return { ok: r.ok, error: r.error };
    },
    null,
  );
  return (
    <form
      action={formAction}
      className={className}
      style={{ display: "grid", gap: 12 }}
    >
      <Message state={state} />
      {children}
    </form>
  );
}

// Tombol + modal berisi form. Pesan sukses tampil sebagai toast setelah modal tertutup.
export function FormModal({
  label,
  title,
  action,
  children,
  btnClass = "btn btn-primary",
  submitLabel = "Simpan",
  submitClass = "btn btn-primary",
  defaultOpen = false,
}: {
  label: ReactNode;
  title: string;
  action: Action;
  children: ReactNode;
  btnClass?: string;
  submitLabel?: string;
  submitClass?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [done, setDone] = useState<Result>(null);
  return (
    <>
      <button
        type="button"
        className={btnClass}
        onClick={() => {
          setDone(null);
          setOpen(true);
        }}
      >
        {label}
      </button>
      {done && !open && <Toast state={done} onClose={() => setDone(null)} />}
      {open && (
        <Modal title={title} onClose={() => setOpen(false)}>
          <ActionForm
            action={action}
            onSuccess={(r) => {
              setDone(r);
              setOpen(false);
            }}
          >
            <div className="modal-body" style={{ display: "grid", gap: 15 }}>
              {children}
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setOpen(false)}
              >
                Batal
              </button>
              <Submit className={submitClass}>{submitLabel}</Submit>
            </div>
          </ActionForm>
        </Modal>
      )}
    </>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button
            type="button"
            className="close"
            aria-label="Tutup"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toast({
  state,
  onClose,
}: {
  state: Result;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 60,
        maxWidth: 440,
        cursor: "pointer",
      }}
      onClick={onClose}
      title="Klik untuk menutup"
    >
      <Message state={state} />
    </div>
  );
}
