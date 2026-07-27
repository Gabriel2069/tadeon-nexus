import { describe, expect, it } from "vitest";
import {
  DEFAULT_SUPABASE_PROJECT_ID,
  DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  DEFAULT_SUPABASE_URL,
  resolvePublicSupabaseConfig,
} from "./public-config";

describe("configuração pública do Supabase", () => {
  it("mantém o projeto oficial disponível mesmo sem variáveis no build", () => {
    expect(resolvePublicSupabaseConfig()).toEqual({
      projectId: DEFAULT_SUPABASE_PROJECT_ID,
      url: DEFAULT_SUPABASE_URL,
      publishableKey: DEFAULT_SUPABASE_PUBLISHABLE_KEY,
    });
  });

  it("prioriza variáveis VITE e aceita o formato do runtime como alternativa", () => {
    expect(
      resolvePublicSupabaseConfig({
        VITE_SUPABASE_PROJECT_ID: "vite-project",
        VITE_SUPABASE_URL: "https://vite-project.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "vite-key",
        SUPABASE_PROJECT_ID: "runtime-project",
        SUPABASE_URL: "https://runtime-project.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "runtime-key",
      }),
    ).toEqual({
      projectId: "vite-project",
      url: "https://vite-project.supabase.co",
      publishableKey: "vite-key",
    });

    expect(
      resolvePublicSupabaseConfig({
        SUPABASE_PROJECT_ID: "runtime-project",
        SUPABASE_URL: "https://runtime-project.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "runtime-key",
      }),
    ).toEqual({
      projectId: "runtime-project",
      url: "https://runtime-project.supabase.co",
      publishableKey: "runtime-key",
    });
  });

  it("ignora valores vazios injetados pelo ambiente", () => {
    expect(
      resolvePublicSupabaseConfig({
        VITE_SUPABASE_URL: " ",
        VITE_SUPABASE_PUBLISHABLE_KEY: "",
      }),
    ).toMatchObject({
      url: DEFAULT_SUPABASE_URL,
      publishableKey: DEFAULT_SUPABASE_PUBLISHABLE_KEY,
    });
  });
});
