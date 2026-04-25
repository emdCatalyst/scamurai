'use client';

import { useEffect, useRef } from 'react';
import { useMotionValue, useInView, animate, useReducedMotion } from 'framer-motion';

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  duration?: number;
  className?: string;
}

export default function AnimatedCounter({
  target,
  suffix = '',
  duration = 1.8,
  className = '',
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (!isInView) return;

    if (prefersReduced) {
      if (ref.current) ref.current.textContent = `${target}${suffix}`;
      return;
    }

    const controls = animate(motionValue, target, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = `${Math.round(v)}${suffix}`;
      },
    });

    return () => controls.stop();
  }, [isInView, target, suffix, duration, motionValue, prefersReduced]);

  return (
    <span ref={ref} className={className}>
      0{suffix}
    </span>
  );
}
