import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  effect,
  inject,
} from '@angular/core';
import { CampusDataService } from './core/campus-data.service';
import { NAV_SECTIONS, SectionNavService } from './core/section-nav.service';
import { Masterplan } from './features/masterplan/masterplan';
import { VerifiedGeometry } from './features/verified-geometry/verified-geometry';

@Component({
  selector: 'app-root',
  imports: [VerifiedGeometry, Masterplan],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly nav = inject(SectionNavService);
  protected readonly sections = NAV_SECTIONS;

  constructor() {
    const injector = inject(Injector);
    const masterplan = inject(CampusDataService).masterplan;
    // Once the review has rendered, open at the linked section, otherwise at the masterplan.
    let opened = false;
    effect(() => {
      if (opened || !masterplan.value()) return;
      opened = true;
      afterNextRender(
        () => {
          const target = decodeURIComponent(location.hash.slice(1));
          this.nav.scrollTo(target && document.getElementById(target) ? target : 'mp-root');
        },
        { injector },
      );
    });
  }
}
