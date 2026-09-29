import { useId, useRef, type FormEvent, type HTMLAttributes, type KeyboardEvent, type ReactNode } from "react"
import { Button } from "./primitives"
import { getTabPanelId } from "./tabUtils"

export interface TabItem {
  value: string
  label: string
  disabled?: boolean
}

export interface TabsProps {
  tabs: readonly TabItem[]
  value: string
  onChange: (value: string) => void
  label: string
  className?: string
  id?: string
}

export function Tabs({ tabs, value, onChange, label, className = "", id }: TabsProps) {
  const generatedId = useId()
  const baseId = id ?? generatedId
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % tabs.length
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + tabs.length) % tabs.length
    else if (event.key === "Home") nextIndex = 0
    else if (event.key === "End") nextIndex = tabs.length - 1
    else return

    event.preventDefault()
    for (let attempts = 0; attempts < tabs.length && tabs[nextIndex]?.disabled; attempts += 1) {
      nextIndex = (nextIndex + (nextIndex >= index ? 1 : -1) + tabs.length) % tabs.length
    }
    const nextTab = tabs[nextIndex]
    if (nextTab && !nextTab.disabled) {
      onChange(nextTab.value)
      tabRefs.current[nextIndex]?.focus()
    }
  }

  return (
    <div
      aria-label={label}
      className={`flex max-w-full gap-1 overflow-x-auto border-b border-line ${className}`}
      role="tablist"
    >
      {tabs.map((tab, index) => {
        const selected = tab.value === value
        return (
          <button
            aria-controls={`${baseId}-panel-${tab.value}`}
            aria-selected={selected}
            className={`-mb-px min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-offset-[-2px] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 ${selected ? "border-brand-700 text-brand-800" : "border-transparent text-muted hover:border-slate-300 hover:text-ink"}`}
            disabled={tab.disabled}
            id={`${baseId}-tab-${tab.value}`}
            key={tab.value}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            ref={(element) => { tabRefs.current[index] = element }}
            role="tab"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export interface TabPanelProps {
  tabsId: string
  value: string
  activeValue: string
  children: ReactNode
  className?: string
}

export function TabPanel({ tabsId, value, activeValue, children, className = "" }: TabPanelProps) {
  return (
    <div
      aria-labelledby={`${tabsId}-tab-${value}`}
      className={className}
      hidden={value !== activeValue}
      id={getTabPanelId(tabsId, value)}
      role="tabpanel"
      tabIndex={0}
    >
      {children}
    </div>
  )
}

export interface FilterBarProps extends Omit<HTMLAttributes<HTMLFormElement>, "onSubmit"> {
  children: ReactNode
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
  onReset?: () => void
  applyLabel?: string
  resetLabel?: string
  actions?: ReactNode
}

export function FilterBar({
  children,
  onSubmit,
  onReset,
  applyLabel = "Apply filters",
  resetLabel = "Reset",
  actions,
  className = "",
  ...props
}: FilterBarProps) {
  return (
    <form
      className={`rounded-card border border-line bg-white p-4 ${className}`}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit?.(event)
      }}
      {...props}
    >
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {onReset && <Button onClick={onReset} type="reset" variant="secondary">{resetLabel}</Button>}
        {actions ?? <Button type="submit">{applyLabel}</Button>}
      </div>
    </form>
  )
}
