export const SHEET_CONFLICT_MESSAGE =
  "A ficha mudou em outra janela. Suas edições continuam aqui; guarde o rascunho e recarregue a versão atual para conciliar.";
/** A version mismatch needs reconciliation, not repeated background writes. */
export class AutosaveConflictError extends Error {
  constructor() {
    super(SHEET_CONFLICT_MESSAGE);
    this.name = "AutosaveConflictError";
  }
}
