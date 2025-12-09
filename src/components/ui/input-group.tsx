"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface InputGroupProps {
  children: React.ReactNode
  label?: string
  description?: string
  error?: string
  className?: string
  orientation?: "horizontal" | "vertical"
}

const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ children, label, description, error, className, orientation = "vertical" }, ref) => {
    return (
      <div ref={ref} className={cn("w-full", className)}>
        {/* Group Label */}
        {label && (
          <div className="mb-3">
            <label className="text-sm font-semibold text-foreground">
              {label}
            </label>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}

        {/* Input Container */}
        <div
          className={cn(
            "relative flex gap-0 rounded-lg border bg-background/50 backdrop-blur-sm",
            "transition-all duration-200",
            error
              ? "border-destructive"
              : "border-input focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/10",
            orientation === "horizontal" ? "flex-row" : "flex-col"
          )}
        >
          {React.Children.map(children, (child, index) => {
            if (!React.isValidElement(child)) return child

            const isFirst = index === 0
            const isLast = index === React.Children.count(children) - 1

            return (
              <div
                className={cn(
                  "relative flex-1",
                  orientation === "horizontal" && !isFirst && "border-l border-input",
                  orientation === "vertical" && !isFirst && "border-t border-input"
                )}
              >
                {React.cloneElement(child as React.ReactElement<{ className?: string }>, {
                  className: cn(
                    "border-0 rounded-none",
                    isFirst && orientation === "horizontal" && "rounded-l-lg",
                    isFirst && orientation === "vertical" && "rounded-t-lg",
                    isLast && orientation === "horizontal" && "rounded-r-lg",
                    isLast && orientation === "vertical" && "rounded-b-lg",
                    (child as React.ReactElement<{ className?: string }>).props.className
                  ),
                })}
              </div>
            )
          })}
        </div>

        {/* Group Error */}
        {error && (
          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-destructive">
            <span>{error}</span>
          </div>
        )}
      </div>
    )
  }
)

InputGroup.displayName = "InputGroup"

export { InputGroup }

