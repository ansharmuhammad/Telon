"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const AnimatedProgress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
    {...props}
  >
    <motion.div
      className="h-full w-full flex-1 bg-primary"
      initial={{ x: "-100%" }}
      animate={{ x: `-${100 - (value || 0)}%` }}
      transition={{ ease: "easeInOut", duration: 0.8 }}
    />
  </ProgressPrimitive.Root>
))
AnimatedProgress.displayName = ProgressPrimitive.Root.displayName

export { AnimatedProgress }