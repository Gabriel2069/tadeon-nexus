import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollText, BookOpen, Heart, Target, NotebookPen } from "lucide-react";
import type { Description } from "@/lib/sheet-types";
export function SheetDescriptionPanel({
  description,
  canEdit,
  onChange,
}: {
  description: Description;
  canEdit: boolean;
  onChange: (v: Description) => void;
}) {
  return (
    <div className="tadeon-description-tab space-y-4">
      <Card className="tadeon-description-hero">
        <div className="tadeon-description-hero__mark" aria-hidden="true">
          <ScrollText />
        </div>
        <div className="min-w-0 flex-1">
          <p className="tadeon-eyebrow">Arquivo narrativo</p>
          <h2>Quem existe além dos números</h2>
          <p>Passado, presença e desejos da personagem. Escreva livremente em cada registro.</p>
        </div>
        <div className="tadeon-description-hero__progress">
          <strong>
            {
              (Object.values(description) as string[]).filter((value) => value.trim().length > 0)
                .length
            }
            <small>/4</small>
          </strong>
          <span>registros iniciados</span>
        </div>
      </Card>
      <div className="tadeon-description-grid">
        {(
          [
            {
              key: "historia",
              label: "História",
              kicker: "Antes da primeira cena",
              prompt:
                "Origem, acontecimentos decisivos, perdas, descobertas e o caminho que trouxe a personagem até aqui.",
              placeholder: "Quais acontecimentos ainda repercutem no presente?",
              icon: BookOpen,
            },
            {
              key: "personalidade",
              label: "Personalidade",
              kicker: "Presença em cena",
              prompt:
                "Gestos, contradições, afetos, hábitos e a forma como reage quando está sob pressão.",
              placeholder: "Como esta personagem pensa, sente e ocupa um ambiente?",
              icon: Heart,
            },
            {
              key: "objetivos",
              label: "Objetivos",
              kicker: "Vetores de mudança",
              prompt:
                "Desejos imediatos, ambições distantes e aquilo que não está disposta a sacrificar para alcançá-los.",
              placeholder: "O que ela busca ~ e qual preço se recusa a pagar?",
              icon: Target,
            },
            {
              key: "observacoes",
              label: "Observações",
              kicker: "Continuidade fina",
              prompt:
                "Voz, aparência, hábitos, promessas, objetos recorrentes e detalhes úteis para as próximas sessões.",
              placeholder: "Registre detalhes que não podem se perder entre as sessões.",
              icon: NotebookPen,
            },
          ] as const
        ).map(({ key, label, kicker, prompt, placeholder, icon: Icon }) => {
          const value = description[key] || "";
          const words = value.trim() ? value.trim().split(/\s+/).length : 0;
          return (
            <Card
              key={key}
              className="tadeon-description-card"
              data-filled={value.trim() ? "true" : "false"}
            >
              <div className="tadeon-description-card__heading">
                <span className="tadeon-description-card__icon" aria-hidden="true">
                  <Icon />
                </span>
                <div className="min-w-0">
                  <small>{kicker}</small>
                  <h3>{label}</h3>
                </div>
                <span className="tadeon-description-card__count">{words} palavras</span>
              </div>
              <details className="tadeon-description-card__guidance">
                <summary>Ideias para escrever</summary>
                <p className="tadeon-description-card__prompt">{prompt}</p>
              </details>
              <Textarea
                disabled={!canEdit}
                value={value}
                onChange={(event) => onChange({ ...description, [key]: event.target.value })}
                rows={3}
                aria-label={label}
                placeholder={placeholder}
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
