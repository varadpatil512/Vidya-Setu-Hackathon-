import { useEffect, useRef } from 'react';

/**
 * useScrollReveal — attaches an IntersectionObserver to all elements
 * matching `selector` inside `containerRef`. When an element enters the
 * viewport, the `is-visible` class is added, triggering the CSS
 * `.animate-fade-up.is-visible` animation defined in index.css.
 *
 * @param {string} selector  — CSS selector for target children (default: '.animate-fade-up')
 * @param {object} options   — IntersectionObserver options
 */
export function useScrollReveal(selector = '.animate-fade-up', options = {}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const elements = container.querySelectorAll(selector);
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            // Once visible, stop observing (one-shot)
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, ...options }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [selector]);

  return containerRef;
}
