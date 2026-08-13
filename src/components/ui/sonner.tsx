import { Toaster as Sonner } from "sonner";
import { AlertTriangle, CheckCircle2, Info, LoaderCircle, XCircle } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      {...props}
      className="tadeon-toaster"
      theme="dark"
      richColors={false}
      closeButton
      expand
      visibleToasts={4}
      gap={10}
      icons={{
        success: <CheckCircle2 aria-hidden="true" />,
        info: <Info aria-hidden="true" />,
        warning: <AlertTriangle aria-hidden="true" />,
        error: <XCircle aria-hidden="true" />,
        loading: <LoaderCircle className="animate-spin" aria-hidden="true" />,
      }}
      toastOptions={{
        closeButtonAriaLabel: "Fechar notificação",
        classNames: {
          toast: "tadeon-toast",
          content: "tadeon-toast__content",
          title: "tadeon-toast__title",
          description: "tadeon-toast__description",
          icon: "tadeon-toast__icon",
          closeButton: "tadeon-toast__close",
          actionButton: "tadeon-toast__action",
          cancelButton: "tadeon-toast__cancel",
          success: "tadeon-toast--success",
          info: "tadeon-toast--info",
          warning: "tadeon-toast--warning",
          error: "tadeon-toast--error",
          loading: "tadeon-toast--loading",
        },
      }}
    />
  );
};

export { Toaster };
