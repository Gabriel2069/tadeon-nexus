import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function Tdv2Conversion({
  canEdit,
  onPrepare,
}: {
  canEdit: boolean;
  onPrepare: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="tdv-legacy-notice">
      <p>
        <strong>Ficha da edição anterior.</strong> Matrizes, Alinhavos, recursos e progressão
        mudaram no TdV II.
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" disabled={!canEdit}>
            Preparar ficha TdV II
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preparar a conversão para TdV II</DialogTitle>
            <DialogDescription>
              Os números antigos não têm equivalência automática. O site preservará os campos da
              edição anterior, levará o conteúdo narrativo para um rascunho e abrirá a distribuição
              inicial do TdV II para revisão. Nenhuma experiência antiga será convertida
              automaticamente em PU.
            </DialogDescription>
          </DialogHeader>
          <p>
            Revise Feição, Âncora, dois Alinhavos em grau 2 e quatro em grau 1. A nova ficha só
            libera testes após concluir essa preparação.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Continuar na edição anterior
            </Button>
            <Button
              disabled={!canEdit}
              onClick={() => {
                onPrepare();
                setOpen(false);
              }}
            >
              Preparar rascunho e preservar dados antigos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
