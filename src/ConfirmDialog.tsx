import { useEffect, useId } from 'react';

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onCancel]);

  return <div className="confirm-backdrop" onClick={(event) => {
    if (event.target === event.currentTarget) onCancel();
  }}>
    <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId}>
      <p className="eyebrow">ARE YOU SURE?</p>
      <h2 id={titleId}>{title}</h2>
      <p id={messageId} className="confirm-message">{message}</p>
      <div className="confirm-actions">
        <button className="secondary-button" onClick={onCancel} autoFocus>{cancelLabel}</button>
        <button className="primary-button" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </section>
  </div>;
}
