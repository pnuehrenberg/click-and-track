import React, { useEffect, useRef } from "react";
import { AlertTriangle, Download, Trash2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDiscard: () => void;
  onExport: () => void;
  actionDescription?: string;
}

export const UnsavedChangesDialog: React.FC<Props> = ({
  isOpen,
  onClose,
  onDiscard,
  onExport,
  actionDescription = "loading a new video",
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus Management (Trap & Restore)
  useEffect(() => {
    if (isOpen) {
      // Save previously focused element
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus first button (Cancel) when opened
      requestAnimationFrame(() => {
        const firstButton = dialogRef.current?.querySelector("button");
        if (firstButton) (firstButton as HTMLElement).focus();
      });

      const handleKeyDown = (e: KeyboardEvent) => {
        // Handle Escape
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
          return;
        }

        // Handle Tab Cycle (Focus Trap)
        if (e.key === "Tab") {
          const dialog = dialogRef.current;
          if (!dialog) return;

          const focusable = dialog.querySelectorAll("button");
          if (focusable.length === 0) return;

          const first = focusable[0] as HTMLElement;
          const last = focusable[focusable.length - 1] as HTMLElement;

          const isInside = dialog.contains(document.activeElement);

          // If focus somehow escaped, bring it back
          if (!isInside) {
            e.preventDefault();
            first.focus();
            return;
          }

          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        // Restore focus on close
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        ref={dialogRef}
        className="bg-gray-900 border border-gray-750 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-title"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-800 border border-gray-750 rounded-xl shrink-0">
              <AlertTriangle className="text-active" size={24} />
            </div>
            <div className="flex-1 pt-1">
              <h2
                id="unsaved-title"
                className="text-lg font-bold text-white mb-2"
              >
                Unsaved Changes
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                You have unsaved tracking data. Do you want to export it before{" "}
                {actionDescription}?
              </p>
              <p className="text-gray-400 text-sm mt-4 leading-relaxed">
                Proceeding will discard current progress if not saved.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions (Lighter - 850) */}
        <div className="bg-gray-850 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-gray-800 hover:bg-gray-750 border border-gray-750 text-gray-400 hover:text-white rounded-lg transition outline-none focus-visible:border-active"
          >
            Cancel
          </button>
          <button
            onClick={onDiscard}
            className="px-4 py-2 text-sm font-medium bg-gray-800 hover:bg-gray-750 border border-gray-750 text-gray-300 hover:text-white rounded-lg transition flex items-center gap-2 outline-none focus-visible:border-active group"
          >
            <Trash2
              size={16}
              className="text-gray-400 group-hover:text-red-500 group-hover:scale-110 transition-all"
            />
            Discard & Proceed
          </button>
          <button
            onClick={onExport}
            className="px-4 py-2 text-sm font-medium bg-gray-800 hover:bg-gray-750 border border-gray-750 text-gray-300 hover:text-white rounded-lg transition flex items-center gap-2 outline-none focus-visible:border-active group"
          >
            <Download
              size={16}
              className="text-gray-400 group-hover:text-active group-hover:scale-110 transition-all"
            />
            Export & Proceed
          </button>
        </div>
      </div>
    </div>
  );
};
