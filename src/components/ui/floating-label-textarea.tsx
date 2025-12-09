"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle } from "lucide-react"

interface FloatingLabelTextareaProps extends React.ComponentProps<"textarea"> {
  label: string
  error?: string
  helperText?: string
  containerClassName?: string
}

const FloatingLabelTextarea = React.forwardRef<HTMLTextAreaElement, FloatingLabelTextareaProps>(
  ({ 
    label, 
    error, 
    helperText, 
    className, 
    containerClassName,
    value,
    defaultValue,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(false)
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)

    // Combine refs
    React.useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement)

    // Check if textarea has value
    React.useEffect(() => {
      const checkValue = () => {
        const textarea = textareaRef.current
        if (textarea) {
          setHasValue(textarea.value.length > 0)
        }
      }
      
      checkValue()
      const textarea = textareaRef.current
      if (textarea) {
        textarea.addEventListener('input', checkValue)
        return () => textarea.removeEventListener('input', checkValue)
      }
    }, [])

    // Check initial value
    React.useEffect(() => {
      if (value !== undefined) {
        setHasValue(String(value).length > 0)
      } else if (defaultValue !== undefined) {
        setHasValue(String(defaultValue).length > 0)
      }
    }, [value, defaultValue])

    const isFloating = isFocused || hasValue
    const hasError = !!error

    return (
      <div className={cn("relative w-full", containerClassName)}>
        <div className="relative">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            defaultValue={defaultValue}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              props.onBlur?.(e)
            }}
            className={cn(
              "peer w-full rounded-lg border bg-background dark:bg-input/30 px-4 pt-6 pb-2 text-sm",
              "transition-all duration-200 ease-out",
              "placeholder:text-transparent",
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
              "resize-none",
              hasError
                ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                : "border-input focus:border-ring focus:ring-ring/20",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
              className
            )}
            placeholder=" " // Space for floating label
            {...props}
          />

          {/* Floating Label */}
          <label
            className={cn(
              "absolute left-4 top-4 pointer-events-none",
              "transition-all duration-200 ease-out origin-left",
              "text-muted-foreground",
              isFloating
                ? "top-3 text-xs font-medium"
                : "text-sm",
              hasError && isFloating && "text-destructive",
              !hasError && isFloating && "text-foreground"
            )}
          >
            {label}
            {props.required && <span className="text-destructive ml-0.5">*</span>}
          </label>

          {/* Focus indicator line */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 h-0.5 rounded-b-lg",
              "transition-all duration-200 ease-out",
              isFocused && !hasError && "bg-ring scale-x-100",
              isFocused && hasError && "bg-destructive scale-x-100",
              !isFocused && "scale-x-0 bg-transparent"
            )}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Helper Text */}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-muted-foreground">{helperText}</p>
        )}
      </div>
    )
  }
)

FloatingLabelTextarea.displayName = "FloatingLabelTextarea"

export { FloatingLabelTextarea }

