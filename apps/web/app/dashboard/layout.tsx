"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { colors, spacing } from "@oumoul/ui";
import { useAuth } from "@/context/auth-context";

const navItems: Array<{ href: string; label: string }> = [
  { href: "/dashboard", label: "Vue d’ensemble" },
  { href: "/dashboard/imane/cycle", label: "Cycle" },
  { href: "/dashboard/fasting", label: "Jeûne" },
  { href: "/dashboard/prayer", label: "Prière" },
  { href: "/dashboard/imane", label: "Imane" },
  { href: "/dashboard/dhikr", label: "Dhikr" },
  { href: "/dashboard/reminders", label: "Rappels" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loading } = useAuth();

  const activeHref = useMemo(() => {
    if (!pathname) return null;
    return navItems.find((item) => pathname.startsWith(item.href))?.href ?? null;
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.primary,
          color: colors.neutral100,
        }}
      >
        <p>Chargement…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: colors.primary,
        backgroundImage:
          "linear-gradient(to bottom, #F7EEDD 0%, #F4C2C2 35%, #E4D2F4 70%, #F7EEDD 100%)",
        color: colors.primaryDark,
        padding: `${spacing.xl}px ${spacing.lg}px`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: spacing.lg,
          flexWrap: "wrap",
          marginBottom: spacing.xl,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: spacing.xs,
              borderRadius: spacing.lg,
              backgroundColor: "rgba(0,0,0,0.25)",
            }}
          >
            <Image
              src="/Hidjabiicon.png"
              alt="Profil femme musulmane voilée"
              width={56}
              height={56}
              style={{ objectFit: "contain" }}
              priority
            />
          </div>
          <div>
            <p style={{ letterSpacing: 4, textTransform: "uppercase", fontSize: 12, color: "rgba(0,0,0,0.6)" }}>
              Tableau de bord
            </p>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginTop: spacing.xs, color: colors.primaryDark }}>
              {`Bienvenue, ${user.firstName || user.email}`}
            </h1>
          </div>
        </div>
        <div style={{ display: "flex", gap: spacing.md, alignItems: "center" }}>
          <nav style={{ display: "flex", gap: spacing.sm }}>
            {navItems.map((item) => {
              const isActive = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: `${spacing.xs}px ${spacing.md}px`,
                    borderRadius: spacing.md,
                    backgroundColor: isActive ? colors.primaryDark : "rgba(255,255,255,0.75)",
                    color: isActive ? colors.neutral100 : colors.primaryDark,
                    fontWeight: 600,
                    border: isActive ? "none" : "1px solid rgba(0,0,0,0.08)",
                    transition: "background-color 0.2s ease",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => void handleLogout()}
            style={{
              padding: `${spacing.xs}px ${spacing.md}px`,
              borderRadius: spacing.md,
              border: "1px solid rgba(0,0,0,0.15)",
              backgroundColor: "rgba(255,255,255,0.75)",
              color: colors.primaryDark,
              fontWeight: 600,
            }}
          >
            Se déconnecter
          </button>
        </div>
      </header>
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: spacing.lg,
        }}
      >
        {children}
      </main>
    </div>
  );
}
