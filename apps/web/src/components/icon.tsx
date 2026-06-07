'use client';

import * as Icons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

/** Renders a lucide icon by its string name (used by the nav config). */
export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<LucideProps>>)[name] ?? Icons.Circle;
  return <Cmp {...props} />;
}
