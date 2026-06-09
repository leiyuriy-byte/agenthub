import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../src/index';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-4 py-2', // 44px min height for accessibility
        sm: 'h-10 rounded-md px-3', // 40px min height
        lg: 'h-12 rounded-md px-8', // 48px for prominent CTAs
        icon: 'h-11 w-11', // 44px min touch target
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/**
 * Slot pattern: merges Button props onto the single child element instead of
 * rendering a wrapper <button>. This allows <Button asChild><Link ...></Button>
 * to work correctly — the Link receives all Button classes and handlers.
 */
function Slot({ children }: { children: React.ReactNode }) {
  if (!children || !React.isValidElement(children)) return null;
  return children;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const classes = buttonVariants({ variant, size, className });

    if (asChild && React.isValidElement(props.children)) {
      // asChild: merge button classes onto the single child element
      const childEl = props.children as React.ReactElement<Record<string, unknown>>;
      return (
        <Slot>
          {React.cloneElement(childEl, {
            ...childEl.props,
            className: cn(classes, (childEl.props as { className?: string }).className),
            ref,
          })}
        </Slot>
      );
    }

    return (
      <button
        className={classes}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
