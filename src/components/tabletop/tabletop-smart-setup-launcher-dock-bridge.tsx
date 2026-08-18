export function TabletopSmartSetupLauncherDockBridge() {
  // O launcher canônico já é renderizado pelo TabletopSmartSetupBridge no topo direito da Mesa.
  // Mantemos este bridge inerte para não criar um segundo botão flutuante concorrente.
  return null;
}
