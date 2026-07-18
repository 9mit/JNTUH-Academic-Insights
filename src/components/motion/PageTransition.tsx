import type { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  mode?: 'wait' | 'sync' | 'popLayout';
  id: string;
}

/**
 * Tab swap without opacity animation.
 * Opacity enter/exit previously left content blank (~0.3–0.8s) and could stick
 * at opacity 0 under Chromium when combined with backdrop-filter / clipped text.
 */
export default function PageTransition({ children, id }: PageTransitionProps) {
  return (
    <div key={id} className="page-transition-root">
      {children}
    </div>
  );
}
