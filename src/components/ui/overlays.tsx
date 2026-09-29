import { useEffect, useId, useRef, type ReactNode } from "react"
import { X } from "lucide-react"
import { IconButton } from "./primitives"

type OverlaySize = "sm" | "md" | "lg" | "xl"

const overlayWidths: Record<OverlaySize, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
}

interface DialogSurfaceProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: OverlaySize
  closeLabel?: string
  className?: string
}

function useDialogLifecycle(open: boolean, onClose: () => void, surfaceRef: { current: HTMLElement | null }) {
  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const surface = surfaceRef.current
    const focusableSelector = "a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])"
    const firstFocusable = surface?.querySelector<HTMLElement>(focusableSelector)
    ;(firstFocusable ?? surface)?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== "Tab" || !surface) return
      const items = Array.from(surface.querySelectorAll<HTMLElement>(focusableSelector))
      if (items.length === 0) {
        event.preventDefault()
        surface.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [onClose, open, surfaceRef])
}

function DialogSurface({
  open,
  title,
  onClose,
  children,
  footer,
  size = "md",
  closeLabel = "Close dialog",
  className = "",
}: DialogSurfaceProps) {
  const id = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogLifecycle(open, onClose, panelRef)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        aria-labelledby={`${id}-title`}
        aria-modal="true"
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-white shadow-2xl sm:max-h-[88dvh] sm:rounded-2xl ${overlayWidths[size]} ${className}`}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-ink" id={`${id}-title`}>{title}</h2>
          <IconButton icon={X} label={closeLabel} onClick={onClose} size="sm" variant="quiet" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
        {footer && <div className="shrink-0 border-t border-line bg-slate-50 px-4 py-3 sm:px-6">{footer}</div>}
      </div>
    </div>
  )
}

export interface ModalProps extends Omit<DialogSurfaceProps, "size"> {
  size?: OverlaySize
}

export function Modal(props: ModalProps) {
  return <DialogSurface {...props} />
}

export interface DrawerProps extends Omit<DialogSurfaceProps, "size"> {
  side?: "left" | "right"
  size?: OverlaySize
}

export function Drawer({ side = "right", size = "md", ...props }: DrawerProps) {
  if (!props.open) return null
  const width = side === "right" ? "ml-auto" : "mr-auto"
  const placement = side === "right" ? "justify-end" : "justify-start"
  return (
    <div
      className={`fixed inset-0 z-[100] flex ${placement} bg-slate-950/45`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) props.onClose()
      }}
    >
      {props.open && (
        <DrawerSurface {...props} className={`${width} ${props.className ?? ""}`} side={side} size={size} />
      )}
    </div>
  )
}

interface DrawerSurfaceProps extends DialogSurfaceProps {
  side: "left" | "right"
}

function DrawerSurface({ side, size = "md", ...props }: DrawerSurfaceProps) {
  const id = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogLifecycle(props.open, props.onClose, panelRef)
  if (!props.open) return null

  return (
    <div
      aria-labelledby={`${id}-title`}
      aria-modal="true"
      className={`flex h-full max-h-dvh w-full flex-col border-line bg-white shadow-2xl ${side === "left" ? "border-r" : "border-l"} ${overlayWidths[size]} ${props.className ?? ""}`}
      ref={panelRef}
      role="dialog"
      tabIndex={-1}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-6">
        <h2 className="text-lg font-semibold text-ink" id={`${id}-title`}>{props.title}</h2>
        <IconButton icon={X} label={props.closeLabel ?? "Close dialog"} onClick={props.onClose} size="sm" variant="quiet" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{props.children}</div>
      {props.footer && <div className="shrink-0 border-t border-line bg-slate-50 px-4 py-3 sm:px-6">{props.footer}</div>}
    </div>
  )
}

export interface TooltipProps {
  content: ReactNode
  children: ReactNode
  placement?: "top" | "bottom" | "left" | "right"
}

const tooltipPlacements = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "left-1/2 top-full mt-2 -translate-x-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
}

export function Tooltip({ content, children, placement = "top" }: TooltipProps) {
  const id = useId()
  return (
    <span className="group relative inline-flex max-w-full" tabIndex={0}>
      <span aria-describedby={id}>{children}</span>
      <span
        className={`pointer-events-none absolute z-50 w-max max-w-64 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium leading-5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 ${tooltipPlacements[placement]}`}
        id={id}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  )
}
