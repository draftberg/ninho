"use client";

import { useEffect, useState } from "react";
import { salvarPushSubscription, removerPushSubscription } from "@/lib/push";
import { BellIcon, BellSlashIcon } from "@phosphor-icons/react";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type Estado = "carregando" | "suportado" | "ativo" | "indisponivel";

export function NotificationOptIn() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function verificar() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setEstado("indisponivel");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setEstado(subscription ? "ativo" : "suportado");
    }
    verificar().catch(() => setEstado("indisponivel"));
  }, []);

  async function handleAtivar() {
    setPendente(true);
    setErro(null);
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Lembretes não configurados no servidor ainda.");

      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") throw new Error("Permissão de notificação negada.");

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await salvarPushSubscription(subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
      setEstado("ativo");
    } catch (err) {
      console.error("[push] falha ao ativar lembretes:", err);
      setErro(err instanceof Error ? err.message : "Não foi possível ativar os lembretes.");
    } finally {
      setPendente(false);
    }
  }

  async function handleDesativar() {
    setPendente(true);
    setErro(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removerPushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setEstado("suportado");
    } catch (err) {
      console.error("[push] falha ao desativar lembretes:", err);
      setErro("Não foi possível desativar os lembretes agora.");
    } finally {
      setPendente(false);
    }
  }

  if (estado === "carregando" || estado === "indisponivel") return null;

  return (
    <div className="card" style={{ marginTop: "1rem" }}>
      <h3>Lembretes</h3>
      <p className="entry-meta">
        Um resumo diário sobre contas vencendo amanhã, metas atrasadas e orçamento estourado.
      </p>
      {estado === "ativo" ? (
        <button type="button" className="secondary-button" onClick={handleDesativar} disabled={pendente}>
          <BellSlashIcon size={16} /> Desativar lembretes
        </button>
      ) : (
        <button type="button" className="primary-button" onClick={handleAtivar} disabled={pendente}>
          <BellIcon size={16} /> Ativar lembretes
        </button>
      )}
      {erro && <p className="form-message error">{erro}</p>}
    </div>
  );
}
