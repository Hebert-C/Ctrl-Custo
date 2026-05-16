import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../hooks/useAuth";
import { api, ApiError } from "../../lib/api";

const REGISTRATION_ENABLED = false;

type Mode = "login" | "register";

export function Login() {
  const navigate = useNavigate();
  const { login, register, pendingVerificationEmail, clearPendingVerification } = useAuthStore();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  if (pendingVerificationEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center space-y-4">
          <div className="text-4xl">✉</div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Verifique seu e-mail
          </h2>
          <p className="text-sm text-gray-500">
            Enviamos um link de confirmação para{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {pendingVerificationEmail}
            </span>
            . Clique no link para ativar sua conta.
          </p>
          <p className="text-xs text-gray-400">O link expira em 24 horas.</p>
          {resendDone ? (
            <p className="text-xs text-green-600">E-mail reenviado!</p>
          ) : (
            <button
              onClick={async () => {
                setResendLoading(true);
                await api.auth.resendVerification(pendingVerificationEmail).catch(() => undefined);
                setResendLoading(false);
                setResendDone(true);
              }}
              disabled={resendLoading}
              className="text-xs text-blue-600 hover:underline disabled:opacity-50"
            >
              {resendLoading ? "Enviando…" : "Reenviar e-mail"}
            </button>
          )}
          <button
            onClick={() => {
              clearPendingVerification();
              setMode("login");
            }}
            className="block w-full text-xs text-gray-400 hover:text-gray-600 mt-2"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setErrorCode("");
    try {
      if (mode === "login") {
        await login(email, password);
        navigate("/dashboard", { replace: true });
      } else {
        await register(email, password);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setErrorCode(err.code ?? "");
      } else {
        setError(err instanceof Error ? err.message : "Erro ao autenticar.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendLoading(true);
    await api.auth.resendVerification(email).catch(() => undefined);
    setResendLoading(false);
    setResendDone(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Ctrl+Custo</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Controle financeiro pessoal
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-5">
          {REGISTRATION_ENABLED && (
            <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
              {(["login", "register"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError("");
                    setErrorCode("");
                    setResendDone(false);
                  }}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    mode === m
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {m === "login" ? "Entrar" : "Criar conta"}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                E-mail
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Senha
              </label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            {error && (
              <div className="space-y-1">
                <p className="text-xs text-red-500">{error}</p>
                {errorCode === "EMAIL_NOT_VERIFIED" && (
                  <>
                    {resendDone ? (
                      <p className="text-xs text-green-600">
                        E-mail reenviado! Verifique sua caixa de entrada.
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendLoading}
                        className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                      >
                        {resendLoading ? "Enviando…" : "Reenviar e-mail de verificação"}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
