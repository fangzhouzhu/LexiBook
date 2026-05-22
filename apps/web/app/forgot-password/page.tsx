"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { FormEvent, useState } from "react";
import { resetPassword } from "@/services/authApi";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword({ username, password });
      localStorage.setItem("lexibook_user", JSON.stringify(res.user));
      localStorage.setItem("lexibook_token", res.token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "重置密码失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page-bg">
      <section className="auth-book">
        <div className="auth-card">
          <p className="text-[12px] uppercase tracking-[0.28em] text-[#a08464]">Reset Password</p>
          <h1 className="auth-title">找回 LexiBook</h1>
          <p className="auth-subtitle">输入用户名并设置新密码，重置成功后会自动回到你的阅读空间。</p>

          <form className="auth-form" onSubmit={onSubmit}>
            <label className="auth-label">用户名</label>
            <div className="auth-input-wrap">
              <User size={18} />
              <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="输入你的用户名" required />
            </div>

            <label className="auth-label">新密码</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="设置新的登录密码"
                required
              />
              <button type="button" className="auth-eye-btn" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <label className="auth-label">确认新密码</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="再次输入新密码"
                required
              />
              <button type="button" className="auth-eye-btn" onClick={() => setShowConfirmPassword((value) => !value)}>
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error ? <p className="auth-error">{error}</p> : null}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "正在重置..." : "重置密码并登录"}
            </button>
          </form>

          <div className="auth-divider">
            <span />
            <p>
              想起密码了？ <Link href="/login">返回登录</Link>
            </p>
            <span />
          </div>
        </div>
      </section>
    </main>
  );
}
