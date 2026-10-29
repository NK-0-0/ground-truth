import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReferenceNote } from '../../../shared/reference-note';

const STAGES: [title: string, text: string][] = [
  [
    'D0 · Confirm the evidence',
    'Agree current demand, source identities, official boundary, survey control and utility records. Resolve the programme discrepancy.',
  ],
  [
    'D1 · Test a real public space',
    'Take a commons, entrance or route segment through user engagement, survey, access, landscape, drainage and costing.',
  ],
  [
    'D2 · Develop infill buildings',
    'Confirm room/bed/laboratory needs, floor plans, servicing, fire/access, transport, costs and approvals.',
  ],
  [
    'D3 · Resolve replacement',
    'Only proceed with replacement-dependent work after condition, heritage, decanting and approval decisions. Reserve envelopes are not extra capacity.',
  ],
];

/** "Move from a campus concept to a project decision". */
@Component({
  selector: 'app-delivery',
  imports: [ReferenceNote],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mp-block', id: 'mp-delivery' },
  template: `
    <app-reference-note />
    <h3>Move from a campus concept to a project decision</h3>
    <div class="mp-delivery">
      @for (s of stages; track s[0]) {
        <article>
          <h4>{{ s[0] }}</h4>
          <p>{{ s[1] }}</p>
        </article>
      }
    </div>
    <p class="mp-caption">
      This edition includes the masterplan, design comparisons, analysis, 3D inspection and
      browser-local investigation notes.
    </p>
    <p class="mp-caption">
      Static hosting edition: investigation notes are saved in this browser. Shared project
      accounts, evidence uploads and cloud review records require a separate backend.
    </p>
  `,
  styles: `
    .mp-delivery {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }
    .mp-delivery article {
      padding: 14px;
      border: 1px solid #40616b;
      border-radius: 5px;
      background: #0b2632;
    }
    .mp-delivery h4 {
      font-size: 13px;
      color: #acd7c9;
    }
    .mp-delivery p {
      font-size: 11px;
      line-height: 1.7;
      color: #adc5ce;
    }
    @media (max-width: 1150px) {
      .mp-delivery {
        grid-template-columns: 1fr 1fr;
      }
    }
    @media (max-width: 460px) {
      .mp-delivery {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class Delivery {
  protected readonly stages = STAGES;
}
