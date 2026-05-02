"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type OrdersDrawerContextValue = {
  orderId: string | null;
  open: (id: string) => void;
  close: () => void;
};

const OrdersDrawerContext = createContext<OrdersDrawerContextValue | null>(null);

function syncUrl(orderId: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (orderId) {
    url.searchParams.set("orderId", orderId);
  } else {
    url.searchParams.delete("orderId");
  }
  // replaceState — keeps the URL shareable without triggering Next.js navigation
  // (which would round-trip the server component and stall the drawer).
  window.history.replaceState(window.history.state, "", url.toString());
}

export function OrdersDrawerProvider({
  children,
  initialOrderId = null,
}: {
  children: ReactNode;
  initialOrderId?: string | null;
}) {
  const [orderId, setOrderId] = useState<string | null>(initialOrderId);

  const open = useCallback((id: string) => {
    setOrderId(id);
    syncUrl(id);
  }, []);

  const close = useCallback(() => {
    setOrderId(null);
    syncUrl(null);
  }, []);

  return (
    <OrdersDrawerContext.Provider value={{ orderId, open, close }}>
      {children}
    </OrdersDrawerContext.Provider>
  );
}

export function useOrdersDrawer() {
  const ctx = useContext(OrdersDrawerContext);
  if (!ctx) {
    throw new Error(
      "useOrdersDrawer must be used inside <OrdersDrawerProvider>"
    );
  }
  return ctx;
}
