import { PageHeader } from "@/components/page-header";
import { useState } from "react";
import { AlertTriangle, AppWindow, ChevronDown, Columns3, Maximize2, PanelTop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PopupGallery() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div data-page-layout className="tadeon-page space-y-5">
      <PageHeader
        section="tools"
        eyebrow="Auditoria de overlays"
        title="Popups e superfícies flutuantes"
        description="Abra cada primitive no viewport simulado e confira safe area, textura, rolagem, fechamento e motion."
        mark={<AppWindow />}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="p-5">
          <PanelTop className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-cinzel text-lg font-semibold">Dialog</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Centro, altura máxima, rolagem e botão de fechar.
          </p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-4 w-full">Abrir dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Janela de auditoria</DialogTitle>
                <DialogDescription>
                  Conteúdo longo para testar encaixe em telas pequenas e grandes.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                {Array.from({ length: 7 }, (_, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-border/70 p-3 text-sm text-muted-foreground"
                  >
                    Bloco {index + 1} · textura, respiro e rolagem.
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setDialogOpen(false)}>Confirmar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Card>

        <Card className="p-5">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-cinzel text-lg font-semibold">Alert dialog</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Ação crítica, largura e empilhamento.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="mt-4 w-full" variant="outline">
                Abrir confirmação
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar alteração?</AlertDialogTitle>
                <AlertDialogDescription>
                  As ações devem ficar totalmente dentro do viewport.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>

        <Card className="p-5">
          <Maximize2 className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-cinzel text-lg font-semibold">Sheet</h2>
          <p className="mt-1 text-xs text-muted-foreground">Painel lateral, saída e safe area.</p>
          <Sheet>
            <SheetTrigger asChild>
              <Button className="mt-4 w-full" variant="outline">
                Abrir painel
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Painel lateral</SheetTitle>
                <SheetDescription>Teste de largura, textura e animação.</SheetDescription>
              </SheetHeader>
              <div className="mt-5 grid gap-3">
                {Array.from({ length: 5 }, (_, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-border/70 p-3 text-sm text-muted-foreground"
                  >
                    Seção {index + 1}
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </Card>

        <Card className="p-5">
          <ChevronDown className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-cinzel text-lg font-semibold">Popover</h2>
          <p className="mt-1 text-xs text-muted-foreground">Âncora e colisão com as bordas.</p>
          <Popover>
            <PopoverTrigger asChild>
              <Button className="mt-4 w-full" variant="outline">
                Abrir popover
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <p className="text-sm font-medium">Ações contextuais</p>
              <p className="mt-1 text-xs text-muted-foreground">
                O painel deve permanecer inteiramente visível.
              </p>
              <Button size="sm" className="mt-3 w-full">
                Ação
              </Button>
            </PopoverContent>
          </Popover>
        </Card>

        <Card className="p-5">
          <Columns3 className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-cinzel text-lg font-semibold">Select</h2>
          <p className="mt-1 text-xs text-muted-foreground">Lista, colisão e item ativo.</p>
          <Select defaultValue="tablet">
            <SelectTrigger className="mt-4 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mobile">Mobile</SelectItem>
              <SelectItem value="tablet">Tablet</SelectItem>
              <SelectItem value="desktop">Desktop</SelectItem>
              <SelectItem value="wide">Desktop largo</SelectItem>
            </SelectContent>
          </Select>
        </Card>

        <Card className="p-5">
          <AppWindow className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-cinzel text-lg font-semibold">Material aninhado</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Confirma acabamento também em quadros que não usam Card.
          </p>
          <div className="mt-4 rounded-xl border border-border/70 p-4">
            <p className="text-sm font-medium">Quadro interno</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Malha, luz e contraste devem permanecer visíveis.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
