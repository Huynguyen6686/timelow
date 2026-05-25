import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function FloatingAction({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const target = document.getElementById('floating-actions-container');
  if (!target) return null;

  return createPortal(children, target);
}
