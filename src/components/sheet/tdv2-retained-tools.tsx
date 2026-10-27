import { Section, RowTable } from "./sheet-ui";
import { AddItemDialog } from "./add-item-dialog";
import { SheetInventoryOrganizer } from "./sheet-inventory-organizer";
import { TdvField } from "./tdv2-fields";
import { uid, type TdvCharacter, type TdvRecord } from "@/lib/tdv2";
import type { SheetData, SheetUpdate } from "./sheet-model";
export function Tdv2DossierDetails({
  sheet,
  canEdit,
  onUpdate,
}: {
  sheet: SheetData;
  canEdit: boolean;
  onUpdate: SheetUpdate;
}) {
  return (
    <Section id="tdv-pessoal" title="Dossiê pessoal">
      <div className="tdv-grid">
        <TdvField
          label="Idade"
          value={sheet.age ?? ""}
          short
          disabled={!canEdit}
          onChange={(v) => onUpdate("age", v)}
        />
        {(
          [
            ["wound", "Ferida"],
            ["question", "Pergunta da personagem"],
            ["lifeCycleTrait", "Traço do ciclo de vida"],
          ] as const
        ).map(([key, label]) => (
          <TdvField
            key={key}
            label={label}
            value={sheet.identity_data[key] ?? ""}
            disabled={!canEdit}
            onChange={(v) => onUpdate("identity_data", { ...sheet.identity_data, [key]: v })}
          />
        ))}
      </div>
    </Section>
  );
}
export function Tdv2Belongings({
  character: c,
  onChange,
  canEdit,
  sheetId,
  beforeOrganize,
}: {
  character: TdvCharacter;
  onChange: (v: TdvCharacter) => void;
  canEdit: boolean;
  sheetId: string;
  beforeOrganize: () => Promise<boolean>;
}) {
  return (
    <>
      {(
        [
          [
            "Arma",
            "Armas",
            "Família",
            "Alcance",
            "Manejo",
            "Impacto",
            "Propriedades",
            "Porte e acesso",
          ],
          ["Equipamento", "Inventário", "Descrição", "Porte e acesso", "Integridade"],
        ] as const
      ).map(([kind, title, ...fields]) => {
        const records = c.records.filter((r) => r.kind === kind),
          rows = records.map((r) => ({ id: r.id, nome: r.name, ...r.fields }));
        return (
          <Section
            key={kind}
            id={kind === "Arma" ? "sec-armas" : "sec-inv"}
            title={title}
            extra={
              <div className="tdv-actions">
                {kind === "Equipamento" && (
                  <SheetInventoryOrganizer
                    sheetId={sheetId}
                    canEdit={canEdit}
                    beforeOpen={beforeOrganize}
                  />
                )}{" "}
                {canEdit && (
                  <AddItemDialog<Record<string, string>>
                    title={`Novo registro: ${title}`}
                    triggerLabel={`Adicionar ${kind === "Arma" ? "arma" : "item"}`}
                    initial={{ nome: "", ...Object.fromEntries(fields.map((key) => [key, ""])) }}
                    fields={[
                      { key: "nome", label: "Nome" },
                      ...fields.map((key) => ({ key, label: key })),
                    ]}
                    onAdd={(row) =>
                      onChange({
                        ...c,
                        records: [
                          ...c.records,
                          {
                            id: uid(),
                            kind: kind as TdvRecord["kind"],
                            name: row.nome,
                            fields: Object.fromEntries(
                              Object.entries(row).filter(([key]) => key !== "nome"),
                            ),
                          },
                        ],
                      })
                    }
                  />
                )}
              </div>
            }
          >
            <RowTable
              rows={rows}
              canEdit={canEdit}
              columns={[
                { key: "nome", label: "Nome", flex: 1.2 },
                ...fields.slice(0, 3).map((key) => ({ key, label: key, flex: 1 })),
              ]}
              onChange={(next) =>
                onChange({
                  ...c,
                  records: c.records
                    .filter((r) => r.kind !== kind)
                    .concat(
                      next.map((row) => ({
                        id: row.id,
                        kind,
                        name: row.nome,
                        fields: {
                          ...records.find((r) => r.id === row.id)?.fields,
                          ...Object.fromEntries(
                            Object.entries(row).filter(([key]) => !["id", "nome"].includes(key)),
                          ),
                        },
                      })),
                    ),
                })
              }
            />
            {kind === "Arma" && (
              <p className="tdv-note">
                Impacto e propriedades seguem o texto da arma. O valor de dano anterior permanece no
                registro para revisão; a nova edição usa a consequência e o dano anunciados na ação.
              </p>
            )}
          </Section>
        );
      })}
    </>
  );
}
