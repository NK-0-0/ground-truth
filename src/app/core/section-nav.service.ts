import { DOCUMENT, Injectable, inject, signal } from '@angular/core';

export interface NavSection {
  id: string;
  label: string;
}

/** Sections listed in the side rail, in page order. */
export const NAV_SECTIONS: NavSection[] = [
  { id: 'verified-geometry', label: '00 · Checked geometry' },
  { id: 'public-analysis', label: '01 · Evidence' },
  { id: 'older-analysis', label: '02 · Older analysis' },
  { id: 'mp-plan', label: '03 · Campus plan' },
  { id: 'mp-alternatives', label: '04 · Compare designs' },
  { id: 'smart-furniture', label: '05 · Smart furniture' },
  { id: 'mp-3d', label: '06 · Campus 3D' },
  { id: 'mp-actions', label: '07 · Review actions' },
  { id: 'mp-programme', label: '08 · Programme' },
  { id: 'mp-evidence', label: '09 · Sources' },
];

/** Tracks which section is on screen and scrolls between sections. */
@Injectable({ providedIn: 'root' })
export class SectionNavService {
  private readonly document = inject(DOCUMENT);
  readonly active = signal<string | null>(null);

  private readonly observer =
    typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(
          (entries) => {
            for (const e of entries) if (e.isIntersecting) this.active.set(e.target.id);
          },
          { rootMargin: '-5% 0px -70% 0px' },
        );

  /** Registers a section element so the rail highlights it while it is on screen. */
  observe(el: Element): () => void {
    this.observer?.observe(el);
    return () => this.observer?.unobserve(el);
  }

  scrollTo(id: string, behavior: ScrollBehavior = 'auto'): void {
    this.document.getElementById(id)?.scrollIntoView({ block: 'start', behavior });
  }
}
