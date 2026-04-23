"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCommandMenu } from "./CommandMenuProvider";

const SEQUENCE_WINDOW_MS = 1000;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

export function GlobalShortcuts() {
  const router = useRouter();
  const { isOpen, close } = useCommandMenu();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  // Refs para estado "g" pendente — evita re-registros por mudança de estado
  const pendingGRef = useRef<number | null>(null);
  const isOpenRef = useRef(isOpen);
  const closeRef = useRef(close);
  const isAdminRef = useRef(isAdmin);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);
  useEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignora quando há modificadores relevantes (Ctrl/Cmd/Alt) — esses são
      // tratados por outros listeners (ex.: provider do palette).
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;

      const key = e.key.toLowerCase();

      // Sequência "g d" → dashboard; "g a" → admin
      if (pendingGRef.current !== null) {
        const now = Date.now();
        const elapsed = now - pendingGRef.current;
        pendingGRef.current = null;
        if (elapsed <= SEQUENCE_WINDOW_MS) {
          if (key === "d") {
            e.preventDefault();
            if (isOpenRef.current) closeRef.current();
            router.push("/dashboard");
            return;
          }
          if (key === "a" && isAdminRef.current) {
            e.preventDefault();
            if (isOpenRef.current) closeRef.current();
            router.push("/admin");
            return;
          }
        }
        // se não for um match válido, segue adiante para processar outras teclas
      }

      if (key === "g") {
        pendingGRef.current = Date.now();
        // expira automaticamente
        window.setTimeout(() => {
          pendingGRef.current = null;
        }, SEQUENCE_WINDOW_MS);
        return;
      }

      // "N" → nova vaga (fecha palette se aberto)
      if (key === "n") {
        e.preventDefault();
        if (isOpenRef.current) closeRef.current();
        router.push("/vagas/nova");
        return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return null;
}
