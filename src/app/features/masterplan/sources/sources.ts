import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReferenceNote } from '../../../shared/reference-note';
import { TrackSectionDirective } from '../../../shared/section-tracking.directive';

/** "Sources and limits of the final product". */
@Component({
  selector: 'app-sources',
  imports: [ReferenceNote],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mp-block', id: 'mp-evidence' },
  hostDirectives: [TrackSectionDirective],
  template: `
    <app-reference-note />
    <h3>Sources and limits of the final product</h3>
    <div class="mp-method-grid">
      <div>
        <h4>Original design</h4>
        <p>
          UNIVEN SDF 2022: campus diagnosis pp.12/31, public-private hierarchy pp.47–49, programme
          p.63 and precinct designs pp.68–69. Source dates and implementation status remain
          historic.
        </p>
      </div>
      <div>
        <h4>Geometry</h4>
        <p>
          Supplied CAD/GIS in local metres. Original IDs and courtyard openings are retained. A 3 cm
          numerical join tolerance is not ground accuracy. Source control and the incomplete legal
          boundary remain unresolved.
        </p>
      </div>
      <div>
        <h4>Separate populations</h4>
        <p>
          82 SDF requirements; 57 placed physical blocks in R8; 109 canonical GIS proposals in the
          analysis below; 908 GPR observations. These are different populations and are not
          interchangeable totals.
        </p>
      </div>
      <div>
        <h4>Utility screening</h4>
        <p>
          Seven supplied envelopes support overlap investigation. Zero mapped building overlap does
          not establish safe excavation, full survey coverage or network capacity.
        </p>
      </div>
      <div>
        <h4>Source walkway coverage</h4>
        <p>
          219 records: 74 scored/assessment-matched, including five No-lighting/Fair-condition
          records; 145 remain risk-unassessed. A cluster label is not observed crime or a calibrated
          risk probability.
        </p>
      </div>
      <div>
        <h4>What still needs proof</h4>
        <p>
          Functional capacity, shade, lighting, actual travel, access gradients, traffic, drainage,
          cost, approvals and measured construction feasibility. Model detail does not itself
          validate these outcomes.
        </p>
      </div>
    </div>
    <p class="mp-caption">
      Integrated review authored 27 October 2026 · source snapshots remain identified by their own
      dates · Ntsako Harold Ramaru / GroundTruth.
    </p>
  `,
  styles: `
    .mp-method-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      align-items: stretch;
    }
    .mp-method-grid > div {
      border-left: 2px solid #5a8f84;
      padding: 8px 14px;
      background: #0b2632;
    }
    .mp-method-grid h4 {
      font-size: 13px;
      margin: 0 0 8px;
    }
    .mp-method-grid p {
      font-size: 11px;
      color: #adc5ce;
      line-height: 1.75;
    }
    @media (max-width: 760px) {
      .mp-method-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
    @media (max-width: 460px) {
      .mp-method-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class Sources {}
