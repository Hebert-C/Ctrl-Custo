import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../src/hooks/useAuth";
import { lightColors } from "@ctrl-custo/ui";

type Mode = "login" | "register";

const colors = lightColors;

export default function LoginScreen() {
  const router = useRouter();
  const { login, register } = useAuthStore();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={s.inner}>
        <Text style={s.title}>Ctrl+Custo</Text>
        <Text style={s.subtitle}>Controle financeiro pessoal</Text>

        {/* Tab switch */}
        <View style={s.tabRow}>
          {(["login", "register"] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[s.tab, mode === m && s.tabActive]}
              onPress={() => {
                setMode(m);
                setError("");
              }}
            >
              <Text style={[s.tabText, mode === m && s.tabTextActive]}>
                {m === "login" ? "Entrar" : "Criar conta"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form */}
        <View style={s.form}>
          <Text style={s.label}>E-mail</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="seu@email.com"
            placeholderTextColor={colors.textDisabled}
          />

          <Text style={s.label}>Senha</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor={colors.textDisabled}
          />

          {error ? <Text style={s.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnText}>{mode === "login" ? "Entrar" : "Criar conta"}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.primary,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceRaised,
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  tabActive: { backgroundColor: colors.surface, shadowOpacity: 0.1, shadowRadius: 4 },
  tabText: { fontSize: 14, fontWeight: "500", color: colors.textSecondary },
  tabTextActive: { color: colors.textPrimary, fontWeight: "600" },
  form: { gap: 4 },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  error: { fontSize: 13, color: colors.danger, marginTop: 8 },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
