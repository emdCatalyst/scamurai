"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { ImageOff } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import ImageLightbox from "./ImageLightbox";
import { useOrdersDrawer } from "./OrdersDrawerProvider";

type DrawerOrder = {
  id: string;
  orderNumber: string;
  branchName: string;
  deliveryAppName: string;
  deliveryAppLogoUrl: string | null;
  submittedByName: string;
  submittedByEmail: string;
  subtotal: string | null;
  currency: string;
  notes: string | null;
  submittedAt: string;
};

type ImageSet = { thumb: string; full: string };
type SignedUrls = { sealed: ImageSet | null; opened: ImageSet | null };

type FetchResult =
  | {
      kind: "success";
      orderId: string;
      order: DrawerOrder;
      signedUrls: SignedUrls;
    }
  | { kind: "error"; orderId: string; message: string };

export default function OrderDetailDrawer() {
  const t = useTranslations("brand.orders.drawer");
  const format = useFormatter();
  const { orderId, close } = useOrdersDrawer();

  const [result, setResult] = useState<FetchResult | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;

    fetch(`/api/orders/${orderId}/signed-urls`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setResult({
          kind: "success",
          orderId,
          order: data.order,
          signedUrls: data.images,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setResult({
          kind: "error",
          orderId,
          message: t("failedToLoad"),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [orderId, t]);

  // Display only data that matches the current orderId — discard stale results.
  const current = result && result.orderId === orderId ? result : null;
  const order = current?.kind === "success" ? current.order : null;
  const signedUrls: SignedUrls =
    current?.kind === "success"
      ? current.signedUrls
      : { sealed: null, opened: null };
  const error = current?.kind === "error" ? current.message : null;
  const isLoading = Boolean(orderId) && !current;

  const isOpen = Boolean(orderId);

  const amountFormatted =
    order && order.subtotal
      ? format.number(Number(order.subtotal), {
          style: "currency",
          currency: order.currency,
          maximumFractionDigits: 2,
        })
      : "—";

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={close}
        title={
          <h2 className="text-lg font-mono font-bold text-[var(--brand-surface-fg)]">
            {order?.orderNumber ?? t("loading")}
          </h2>
        }
      >
        {isLoading && <DrawerSkeleton />}

        {error && (
          <div className="text-sm text-[var(--brand-danger)] py-8 text-center">
            {error}
          </div>
        )}

        {order && (
          <>
            <section className="space-y-3">
              <DetailRow label={t("branch")}>
                <span className="text-[var(--brand-surface-fg)]">
                  {order.branchName}
                </span>
              </DetailRow>

              <DetailRow label={t("deliveryApp")}>
                <div className="flex items-center gap-2">
                  {order.deliveryAppLogoUrl ? (
                    <Image
                      src={order.deliveryAppLogoUrl}
                      alt=""
                      width={20}
                      height={20}
                      className="rounded object-contain"
                    />
                  ) : null}
                  <span className="text-[var(--brand-surface-fg)]">
                    {order.deliveryAppName}
                  </span>
                </div>
              </DetailRow>

              <DetailRow label={t("submittedBy")}>
                <div>
                  <div className="text-[var(--brand-surface-fg)]">
                    {order.submittedByName}
                  </div>
                  <div className="text-xs text-[var(--brand-surface-fg-muted)]">
                    {order.submittedByEmail}
                  </div>
                </div>
              </DetailRow>

              <DetailRow label={t("submittedAt")}>
                <span className="text-[var(--brand-surface-fg)]">
                  {format.dateTime(new Date(order.submittedAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </DetailRow>
            </section>

            <section className="border-y border-[var(--brand-border)] py-6">
              <div className="text-xs uppercase tracking-wider text-[var(--brand-surface-fg-muted)] mb-1">
                {t("amount")}
              </div>
              <div className="text-3xl font-bold text-[var(--brand-text-accent)] tabular-nums">
                {amountFormatted}
              </div>
            </section>

            {order.notes && (
              <section>
                <div className="text-xs uppercase tracking-wider text-[var(--brand-surface-fg-muted)] mb-2">
                  {t("notes")}
                </div>
                <p className="text-sm text-[var(--brand-surface-fg)] whitespace-pre-wrap leading-relaxed">
                  {order.notes}
                </p>
              </section>
            )}

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PhotoSlot
                label={t("sealedPhoto")}
                images={signedUrls.sealed}
                missingLabel={t("imageUnavailable")}
                onOpen={(src) =>
                  setLightboxSrc({ src, alt: t("sealedPhoto") })
                }
              />
              <PhotoSlot
                label={t("openedPhoto")}
                images={signedUrls.opened}
                missingLabel={t("imageUnavailable")}
                onOpen={(src) =>
                  setLightboxSrc({ src, alt: t("openedPhoto") })
                }
              />
            </section>
          </>
        )}
      </Drawer>

      <ImageLightbox
        src={lightboxSrc?.src ?? null}
        alt={lightboxSrc?.alt ?? ""}
        onClose={() => setLightboxSrc(null)}
      />
    </>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wider text-[var(--brand-surface-fg-muted)]">
        {label}
      </span>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

function PhotoSlot({
  label,
  images,
  missingLabel,
  onOpen,
}: {
  label: string;
  images: ImageSet | null;
  missingLabel: string;
  onOpen: (src: string) => void;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-[var(--brand-surface-fg-muted)] mb-2">
        {label}
      </div>
      {images ? (
        <PhotoThumbnail
          key={images.thumb}
          label={label}
          images={images}
          onOpen={onOpen}
        />
      ) : (
        <div className="w-full aspect-square rounded-2xl border border-dashed border-[var(--brand-border)] bg-[var(--brand-surface-fg)]/5 flex flex-col items-center justify-center text-[var(--brand-surface-fg-muted)]">
          <ImageOff size={28} className="mb-2" />
          <span className="text-xs">{missingLabel}</span>
        </div>
      )}
    </div>
  );
}

function PhotoThumbnail({
  label,
  images,
  onOpen,
}: {
  label: string;
  images: ImageSet;
  onOpen: (src: string) => void;
}) {
  // `loaded` resets to false naturally when the parent re-keys this component
  // on a new thumb src (e.g. switching to a different order).
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onOpen(images.full)}
      className="relative block w-full aspect-square rounded-2xl overflow-hidden border border-[var(--brand-border)] bg-[var(--brand-surface-fg)]/5 hover:ring-2 hover:ring-[var(--brand-primary)]/30 transition-all cursor-zoom-in"
    >
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-[var(--brand-surface-fg)]/10" />
      )}
      <Image
        src={images.thumb}
        alt={label}
        fill
        sizes="(max-width: 640px) 100vw, 256px"
        className={`object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        decoding="async"
        unoptimized
      />
    </button>
  );
}

function DrawerSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-20 rounded bg-[var(--brand-surface-fg)]/10" />
            <div className="h-4 w-44 rounded bg-[var(--brand-surface-fg)]/10" />
          </div>
        ))}
      </div>

      <div className="border-y border-[var(--brand-border)] py-6 space-y-2">
        <div className="h-3 w-20 rounded bg-[var(--brand-surface-fg)]/10" />
        <div className="h-8 w-48 rounded bg-[var(--brand-surface-fg)]/10" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="aspect-square rounded-2xl bg-[var(--brand-surface-fg)]/10" />
        <div className="aspect-square rounded-2xl bg-[var(--brand-surface-fg)]/10" />
      </div>
    </div>
  );
}
