'use client';

import { Toaster as SonnerToaster } from 'sonner';

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

const toasterOptions: ToasterProps = {
  position: 'top-center',
  richColors: true,
  closeButton: true,
  toastOptions: {
    unstyled: true,
    classNames: {
      toast:
        'flex items-center gap-3 p-4 rounded-lg border bg-popover text-popover-foreground shadow-lg',
      title: 'text-sm font-semibold',
      description: 'text-sm text-muted-foreground',
      actionButton:
        'bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1 text-sm font-medium',
      cancelButton:
        'bg-muted text-muted-foreground hover:bg-muted/80 rounded-md px-3 py-1 text-sm font-medium',
    },
  },
};

export { SonnerToaster as Toaster, toasterOptions };
