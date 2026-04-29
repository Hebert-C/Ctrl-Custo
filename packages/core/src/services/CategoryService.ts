import { eq } from "drizzle-orm";
import type { CoreDatabase } from "../db/index";
import { categories } from "../db/schema";
import type { Category, NewCategory } from "../types/category";

export function createCategoryService(db: CoreDatabase) {
  function rowToCategory(row: typeof categories.$inferSelect): Category {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      color: row.color,
      icon: row.icon,
      parentId: row.parentId ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  return {
    async create(data: NewCategory): Promise<Category> {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();

      await db.insert(categories).values({ id, ...data, createdAt: now, updatedAt: now });

      const [row] = await db.select().from(categories).where(eq(categories.id, id));
      return rowToCategory(row);
    },

    async findById(id: string): Promise<Category | null> {
      const [row] = await db.select().from(categories).where(eq(categories.id, id));
      return row ? rowToCategory(row) : null;
    },

    async findAll(): Promise<Category[]> {
      const rows = await db.select().from(categories);
      return rows.map(rowToCategory);
    },

    async findByType(type: Category["type"]): Promise<Category[]> {
      const rows = await db.select().from(categories).where(eq(categories.type, type));
      return rows.map(rowToCategory);
    },

    async update(id: string, data: Partial<NewCategory>): Promise<Category | null> {
      const now = new Date().toISOString();

      await db
        .update(categories)
        .set({ ...data, updatedAt: now })
        .where(eq(categories.id, id));

      return this.findById(id);
    },

    async delete(id: string): Promise<boolean> {
      const existing = await this.findById(id);
      if (!existing) return false;
      await db.delete(categories).where(eq(categories.id, id));
      return true;
    },
  };
}

export type CategoryService = ReturnType<typeof createCategoryService>;
