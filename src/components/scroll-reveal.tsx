'use client';

import { useEffect, useRef } from 'react';

export function ScrollRevealObserver() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    );

    const staggerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const children = entry.target.querySelectorAll('.stagger-item');
            children.forEach((child, i) => {
              (child as HTMLElement).style.transitionDelay = `${i * 80}ms`;
              child.classList.add('visible');
            });
            staggerObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );

    document.querySelectorAll('.scroll-reveal').forEach((el) => observer.observe(el));
    document.querySelectorAll('.stagger-container').forEach((el) => staggerObserver.observe(el));

    return () => {
      observer.disconnect();
      staggerObserver.disconnect();
    };
  }, []);

  return null;
}
