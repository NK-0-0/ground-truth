import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReferenceNote } from '../../../shared/reference-note';
import { SectionNavService } from '../../../core/section-nav.service';
import { MasterplanStore } from '../masterplan.store';

const PRINCIPLES: [title: string, text: string][] = [
  [
    'Campus structure',
    'Retain the recorded vehicle framework and arrange pedestrian connections around legible precincts.',
  ],
  [
    'Public to private',
    'Differentiate arrival, shared student space, academic functions and residential privacy.',
  ],
  [
    'Defined outdoor rooms',
    'Keep the academic commons and coordinated building edges, not isolated footprints alone.',
  ],
  [
    'Covered frontages',
    'Add ten weather-cover study zones near learning/shared frontages; structural and solar performance remain to be tested.',
  ],
  [
    'Residential life',
    'Add two residential–sport threshold studies and preserve courts intended for quieter everyday use.',
  ],
  [
    'Evidence-linked delivery',
    'Keep all requirements and constraints visible, with release gates instead of assumed approvals.',
  ],
];

/** "What we retained from the original campus vision". */
@Component({
  selector: 'app-original-vision',
  imports: [ReferenceNote],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './original-vision.html',
  styleUrl: './original-vision.css',
  host: { class: 'mp-block', id: 'mp-original' },
})
export class OriginalVision {
  private readonly store = inject(MasterplanStore);
  private readonly nav = inject(SectionNavService);
  protected readonly principles = PRINCIPLES;

  protected inspect(precinct: 'south' | 'res'): void {
    this.store.focusPrecinct(precinct);
    this.nav.scrollTo('mp-plan');
  }
}
