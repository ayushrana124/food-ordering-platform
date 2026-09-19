import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface SheetProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    /** Rendered pinned below the scrolling body — put the primary action here. */
    footer?: ReactNode;
    children: ReactNode;
    /** Hides the close button for sheets that must be resolved by an action. */
    dismissible?: boolean;
}

/**
 * The app's one modal surface.
 *
 * Bottom sheets rather than centre dialogs throughout: on a phone the bottom of
 * the screen is where the thumb already is, and the sheet can grow to fit its
 * content without ever pushing its action off-screen. Above 720px it becomes a
 * centred card (see `.c-sheet` in index.css).
 */
export default function Sheet({ open, onClose, title, footer, children, dismissible = true }: SheetProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    // Freeze the page behind the sheet, otherwise iOS scrolls the body under it.
    useEffect(() => {
        if (!open) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, [open]);

    useEffect(() => {
        if (!open || !dismissible) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, dismissible, onClose]);

    // Move focus into the sheet so a screen reader and the keyboard follow it.
    useEffect(() => {
        if (open) panelRef.current?.focus();
    }, [open]);

    if (!open) return null;

    return createPortal(
        <>
            <div className="c-sheet__scrim" onClick={dismissible ? onClose : undefined} />
            <div
                ref={panelRef}
                className="c-sheet"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                style={{ outline: 'none' }}
            >
                <div className="c-sheet__grip" />

                {(title || dismissible) && (
                    <div
                        className="flex items-center gap-3 px-4 pt-1 pb-3"
                        style={{ flex: 'none' }}
                    >
                        {title && (
                            <h2
                                className="flex-1 truncate"
                                style={{ font: '800 1.05rem/1.2 Outfit, sans-serif', color: 'var(--c-ink)' }}
                            >
                                {title}
                            </h2>
                        )}
                        {dismissible && (
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close"
                                className="grid place-items-center rounded-full"
                                style={{
                                    width: 34, height: 34, flex: 'none', border: 0, cursor: 'pointer',
                                    background: 'var(--c-surface-2)', color: 'var(--c-ink-2)',
                                }}
                            >
                                <X size={17} />
                            </button>
                        )}
                    </div>
                )}

                <div className="c-sheet__body">{children}</div>

                {footer && <div className="c-sheet__foot">{footer}</div>}
            </div>
        </>,
        document.body
    );
}
