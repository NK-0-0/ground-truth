import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import { CampusDataService } from '../core/campus-data.service';

/**
 * Banner at the top of each masterplan block: the boundary-status pill
 * (optional) and the reference / assumptions note.
 */
@Component({
  selector: 'app-reference-note',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (boundaryPill() && openEnds() !== null) {
      <p class="hg-pill fail">
        Boundary check: BLOCKED — {{ openEnds() }} open ends · DERIVED — NOT CADASTRAL
      </p>
    }
    <p class="hg-reference-note">
      REFERENCE / ASSUMPTIONS — not independently released by SlabCheck-1.0.0. Original source
      methods remain documented below. Inherited CRS ESRI:102488; original source dates may be
      unverified. Checked source-population areas are in the live geometry ledger above.
    </p>
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
})
export class ReferenceNote {
  readonly boundaryPill = input(false, { transform: booleanAttribute });
  private readonly data = inject(CampusDataService);
  protected readonly openEnds = computed(() => this.data.boundary()?.check.gaps.length ?? null);
}
