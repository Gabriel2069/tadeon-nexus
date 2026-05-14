import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/master-panel")({
  head: () => ({ meta: [{ title: "Painel do Mestre — Tadeon Nexus" }] }),
  component: () => (
    <ProtectedShell requireRole="mestre">
      <MasterPanel />
    </ProtectedShell>
  ),
});

interface Settings {
  id: string;
  initiative_notes: string;
  scene_combat: string;
  scene_investigation: string;
  scene_dialogue: string;
  reminders: string;
  quick_refs: string;
}

function MasterPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("game_settings")
        .select("id,initiative_notes,scene_combat,scene_investigation,scene_dialogue,reminders,quick_refs")
        .eq("key", "global")
        .maybeSingle();
      setSettings(data as Settings | null);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { id, ...payload } = settings;
    const { error } = await supabase.from("game_settings").update(payload).eq("id", id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Salvo!");
  };

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((p) => (p ? { ...p, [key]: value } : p));
  };

  if (loading || !settings) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const fields: { key: keyof Settings; label: string; placeholder: string }[] = [
    { key: "initiative_notes", label: "Ordem de Iniciativa", placeholder: "Notas de iniciativa..." },
    { key: "scene_combat", label: "Cena de Combate", placeholder: "Detalhes da cena de combate..." },
    { key: "scene_investigation", label: "Cena de Investigação", placeholder: "Detalhes da cena de investigação..." },
    { key: "scene_dialogue", label: "Cena de Diálogo", placeholder: "Detalhes da cena de diálogo..." },
    { key: "reminders", label: "Lembretes do Mestre", placeholder: "Lembretes para a sessão..." },
    { key: "quick_refs", label: "Referências Rápidas", placeholder: "Outras referências..." },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-cinzel text-2xl md:text-3xl font-bold">Painel do Mestre</h1>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </Button>
      </div>

      <Tabs defaultValue="scenes">
        <TabsList>
          <TabsTrigger value="scenes">Cenas & Notas</TabsTrigger>
          <TabsTrigger value="quick">Referências</TabsTrigger>
        </TabsList>

        <TabsContent value="scenes" className="space-y-4">
          {fields.slice(0, 5).map((f) => (
            <Card key={f.key} className="p-4">
              <h3 className="font-cinzel font-bold mb-2">{f.label}</h3>
              <Textarea
                value={String(settings[f.key] ?? "")}
                placeholder={f.placeholder}
                onChange={(e) => update(f.key, e.target.value as never)}
                rows={4}
              />
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="quick">
          <Card className="p-4">
            <h3 className="font-cinzel font-bold mb-2">Referências Rápidas</h3>
            <Textarea
              value={settings.quick_refs}
              onChange={(e) => update("quick_refs", e.target.value)}
              rows={10}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
