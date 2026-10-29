import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { ReferenceNote } from '../../../shared/reference-note';
import { TrackSectionDirective } from '../../../shared/section-tracking.directive';
import { MasterplanStore } from '../masterplan.store';

/**
 * "Inspect the integrated concept in 3D". The viewer is a self-contained page
 * loaded on demand; it exchanges building selections with the map via postMessage.
 */
@Component({
  selector: 'app-campus-3d',
  imports: [ReferenceNote],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'mp-block',
    id: 'mp-3d',
    '(window:message)': 'onMessage($event)',
  },
  hostDirectives: [TrackSectionDirective],
  template: `
    <app-reference-note boundaryPill />
    <h3>Inspect the integrated concept in 3D</h3>
    <p class="mp-caption">
      Select a building to inspect its source ID, use, storeys and gross floor-area allocation. Flat
      ground and assumed heights are used. This is coordination massing, not measured, room-level,
      structural or services BIM.
    </p>
    <iframe
      #frame
      class="mp-viewer"
      title="Integrated R8 campus concept 3D inspection"
      [attr.src]="src()"
      (load)="onFrameLoad()"
    ></iframe>
    <p class="mp-caption">
      The model uses a rectangular display ground, which is not the campus parcel. Incomplete source
      boundary linework is shown separately. Site alignment, terrain, actual entrances, gradients
      and technical approvals remain unresolved.
    </p>
  `,
  styles: `
    .mp-viewer {
      display: block;
      width: 100%;
      max-width: 100%;
      height: 780px;
      border: 1px solid #58766b;
      border-radius: 6px;
      background: #f7f6ef;
    }
    @media (max-width: 760px) {
      .mp-viewer {
        height: 1080px;
      }
    }
  `,
})
export class Campus3d {
  private readonly store = inject(MasterplanStore);
  private readonly frame = viewChild.required<ElementRef<HTMLIFrameElement>>('frame');
  private readonly sanitizer = inject(DomSanitizer);
  private readonly viewerUrl =
    this.sanitizer.bypassSecurityTrustResourceUrl('embeds/campus-3d.html');
  protected readonly src = signal<SafeResourceUrl>(
    this.sanitizer.bypassSecurityTrustResourceUrl('about:blank'),
  );
  private pendingFocus: string | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const io = new IntersectionObserver(
        (es) => {
          if (es.some((e) => e.isIntersecting)) this.load();
        },
        { rootMargin: '400px' },
      );
      io.observe(this.frame().nativeElement);
      destroyRef.onDestroy(() => io.disconnect());
    });

    effect(() => {
      const request = this.store.focus3dRequest();
      if (!request) return;
      untracked(() => {
        this.load();
        this.pendingFocus = request.buildingId;
        this.sendFocus();
      });
    });
  }

  private load(): void {
    this.src.set(this.viewerUrl);
  }

  protected onFrameLoad(): void {
    this.sendFocus();
  }

  private sendFocus(): void {
    if (!this.pendingFocus) return;
    try {
      this.frame().nativeElement.contentWindow?.postMessage(
        { type: 'groundtruth-masterplan-focus', buildingID: this.pendingFocus },
        location.origin,
      );
    } catch {
      // The viewer may still be loading; onFrameLoad resends.
    }
  }

  protected onMessage(e: MessageEvent): void {
    if (
      e.origin !== location.origin ||
      e.source !== this.frame().nativeElement.contentWindow ||
      e.data?.type !== 'groundtruth-masterplan-select'
    )
      return;
    this.store.selectFromViewer(e.data.buildingID);
  }
}
