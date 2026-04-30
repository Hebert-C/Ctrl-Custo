import { create } from "zustand";
import { goals } from "@ctrl-custo/core";
import { eq } from "drizzle-orm";
import type { Goal, NewGoal, CoreDatabase } from "@ctrl-custo/core";

function rowToGoal(row: typeof goals.$inferSelect): Goal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.targetAmount,
    currentAmount: row.currentAmount,
    deadline: row.deadline ?? undefined,
    status: row.status,
    color: row.color,
    icon: row.icon,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

interface GoalStore {
  goals: Goal[];
  load: (db: CoreDatabase) => Promise<void>;
  add: (db: CoreDatabase, data: NewGoal) => Promise<Goal>;
  deposit: (db: CoreDatabase, id: string, amountCents: number) => Promise<void>;
  update: (db: CoreDatabase, id: string, data: Partial<NewGoal>) => Promise<void>;
  remove: (db: CoreDatabase, id: string) => Promise<void>;
}

export const useGoalStore = create<GoalStore>((set, get) => ({
  goals: [],

  load: async (db) => {
    const rows = await db.select().from(goals);
    set({ goals: rows.map(rowToGoal) });
  },

  add: async (db, data) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await db.insert(goals).values({ id, ...data, createdAt: now, updatedAt: now });
    const [row] = await db.select().from(goals).where(eq(goals.id, id));
    const goal = rowToGoal(row);
    set((s) => ({ goals: [...s.goals, goal] }));
    return goal;
  },

  deposit: async (db, id, amountCents) => {
    const now = new Date().toISOString();
    const goal = get().goals.find((g) => g.id === id);
    if (!goal) return;
    const newAmount = goal.currentAmount + amountCents;
    const isCompleted = newAmount >= goal.targetAmount;
    await db
      .update(goals)
      .set({
        currentAmount: newAmount,
        status: isCompleted ? "completed" : "active",
        updatedAt: now,
      })
      .where(eq(goals.id, id));
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === id
          ? { ...g, currentAmount: newAmount, status: isCompleted ? "completed" : "active" }
          : g
      ),
    }));
  },

  update: async (db, id, data) => {
    const now = new Date().toISOString();
    await db
      .update(goals)
      .set({ ...data, updatedAt: now })
      .where(eq(goals.id, id));
    const [row] = await db.select().from(goals).where(eq(goals.id, id));
    if (!row) return;
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? rowToGoal(row) : g)) }));
  },

  remove: async (db, id) => {
    await db.delete(goals).where(eq(goals.id, id));
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
  },
}));
