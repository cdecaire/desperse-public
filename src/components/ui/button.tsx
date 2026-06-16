import * as React from "react"
import {
  Button as SableButton,
  type ButtonProps as SableButtonProps,
} from "@cdecaire/sable"
import { cva, type VariantProps } from "class-variance-authority"

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * The app's <Button> now renders @cdecaire/sable's Button (Base UI `useRender`
 * + the motion-interactive/motion-press recipes) while keeping the LEGACY shadcn
 * API so existing call sites don't change:
 *   - variant: default | destructive | outline | secondary | ghost | link
 *   - size:    default | cta | icon | icon-lg
 *   - asChild: Radix Slot semantics → converted to Sable's `render` prop
 *
 * `buttonVariants` is preserved unchanged (calendar.tsx styles its day cells with
 * it). Known deltas to audit when fanning out: Sable sizes are NOT responsive
 * (legacy shrank to md:h-[32px] on desktop), and Sable defaults type="button"
 * (a raw <button> defaults to submit inside a <form>).
 */

// Legacy variant/size strings → Sable's. (icon-lg has no Sable size → icon.)
const VARIANT_MAP = {
  default: "primary",
  destructive: "destructive",
  outline: "outline",
  secondary: "secondary",
  ghost: "ghost",
  link: "link",
} as const

const SIZE_MAP = {
  default: "md",
  cta: "cta",
  icon: "icon",
  "icon-lg": "icon",
} as const

// Preserved for backward-compat: calendar.tsx imports buttonVariants({ variant }).
// Mirrors the legacy shadcn classes so non-Button consumers keep their exact look.
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium hover-fade focus:outline-none focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[40px] md:h-[32px] px-4 py-2",
        cta: "h-[44px] md:h-[32px] px-4 py-2",
        icon: "h-[40px] w-[40px] md:h-[32px] md:w-[32px]",
        "icon-lg": "h-16 w-16",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const sableVariant = VARIANT_MAP[variant ?? "default"] ?? "primary"
    const sableSize = SIZE_MAP[size ?? "default"] ?? "md"

    // asChild (Radix Slot) → Base UI render prop: render the child element as the
    // host (childless), passing its own children through as the button content.
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{
        children?: React.ReactNode
      }>
      const { children: inner, ...childProps } = child.props
      return (
        <SableButton
          variant={sableVariant}
          size={sableSize}
          className={className}
          ref={ref as SableButtonProps["ref"]}
          render={React.createElement(child.type, childProps)}
          {...props}
        >
          {inner}
        </SableButton>
      )
    }

    return (
      <SableButton
        variant={sableVariant}
        size={sableSize}
        className={className}
        ref={ref as SableButtonProps["ref"]}
        {...props}
      >
        {children}
      </SableButton>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
