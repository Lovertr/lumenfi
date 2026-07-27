'use client';

import { useEffect } from 'react';
import { trackEvent } from './tracker';

/**
 * One-shot event fired when a specific page mounts.
 * Use for funnel milestones: <PageTracker event="pricing_view" />
 */
export function PageTracker({ event, properties }: { event: string; properties?: Record<string, unknown> }) {
  useEffect(() => {
    trackEvent(event, properties ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
  return null;
}
