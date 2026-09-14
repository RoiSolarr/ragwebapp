import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "outline" | "ghost";
type ButtonSize = "default" | "sm" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-paper shadow-[0_8px_18px_rgba(19,44,58,0.16)] hover:-translate-y-0.5 hover:bg-indigo hover:shadow-[0_10px_24px_rgba(23,107,120,0.2)]",
  outline:
    "border border-line bg-paper-raised text-ink shadow-sm hover:-translate-y-0.5 hover:border-indigo hover:text-indigo",
  ghost: "text-ink-muted hover:bg-line/60 hover:text-ink",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-11 px-5 text-sm",
  sm: "h-9 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function buttonClass({
  variant = "primary",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={buttonClass({ variant, size, className })} {...props} />
  )
);
Button.displayName = "Button";