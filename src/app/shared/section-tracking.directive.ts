import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';
import { SectionNavService } from '../core/section-nav.service';

/** Add to a section with an `id` to highlight it in the side rail while on screen. */
@Directive({ selector: '[appTrackSection]' })
export class TrackSectionDirective {
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const nav = inject(SectionNavService);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => destroyRef.onDestroy(nav.observe(el)));
  }
}
