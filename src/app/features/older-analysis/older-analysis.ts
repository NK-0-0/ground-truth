import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { ReferenceNote } from '../../shared/reference-note';
import { TrackSectionDirective } from '../../shared/section-tracking.directive';
import { SectionNavService } from '../../core/section-nav.service';
import { EMBED_STYLES } from './embed-styles';

const TOPICS: [id: string, label: string][] = [
  ['firstGlance', 'Overview'],
  ['sec-infrastructure', 'Utilities'],
  ['sec-pedestrian', 'Walking & lighting'],
  ['sec-suitability', 'Site suitability'],
  ['toc-housing-shortfall-current-vs-2030-projec', 'Housing'],
  ['simPanel', 'Housing scenarios'],
  ['sec-provenance', 'Source records'],
];

interface Heading {
  id: string;
  label: string;
}

/**
 * "Older analysis": the restored earlier dashboard, a self-contained page shown in
 * a bounded, same-origin iframe. It loads when the section approaches the viewport.
 */
@Component({
  selector: 'app-older-analysis',
  imports: [ReferenceNote],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './older-analysis.html',
  styleUrl: './older-analysis.css',
  host: { class: 'mp-block history-section', id: 'older-analysis' },
  hostDirectives: [TrackSectionDirective],
})
export class OlderAnalysis {
  private readonly nav = inject(SectionNavService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly frame = viewChild.required<ElementRef<HTMLIFrameElement>>('frame');

  protected readonly topics = TOPICS;
  private readonly sanitizer = inject(DomSanitizer);
  private readonly analysisUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    'embeds/older-analysis.html',
  );
  protected readonly src = signal<SafeResourceUrl>(
    this.sanitizer.bypassSecurityTrustResourceUrl('about:blank'),
  );
  protected readonly status = signal(
    'Older analysis opens automatically as you reach this section.',
  );
  protected readonly failed = signal(false);
  protected readonly results = signal<Heading[] | null>(null);

  private state: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
  private loaded: Promise<boolean> | null = null;
  private resolveLoad: ((ok: boolean) => void) | null = null;
  private headings: Heading[] = [];
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const io = new IntersectionObserver(
        (es) => {
          if (es.some((e) => e.isIntersecting)) {
            this.load();
            io.disconnect();
          }
        },
        { rootMargin: '250px' },
      );
      io.observe(this.host);
      destroyRef.onDestroy(() => io.disconnect());
    });
    destroyRef.onDestroy(() => clearTimeout(this.searchTimer));
  }

  private get doc(): Document | null {
    return this.frame().nativeElement.contentDocument;
  }

  /** Starts loading once; resolves true when the analysis is ready. */
  private load(): Promise<boolean> {
    if (!this.loaded) {
      this.state = 'loading';
      this.status.set('Opening the embedded older maps and analysis…');
      this.loaded = new Promise((resolve) => (this.resolveLoad = resolve));
      this.src.set(this.analysisUrl);
    }
    return this.loaded;
  }

  protected onFrameLoad(): void {
    const doc = this.doc;
    // Ignore the initial about:blank load.
    if (this.state !== 'loading' || doc?.URL === 'about:blank') return;
    if (!doc?.body) {
      this.fail('The older analysis did not open. Reload the page to retry.');
      return;
    }
    try {
      this.headings = [...doc.querySelectorAll('h1,h2,h3,h4')]
        .filter((h) => (h.textContent ?? '').trim().length > 2)
        .map((h, i) => {
          if (!h.id) h.id = 'history-heading-' + i;
          return { id: h.id, label: (h.textContent ?? '').trim() };
        });
      this.prepareDocument(doc);
      this.state = 'ready';
      this.status.set(
        'Older analysis ready. Scroll inside the bordered analysis area, or choose a topic above.',
      );
      this.resolveLoad?.(true);
    } catch (e) {
      this.fail('Could not open older analysis. ' + (e as Error).message);
    }
  }

  /** Flattens the embedded dashboard into a single scrolling document and keeps in-page links inside the frame. */
  private prepareDocument(doc: Document): void {
    doc.body.classList.remove('gt-review');
    doc.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach((d) => {
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
    });
    doc.getElementById('history-bounded-style')?.remove();
    const style = doc.createElement('style');
    style.id = 'history-bounded-style';
    style.textContent = EMBED_STYLES;
    doc.head.append(style);
    doc.querySelectorAll('.reveal').forEach((e) => e.classList.add('in-view'));
    doc.addEventListener('click', (e) => {
      const a = (e.target as Element | null)?.closest('a[href^="#"]');
      if (!a) return;
      let id: string;
      try {
        id = decodeURIComponent(a.getAttribute('href')!.slice(1));
      } catch {
        return;
      }
      if (doc.getElementById(id)) {
        e.preventDefault();
        this.scrollFrameTo(id);
      }
    });
    doc.defaultView?.scrollTo(0, 0);
    doc.defaultView?.dispatchEvent(new Event('resize'));
  }

  private fail(message: string): void {
    this.state = 'error';
    this.failed.set(true);
    this.status.set(message);
    this.resolveLoad?.(false);
  }

  private scrollFrameTo(id: string): Element | null {
    const doc = this.doc,
      el = doc?.getElementById(id);
    if (!doc?.defaultView || !el) return null;
    const top = doc.defaultView.scrollY + el.getBoundingClientRect().top;
    doc.defaultView.scrollTo({ top: Math.max(0, top - 12), behavior: 'instant' });
    return el;
  }

  protected async go(id: string): Promise<void> {
    if (!(await this.load())) return;
    const el = this.scrollFrameTo(id);
    if (!el) {
      this.status.set('This topic has no matching anchor in the older source. Use Find a heading.');
      return;
    }
    this.status.set(
      'Viewing: ' +
        (el.querySelector('h1,h2,h3,h4')?.textContent || el.textContent || '').trim().slice(0, 100),
    );
  }

  protected search(value: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(async () => {
      if (!(await this.load())) return;
      const q = value.trim().toLowerCase();
      this.results.set(
        q.length < 2
          ? null
          : this.headings.filter((h) => h.label.toLowerCase().includes(q)).slice(0, 15),
      );
    }, 200);
  }

  protected backToTop(): void {
    this.doc?.defaultView?.scrollTo({ top: 0, behavior: 'instant' });
    this.nav.scrollTo('older-analysis');
  }
}
