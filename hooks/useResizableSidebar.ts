import { useRef, useEffect, useCallback } from "react";

interface UseResizableSidebarOptions {
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
  onWidthChange?: (width: number) => void;
}

/**
 * Custom hook for smooth, performant sidebar resizing.
 * Uses direct DOM manipulation and requestAnimationFrame to avoid layout thrashing.
 * Only updates React state on mouse release, reducing re-renders significantly.
 */
export function useResizableSidebar({
  minWidth = 200,
  maxWidth = 400,
  storageKey = "sidebarWidth",
  onWidthChange,
}: UseResizableSidebarOptions = {}) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const pendingWidthRef = useRef<number | null>(null);

  /**
   * Handle the start of resize operation
   */
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      if (!sidebarRef.current) return;

      // Disable text selection during resize
      document.body.classList.add("no-select");
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      // Remove transitions during drag for smooth updates
      sidebarRef.current.style.transition = "none";

      isResizingRef.current = true;

      const startX = e.clientX;
      const startWidth = sidebarRef.current.offsetWidth;

      /**
       * Update width directly on DOM during mousemove.
       * Uses requestAnimationFrame to batch DOM updates.
       */
      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizingRef.current || !sidebarRef.current) return;

        const diff = moveEvent.clientX - startX;
        const newWidth = Math.max(
          minWidth,
          Math.min(maxWidth, startWidth + diff),
        );

        // Store pending width and schedule update
        pendingWidthRef.current = newWidth;

        // Cancel previous RAFrame if it exists
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
        }

        // Schedule DOM update in next animation frame
        rafIdRef.current = requestAnimationFrame(() => {
          if (sidebarRef.current && pendingWidthRef.current !== null) {
            sidebarRef.current.style.width = `${pendingWidthRef.current}px`;
          }
          rafIdRef.current = null;
        });
      };

      /**
       * Handle the end of resize operation.
       * Commits final width to React state and localStorage.
       */
      const handleMouseUp = () => {
        isResizingRef.current = false;

        // Clean up RAF
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }

        // Re-enable text selection and transitions
        document.body.classList.remove("no-select");
        document.body.style.userSelect = "";
        document.body.style.cursor = "";

        if (sidebarRef.current) {
          sidebarRef.current.style.transition = "";
        }

        // Commit final width to state and localStorage
        const finalWidth = pendingWidthRef.current;
        if (finalWidth !== null) {
          // Save to localStorage
          try {
            localStorage.setItem(storageKey, finalWidth.toString());
          } catch (error) {
            console.error(
              "Failed to save sidebar width to localStorage:",
              error,
            );
          }

          // Notify parent component of width change
          onWidthChange?.(finalWidth);

          pendingWidthRef.current = null;
        }

        // Clean up event listeners
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      // Attach event listeners
      document.addEventListener("mousemove", handleMouseMove, {
        passive: true,
      });
      document.addEventListener("mouseup", handleMouseUp, { once: true });
    },
    [minWidth, maxWidth, storageKey, onWidthChange],
  );

  /**
   * Cleanup: ensure proper resource cleanup if component unmounts during resize
   */
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      // Emergency cleanup if resize was in progress
      if (isResizingRef.current) {
        document.body.classList.remove("no-select");
        document.body.style.userSelect = "";
        document.body.style.cursor = "";

        if (sidebarRef.current) {
          sidebarRef.current.style.transition = "";
        }
      }
    };
  }, []);

  return {
    sidebarRef,
    handleResizeStart,
  };
}
