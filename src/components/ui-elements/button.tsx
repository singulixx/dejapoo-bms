import { cva, VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2.5 text-center font-medium hover:bg-opacity-90 font-medium transition focus:outline-none",
  {
    variants: {
      variant: {
        // Per request: use purple (primary) styling for all buttons.
        primary: "bg-primary text-white hover:bg-primary/90",
        green: "bg-primary text-white hover:bg-primary/90",
        dark: "bg-primary text-white hover:bg-primary/90",
        outlinePrimary: "bg-primary text-white hover:bg-primary/90",
        outlineGreen: "bg-primary text-white hover:bg-primary/90",
        outlineDark: "bg-primary text-white hover:bg-primary/90",
      },
      shape: {
        default: "",
        rounded: "rounded-[5px]",
        full: "rounded-full",
      },
      size: {
        default: "py-3.5 px-10 py-3.5 lg:px-8 xl:px-10",
        small: "py-[11px] px-6",
      },
    },
    defaultVariants: {
      variant: "primary",
      shape: "default",
      size: "default",
    },
  },
);

type ButtonProps = HTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    label: string;
    icon?: React.ReactNode;
  };

export function Button({
  label,
  icon,
  variant,
  shape,
  size,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonVariants({ variant, shape, size, className })}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  );
}
