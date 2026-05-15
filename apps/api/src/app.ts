import { Hono } from "hono";
import { applySecurityMiddleware } from "./middleware/security";
import { authRouter } from "./routes/auth";
import { accountsRouter } from "./routes/accounts";
import { categoriesRouter } from "./routes/categories";
import { cardsRouter } from "./routes/cards";
import { transactionsRouter } from "./routes/transactions";
import { goalsRouter } from "./routes/goals";
import { reportsRouter } from "./routes/reports";

const app = new Hono();

applySecurityMiddleware(app);

app.get("/health", (c) => c.json({ ok: true, timestamp: new Date().toISOString() }));

app.route("/auth", authRouter);
app.route("/accounts", accountsRouter);
app.route("/categories", categoriesRouter);
app.route("/cards", cardsRouter);
app.route("/transactions", transactionsRouter);
app.route("/goals", goalsRouter);
app.route("/reports", reportsRouter);

app.onError((err, c) => {
  console.error(`[error] ${c.req.method} ${c.req.path}:`, err.message);
  return c.json({ error: "Internal server error" }, 500);
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
