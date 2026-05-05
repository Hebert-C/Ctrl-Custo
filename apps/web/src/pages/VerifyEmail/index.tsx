import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, setToken } from "../../lib/api";

type Status = "verifying" | "success" | "error";

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setErrorMsg("Link inválido.");
      return;
    }

    api.auth
      .verifyEmail(token)
      .then(({ accessToken }) => {
        setToken(accessToken);
        setStatus("success");
        setTimeout(() => navigate("/dashboard", { replace: true }), 2000);
      })
      .catch((err) => {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Erro ao verificar e-mail.");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center space-y-4">
        {status === "verifying" && (
          <>
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-500">Verificando seu e-mail…</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-4xl">✓</div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              E-mail confirmado!
            </h2>
            <p className="text-sm text-gray-500">Redirecionando para o app…</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-4xl">✕</div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Link inválido ou expirado
            </h2>
            <p className="text-sm text-red-500">{errorMsg}</p>
            <button
              onClick={() => navigate("/login", { replace: true })}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Voltar ao login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
