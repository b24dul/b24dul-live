import { forwardRef, useEffect, useId, useRef } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { X } from 'lucide-react';

type PanelProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section' | 'article';
};

export function GlassPanel({ as: Tag = 'div', className = '', ...props }: PanelProps) {
  return <Tag className={`glass-panel ${className}`} {...props} />;
}

export function GlassCard({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <GlassPanel as="article" className={`glass-card ${className}`} {...props} />;
}

type ActionProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const PrimaryButton = forwardRef<HTMLButtonElement, ActionProps>(function PrimaryButton(
  { className = '', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`ui-button ui-button--primary ${className}`}
      {...props}
    />
  );
});

export const SecondaryButton = forwardRef<HTMLButtonElement, ActionProps>(function SecondaryButton(
  { className = '', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`ui-button ui-button--secondary ${className}`}
      {...props}
    />
  );
});

type IconButtonProps = ActionProps & { label: string; icon: ReactNode };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, className = '', ...props },
  ref,
) {
  return (
    <SecondaryButton
      ref={ref}
      aria-label={label}
      className={`ui-icon-button ${className}`}
      {...props}
    >
      <span aria-hidden="true">{icon}</span>
    </SecondaryButton>
  );
});

type HeadingProps = HTMLAttributes<HTMLElement> & {
  title: string;
  description?: string;
};

export function PageHeader({ title, description, className = '', ...props }: HeadingProps) {
  return (
    <header className={className} {...props}>
      <h1 tabIndex={-1} className="text-3xl font-bold tracking-tight sm:text-5xl">
        {title}
      </h1>
      {description && <p className="mt-3 max-w-2xl text-slate-300">{description}</p>}
    </header>
  );
}

export function SectionHeader({ title, description, className = '', ...props }: HeadingProps) {
  return (
    <header className={className} {...props}>
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      {description && <p className="mt-2 text-sm text-slate-300">{description}</p>}
    </header>
  );
}

type Status = 'success' | 'warning' | 'danger' | 'neutral';

export function StatusIndicator({
  status,
  children,
  className = '',
}: {
  status: Status;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`ui-status ui-status--${status} ${className}`}>
      <span>{children}</span>
    </span>
  );
}

export function LoadingSkeleton({
  label = 'Loading',
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  return <div role="status" aria-label={label} className={`ui-skeleton h-4 w-full ${className}`} />;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <GlassPanel className="p-6 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-300">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </GlassPanel>
  );
}

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ open, title, onClose, children }: ModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const dialog = closeRef.current?.closest('[role="dialog"]');
      const controls = dialog?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      if (!controls?.length) {
        event.preventDefault();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="ui-overlay"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <GlassPanel role="dialog" aria-modal="true" aria-labelledby={titleId} className="ui-dialog">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-xl font-bold">
            {title}
          </h2>
          <IconButton
            ref={closeRef}
            label="Close dialog"
            icon={<X size={18} />}
            onClick={onClose}
          />
        </div>
        {children}
      </GlassPanel>
    </div>
  );
}

export function Toast({
  message,
  tone = 'neutral',
  onDismiss,
}: {
  message: string;
  tone?: Status;
  onDismiss: () => void;
}) {
  return (
    <GlassPanel
      role="status"
      aria-live="polite"
      className="ui-toast flex items-center justify-between gap-4"
    >
      <StatusIndicator status={tone}>{message}</StatusIndicator>
      <IconButton label="Dismiss notification" icon={<X size={18} />} onClick={onDismiss} />
    </GlassPanel>
  );
}
