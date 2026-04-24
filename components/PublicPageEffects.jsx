'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const PUBLIC_PAGE_MATCHERS = [
  /^\/$/,
  /^\/sos(?:\/.*)?$/,
];

function shouldEnhance(pathname) {
  return PUBLIC_PAGE_MATCHERS.some((matcher) => matcher.test(pathname || ''));
}

export default function PublicPageEffects() {
  const pathname = usePathname();

  useEffect(() => {
    if (!shouldEnhance(pathname) || typeof window === 'undefined' || !window.Lenis) return undefined;

    const lenis = new window.Lenis({
      duration: 0.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
    });

    let frameId = null;
    const raf = (time) => {
      lenis.raf(time);
      frameId = window.requestAnimationFrame(raf);
    };

    frameId = window.requestAnimationFrame(raf);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, [pathname]);

  useEffect(() => {
    if (!shouldEnhance(pathname) || typeof window === 'undefined') return undefined;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.15 });

    const nodes = document.querySelectorAll('.animate-on-scroll');
    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
