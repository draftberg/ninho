"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // instalação do PWA é best-effort; falha aqui não deve travar o app
      });
    }
  }, []);

  return null;
}
