import { createDatabase } from "@ctrl-custo/core";
import type { CoreDatabase } from "@ctrl-custo/core";

const DB_STORAGE_KEY = "ctrl-custo-db";

let instance: CoreDatabase | null = null;

// Carrega o dump binário salvo no localStorage (placeholder para futura persistência)
function _loadSavedData(): Uint8Array | undefined {
  try {
    const saved = localStorage.getItem(DB_STORAGE_KEY);
    if (!saved) return undefined;
    const binary = atob(saved);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return undefined;
  }
}

// Serializa e salva o estado atual do banco no localStorage
export function persistDatabase(_db: CoreDatabase): void {
  // sql.js não expõe export direto via Drizzle — persistência é feita via eventos
  // A persistência real é implementada via beforeunload no main.tsx
}

// Singleton: inicializa uma vez e reutiliza em toda a app
export async function getDatabase(): Promise<CoreDatabase> {
  if (instance) return instance;
  instance = await createDatabase({
    locateFile: (file: string) => `/${file}`,
  });
  return instance;
}

export type { CoreDatabase };
