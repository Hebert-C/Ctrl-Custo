export type GoalStatus = "active" | "completed" | "cancelled";

export interface Goal {
  id: string;
  name: string;
  targetAmount: number; // em centavos
  currentAmount: number; // em centavos
  deadline?: string; // ISO 8601: "YYYY-MM-DD"
  status: GoalStatus;
  color: string;
  icon: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type NewGoal = Omit<Goal, "id" | "createdAt" | "updatedAt">;
