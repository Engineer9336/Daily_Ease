"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "./AppProvider";

/** Client-side convenience redirect. Real protection is enforced server-side in every API route. */
export default function useGuard(role) {
  const { user } = useApp(), router = useRouter();
  useEffect(() => {
    if (user === undefined) return;
    if (!user) router.replace("/login");
    else if (user.role !== role) router.replace("/");
  }, [user, role, router]);
  return user && user.role === role ? user : null;
}
