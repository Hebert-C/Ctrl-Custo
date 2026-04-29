import { describe, it, expect, beforeEach } from "vitest";
import { createDatabase } from "../db/index";
import { createCategoryService } from "../services/CategoryService";

describe("CategoryService", () => {
  let service: ReturnType<typeof createCategoryService>;

  beforeEach(async () => {
    const db = await createDatabase();
    service = createCategoryService(db);
  });

  it("cria uma categoria e retorna com id", async () => {
    const category = await service.create({
      name: "Alimentação",
      type: "expense",
      color: "#FF5733",
      icon: "food",
    });

    expect(category.id).toBeDefined();
    expect(category.name).toBe("Alimentação");
    expect(category.type).toBe("expense");
  });

  it("busca categoria por id", async () => {
    const created = await service.create({
      name: "Salário",
      type: "income",
      color: "#33FF57",
      icon: "money",
    });

    const found = await service.findById(created.id);
    expect(found).not.toBeNull();
    expect(found?.name).toBe("Salário");
  });

  it("retorna null para id inexistente", async () => {
    const found = await service.findById("nao-existe");
    expect(found).toBeNull();
  });

  it("lista todas as categorias", async () => {
    await service.create({ name: "Transporte", type: "expense", color: "#AAA", icon: "car" });
    await service.create({ name: "Lazer", type: "expense", color: "#BBB", icon: "game" });

    const all = await service.findAll();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it("filtra categorias por tipo", async () => {
    await service.create({ name: "Freelance", type: "income", color: "#CCC", icon: "work" });
    await service.create({ name: "Mercado", type: "expense", color: "#DDD", icon: "cart" });

    const incomeCategories = await service.findByType("income");
    expect(incomeCategories.every((c) => c.type === "income")).toBe(true);
  });

  it("atualiza uma categoria", async () => {
    const created = await service.create({
      name: "Saúde",
      type: "expense",
      color: "#EEE",
      icon: "health",
    });

    const updated = await service.update(created.id, { name: "Saúde e Bem-estar" });
    expect(updated?.name).toBe("Saúde e Bem-estar");
  });

  it("deleta uma categoria", async () => {
    const created = await service.create({
      name: "Temporária",
      type: "both",
      color: "#FFF",
      icon: "temp",
    });

    const deleted = await service.delete(created.id);
    expect(deleted).toBe(true);

    const found = await service.findById(created.id);
    expect(found).toBeNull();
  });
});
