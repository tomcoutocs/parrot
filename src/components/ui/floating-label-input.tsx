"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle } from "lucide-react"

interface FloatingLabelInputProps extends React.ComponentProps<"input"> {
  label: string
  error?: string
  helperText?: string
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
  containerClassName?: string
}

const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ 
    label, 
    error, 
    helperText, 
    startIcon, 
    endIcon, 
    className, 
    containerClassName,
    value,
    defaultValue,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

    // Check if input has value
    React.useEffect(() => {
      const checkValue = () => {
        const input = inputRef.current
        if (input) {
          setHasValue(input.value.length > 0)
        }
      }
      
      checkValue()
      const input = inputRef.current
      if (input) {
        input.addEventListener('input', checkValue)
        return () => input.removeEventListener('input', checkValue)
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
          {/* Start Icon */}
          {startIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-muted-foreground">
              {startIcon}
            </div>
          )}

          {/* Input */}
          <input
            ref={inputRef}
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
              startIcon && "pl-11",
              endIcon && "pr-11",
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
              "absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none",
              "transition-all duration-200 ease-out origin-left",
              "text-muted-foreground",
              isFloating
                ? "top-3 translate-y-0 text-xs font-medium scale-100"
                : "text-sm scale-100",
              startIcon && "left-11",
              hasError && isFloating && "text-destructive",
              !hasError && isFloating && "text-foreground"
            )}
          >
            {label}
            {props.required && <span className="text-destructive ml-0.5">*</span>}
          </label>

          {/* End Icon */}
          {endIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-muted-foreground">
              {endIcon}
            </div>
          )}

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

FloatingLabelInput.displayName = "FloatingLabelInput"

export { FloatingLabelInput }

