import { useId, type InputHTMLAttributes, type SelectHTMLAttributes } from "react"

interface FieldMessageProps {
  hint?: string
  error?: string
  id: string
}

function FieldMessages({ hint, error, id }: FieldMessageProps) {
  return (
    <>
      {hint && !error && <p className="mt-1 text-xs leading-5 text-muted" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="mt-1 text-sm text-red-700" id={`${id}-error`} role="alert">{error}</p>}
    </>
  )
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string
  hint?: string
  error?: string
}

export function Input({ label, hint, error, id, className = "", ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const descriptionId = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor={inputId}>
        {label}{props.required && <span aria-hidden="true" className="ml-1 text-red-700">*</span>}
      </label>
      <input
        aria-describedby={descriptionId}
        aria-invalid={error ? true : undefined}
        className={`min-h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/75 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-muted ${error ? "border-red-500" : "border-line"} ${className}`}
        id={inputId}
        {...props}
      />
      <FieldMessages error={error} hint={hint} id={inputId} />
    </div>
  )
}

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label: string
  options: readonly SelectOption[]
  placeholder?: string
  hint?: string
  error?: string
}

export function Select({
  label,
  options,
  placeholder,
  hint,
  error,
  id,
  className = "",
  ...props
}: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const descriptionId = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined

  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor={selectId}>
        {label}{props.required && <span aria-hidden="true" className="ml-1 text-red-700">*</span>}
      </label>
      <select
        aria-describedby={descriptionId}
        aria-invalid={error ? true : undefined}
        className={`min-h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 disabled:cursor-not-allowed disabled:bg-slate-50 ${error ? "border-red-500" : "border-line"} ${className}`}
        id={selectId}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option disabled={option.disabled} key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldMessages error={error} hint={hint} id={selectId} />
    </div>
  )
}

export interface DateRange {
  start: string
  end: string
}

export interface DateRangePickerProps {
  label: string
  value: DateRange
  onChange: (value: DateRange) => void
  startLabel?: string
  endLabel?: string
  hint?: string
  error?: string
  className?: string
  disabled?: boolean
}

export function DateRangePicker({
  label,
  value,
  onChange,
  startLabel = "Start date",
  endLabel = "End date",
  hint,
  error,
  className = "",
  disabled = false,
}: DateRangePickerProps) {
  const id = useId()
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  const inputClass = "min-h-10 w-full min-w-0 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 disabled:bg-slate-50"

  return (
    <fieldset aria-describedby={messageId} className={`min-w-0 ${className}`} disabled={disabled}>
      <legend className="mb-1.5 text-sm font-medium text-ink">{label}</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="min-w-0 text-xs font-medium text-muted">
          <span className="mb-1 block">{startLabel}</span>
          <input
            aria-label={startLabel}
            aria-invalid={error ? true : undefined}
            className={inputClass}
            max={value.end || undefined}
            onChange={(event) => onChange({ ...value, start: event.target.value })}
            type="date"
            value={value.start}
          />
        </label>
        <label className="min-w-0 text-xs font-medium text-muted">
          <span className="mb-1 block">{endLabel}</span>
          <input
            aria-label={endLabel}
            aria-invalid={error ? true : undefined}
            className={inputClass}
            min={value.start || undefined}
            onChange={(event) => onChange({ ...value, end: event.target.value })}
            type="date"
            value={value.end}
          />
        </label>
      </div>
      {error && <p className="mt-1 text-sm text-red-700" id={`${id}-error`} role="alert">{error}</p>}
      {!error && hint && <p className="mt-1 text-xs leading-5 text-muted" id={`${id}-hint`}>{hint}</p>}
    </fieldset>
  )
}
