export type CategoryType = "income" | "expense" | "both";

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string; // hex: "#FF5733"
  icon: string; // nome do ícone (ex: "food", "transport")
  parentId?: string; // para subcategorias
  createdAt: string;
  updatedAt: string;
}

export type NewCategory = Omit<Category, "id" | "createdAt" | "updatedAt">;
