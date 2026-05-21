"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  BookText,
  ChevronDown,
  Home,
  Library,
  LogOut,
  NotebookPen,
  Settings,
  Sparkles,
  UserCircle2
} from "lucide-react";
import { clearAuth, getCurrentUser, getStoredUser, type AuthUser } from "@/services/authApi";

type ShellUser = {
  displayName: string;
  avatarUrl: string;
};

const menu = [
  { key: "home", label: "首页", icon: Home, href: "/" },
  { key: "bookshelf", label: "书架", icon: BookOpen, href: "/?tab=bookshelf" },
  { key: "bookstore", label: "书城", icon: Library, href: "/bookstore" },
  { key: "vocabulary", label: "生词本", icon: Sparkles, href: "/?tab=vocabulary" },
  { key: "notes", label: "笔记", icon: NotebookPen, href: "/?tab=notes" },
  { key: "statistics", label: "统计", icon: BarChart3, href: "/?tab=statistics" },
  { key: "settings", label: "设置", icon: Settings, href: "/?tab=settings" }
] as const;

function mapUser(user: AuthUser | null): ShellUser {
  return {
    displayName: user?.username || "Alex",
    avatarUrl: "/generated/avatar-alex.svg"
  };
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<ShellUser>(mapUser(null));
  const [menuOpen, setMenuOpen] = useState(false);

  const isAuthPage = pathname === "/login" || pathname === "/register";

  useEffect(() => {
    if (isAuthPage) return;

    let cancelled = false;

    async function loadUser() {
      const stored = getStoredUser();
      if (stored && !cancelled) {
        setUser(mapUser(stored));
      }

      try {
        const current = await getCurrentUser();
        if (!cancelled && current) {
          setUser(mapUser(current));
        }
      } catch {
        if (!cancelled) {
          setUser(mapUser(stored));
        }
      }
    }

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, [isAuthPage, pathname]);

  useEffect(() => {
    function handleClickOutside() {
      setMenuOpen(false);
    }

    if (!menuOpen) return;
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [menuOpen]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  const currentTab = searchParams.get("tab");
  const isReaderPage = pathname.startsWith("/books/");
  const activeKey =
    isReaderPage
      ? "bookshelf"
      : pathname === "/bookstore"
        ? "bookstore"
      : currentTab && menu.some((item) => item.key === currentTab)
        ? currentTab
        : "home";

  function handleLogout() {
    clearAuth();
    setMenuOpen(false);
    setUser(mapUser(null));
    router.push("/login");
  }

  return (
    <div className={`relative min-w-[1440px] w-full ${isReaderPage ? "h-screen overflow-hidden" : "min-h-screen"}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.78),transparent_26%),radial-gradient(circle_at_82%_10%,rgba(214,188,152,0.12),transparent_18%)]" />
      <div className="relative flex min-w-[1440px] w-full">
        <aside className="sticky top-0 flex h-screen w-[228px] flex-col border-r border-[var(--border)] bg-[rgba(251,247,240,0.72)] px-6 py-9 backdrop-blur-lg">
          <Link href="/" className="flex items-center gap-3 px-2 text-[26px] font-semibold tracking-[-0.03em] text-[#2d1f14]">
            <BookText size={28} />
            <span className="font-display">LexiBook</span>
          </Link>

          <nav className="mt-14 space-y-2">
            {menu.map((item) => {
              const Icon = item.icon;
              const isActive = activeKey === item.key;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-[14px] px-4 py-3.5 text-[16px] transition ${
                    isActive
                      ? "bg-[linear-gradient(135deg,#a06d31_0%,#b47b39_100%)] text-white shadow-[0_10px_22px_rgba(160,109,49,0.18)]"
                      : "text-[#5f4a39] hover:bg-[rgba(160,124,84,0.06)] hover:text-[#2d1f14]"
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className={`flex flex-1 flex-col ${isReaderPage ? "min-h-0 h-screen overflow-hidden" : "min-h-screen"}`}>
          <header className="flex items-center justify-end px-10 pb-4 pt-6">
            <div className="relative">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen((open) => !open);
                }}
                className="flex items-center gap-3 rounded-none bg-transparent px-1 py-1 shadow-none transition opacity-90 hover:opacity-100"
              >
                <img src={user.avatarUrl} alt={user.displayName} className="h-9 w-9 rounded-full object-cover ring-2 ring-[#ecd9be]" />
                <p className="text-[15px] font-semibold leading-none text-[#2e2118]">{user.displayName}</p>
                <ChevronDown size={18} className={`text-[#85694d] transition ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen && (
                <div
                  className="glass-card absolute right-0 top-[calc(100%+14px)] z-40 min-w-[220px] overflow-hidden rounded-[16px]"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="px-3 py-3">
                    <button className="flex w-full items-center gap-3 rounded-[12px] px-4 py-3 text-left text-[15px] text-[#4c3a2a] transition hover:bg-[rgba(159,124,84,0.10)]">
                      <UserCircle2 size={18} />
                      <span>个人信息</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="mt-1 flex w-full items-center gap-3 rounded-[12px] px-4 py-3 text-left text-[15px] text-[#9b4f2b] transition hover:bg-[rgba(202,111,58,0.10)]"
                    >
                      <LogOut size={18} />
                      <span>退出登录</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>

          <main className={`flex-1 px-10 ${isReaderPage ? "min-h-0 overflow-hidden pb-0" : "pb-10"}`}>{children}</main>
        </div>
      </div>
    </div>
  );
}

