"use client"

import * as React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TooltipWrapperProps {
  content: string
  children: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  delay?: number
  className?: string
}

export function TooltipWrapper({
  content,
  children,
  side = "top",
  delay = 200,
  className,
}: TooltipWrapperProps) {
  return (
    <TooltipProvider delayDuration={delay}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} className={className}>
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
