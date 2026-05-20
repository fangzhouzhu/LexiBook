"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { login } from "@/services/authApi";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const remembered = localStorage.getItem("lexibook_remember_username");
    if (remembered) {
      setUsername(remembered);
      setRememberMe(true);
    }
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login({ username, password });
      localStorage.setItem("lexibook_user", JSON.stringify(res.user));
      localStorage.setItem("lexibook_token", res.token);
      if (rememberMe) {
        localStorage.setItem("lexibook_remember_username", username);
      } else {
        localStorage.removeItem("lexibook_remember_username");
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page-bg">
      <section className="auth-book">
        <div className="auth-card">
          <p className="text-[12px] uppercase tracking-[0.28em] text-[#a08464]">Welcome Back</p>
          <h1 className="auth-title">登录 LexiBook</h1>
          <p className="auth-subtitle">回到你的私人阅读空间，继续积累句子、词汇和表达节奏。</p>

          <form className="auth-form" onSubmit={onSubmit}>
            <label className="auth-label">用户名</label>
            <div className="auth-input-wrap">
              <User size={18} />
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="输入你的用户名" required />
            </div>

            <label className="auth-label">密码</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入登录密码"
                required
              />
              <button type="button" className="auth-eye-btn" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="auth-row">
              <label className="auth-remember">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                记住用户名
              </label>
              <button type="button" className="auth-link-btn">
                忘记密码
              </button>
            </div>

            {error ? <p className="auth-error">{error}</p> : null}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "登录中..." : "进入阅读空间"}
            </button>
          </form>

          <div className="auth-divider">
            <span />
            <p>
              还没有账号？ <Link href="/register">创建新账号</Link>
            </p>
            <span />
          </div>
        </div>
      </section>
    </main>
  );
}
