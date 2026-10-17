import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, TOKEN_KEY, USER_KEY } from "../lib/api";
import {
  buildLoginPayload,
  saveSession,
  validateLoginInput,
} from "../lib/auth";

export interface AuthUser {
  id: number;
  cardCode: string;
  fullName?: string;
  role?: string;
  departmentId?: number;
  departmentName?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (identifier: string, password: string, remember: boolean) => Promise<AuthUser | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStored(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

function readInitial(): { user: AuthUser | null; token: string | null } {
  try {
    const token = readStored(TOKEN_KEY);
    const raw = readStored(USER_KEY);
    return { token, user: raw ? (JSON.parse(raw) as AuthUser) : null };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(readInitial);
  const [user, setUser] = useState<AuthUser | null>(initial.user);
  const [token, setToken] = useState<string | null>(initial.token);

  const login = useCallback(
    async (identifier: string, password: string, remember: boolean) => {
      const check = validateLoginInput(identifier, password);
      if (!check.valid) {
        throw new Error(
          check.identifier ?? check.password ?? "Thông tin chưa hợp lệ",
        );
      }
      const payload = buildLoginPayload(identifier, password);
      try {
        const res = await api.post("/api/Auth/login", payload);
        const data = res.data as {
          token?: string;
          user?: AuthUser;
        };
        if (!data?.token) throw new Error("Máy chủ không trả về token");
        saveSession(data.token, JSON.stringify(data.user ?? null), remember);
        setToken(data.token);
        setUser(data.user ?? null);
        return data.user ?? null;
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ??
          (err as Error)?.message ??
          "Đăng nhập thất bại";
        throw new Error(message);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, login, logout }),
    [user, token, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải nằm trong <AuthProvider>");
  return ctx;
}
