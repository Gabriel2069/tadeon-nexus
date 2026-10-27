/** One edition-aware reading for the campaign roster and session cards. */
export interface CampaignSheetReading {
  rules_version?: number;
  exposure: number;
  stats: {
    pv_current: number;
    ps_current: number;
    pe_current: number;
    pi_current?: number;
    pa_current?: number;
  };
}
export function campaignSheetReading(sheet: CampaignSheetReading) {
  const current = sheet.rules_version === 2;
  return {
    progress: current
      ? `Desenvolvimento ${sheet.exposure}%`
      : `Edição anterior · Exposição ${sheet.exposure}`,
    resources: current
      ? ([
          ["PV", sheet.stats.pv_current],
          ["PI", sheet.stats.pi_current ?? 0],
          ["PE", sheet.stats.pe_current],
        ] as const)
      : ([
          ["PV", sheet.stats.pv_current],
          ["PS", sheet.stats.ps_current],
          ["PE", sheet.stats.pe_current],
          ["PA", sheet.stats.pa_current ?? 0],
        ] as const),
  };
}
