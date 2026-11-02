import { HERO_ART } from './assets';
import Picture from './Picture';

/**
 * Narrower viewports get the 768px centre crop. Pixel-based on purpose: the
 * art is laid out in CSS pixels, so this must match the crop width in
 * scripts/optimize-images.mjs, not a text-size breakpoint.
 */
const DESKTOP_ART_MEDIA = '(min-width: 768px)';

/**
 * Decorative layers behind the hero copy: the Kingdom Tower art, ambient glows,
 * a faint grid and two slow light effects. Every motion is a compositor-only
 * CSS animation and is switched off for users who prefer reduced motion. The
 * art itself is never faded in, because it is the page's LCP element.
 */
export default function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none">
      {/* Same framing as the CSS background it replaces: natural size, centred, top-aligned. */}
      <Picture
        image={HERO_ART.narrow}
        variants={[{ media: DESKTOP_ART_MEDIA, image: HERO_ART.desktop }]}
        alt=""
        priority
        className="absolute inset-0 h-full w-full max-w-none object-none object-top"
      />

      <div className="absolute inset-0 overflow-hidden opacity-[0.15] motion-reduce:hidden">
        <div className="absolute inset-0 animate-[hero-sweep_15s_linear_infinite] bg-[linear-gradient(105deg,transparent_30%,rgba(79,197,223,0.2)_45%,rgba(255,255,255,0.4)_50%,rgba(79,197,223,0.2)_55%,transparent_70%)]" />
      </div>

      <div className="absolute -start-32 -top-32 h-[700px] w-[700px] animate-[hero-glow-pulse_6s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,rgba(79,197,223,0.18)_0%,rgba(79,197,223,0.05)_40%,transparent_70%)] motion-reduce:animate-none" />
      <div className="absolute -bottom-48 -end-24 h-[600px] w-[600px] animate-[hero-glow-pulse_8s_ease-in-out_2s_infinite] rounded-full bg-[radial-gradient(circle,rgba(92,191,143,0.14)_0%,rgba(92,191,143,0.04)_45%,transparent_70%)] motion-reduce:animate-none" />

      <div className="absolute inset-0 bg-[linear-gradient(rgba(79,197,223,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(79,197,223,0.04)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black_30%,transparent_100%)]" />

      <div className="absolute inset-x-0 top-0 h-px animate-[hero-scan_4s_linear_infinite] bg-gradient-to-r from-transparent via-sky/40 to-transparent opacity-0 motion-reduce:hidden" />

      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#060f1a] to-transparent" />
    </div>
  );
}
