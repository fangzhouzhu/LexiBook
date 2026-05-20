"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { FormEvent, useState } from "react";
import { register } from "@/services/authApi";

export default function RegisterPage() {
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
      setError("两次输入的密码不一致");
      return;
    }
    setLoading(true);
    try {
      const res = await register({ username, password });
      localStorage.setItem("lexibook_user", JSON.stringify(res.user));
      localStorage.setItem("lexibook_token", res.token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page-bg">
      <section className="auth-book">
        <div className="auth-card">
          <p className="text-[12px] uppercase tracking-[0.28em] text-[#a08464]">Create Account</p>
          <h1 className="auth-title">创建阅读身份</h1>
          <p className="auth-subtitle">建立一个属于你的阅读档案，从今天开始累计词汇、笔记和长期表达能力。</p>

          <form className="auth-form" onSubmit={onSubmit}>
            <label className="auth-label">用户名</label>
            <div className="auth-input-wrap">
              <User size={18} />
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="设置一个用户名" required />
            </div>

            <label className="auth-label">密码</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="设置登录密码"
                required
              />
              <button type="button" className="auth-eye-btn" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <label className="auth-label">确认密码</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                required
              />
              <button type="button" className="auth-eye-btn" onClick={() => setShowConfirmPassword((value) => !value)}>
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error ? <p className="auth-error">{error}</p> : null}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "创建中..." : "开始我的阅读"}
            </button>
          </form>

          <div className="auth-divider">
            <span />
            <p>
              已有账号？ <Link href="/login">立即登录</Link>
            </p>
            <span />
          </div>
        </div>
      </section>
    </main>
  );
}
