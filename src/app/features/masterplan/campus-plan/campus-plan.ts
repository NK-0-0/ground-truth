import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { PlanKey } from '../../../core/models/campus-masterplan.models';
import { ZaNumberPipe } from '../../../shared/format';
import { ReferenceNote } from '../../../shared/reference-note';
import { TrackSectionDirective } from '../../../shared/section-tracking.directive';
import { type LayerKey, MasterplanStore, PLAN_OPTIONS } from '../masterplan.store';
import { MasterplanMap } from './masterplan-map';

const LAYER_TOGGLES: { key: LayerKey; label: string }[] = [
  { key: 'context', label: 'Retained buildings' },
  { key: 'paths', label: 'Walking routes' },
  { key: 'integration', label: 'Integrated design details' },
  { key: 'privacy', label: 'Public-private intent' },
  { key: 'parcels', label: 'Coordination parcels' },
  { key: 'attention', label: 'Source issues' },
  { key: 'road', label: 'Road interfaces' },
];

const LEGEND: [colour: string, label: string][] = [
  ['#dfd3b1', 'Academic'],
  ['#becdac', 'Academic support'],
  ['#c5ccd8', 'Administration / mixed'],
  ['#dfbfae', 'Residences'],
  ['#e8c979', 'Student shared'],
  ['#c6b5d4', 'Multi-purpose'],
  ['#d7d8cb', 'Retained source building'],
  ['#d9c39a', 'Walking / court paving'],
  ['#bece9c', 'Planting'],
  ['#b98165', 'Incomplete boundary'],
  ['#bd6a4f', 'Investigation marker'],
];

/** "Inspect the campus masterplan": map, layer switches and building inspector. */
@Component({
  selector: 'app-campus-plan',
  imports: [MasterplanMap, ReferenceNote, ZaNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './campus-plan.html',
  styleUrl: './campus-plan.css',
  host: { class: 'mp-block', id: 'mp-plan' },
  hostDirectives: [TrackSectionDirective],
})
export class CampusPlan {
  protected readonly store = inject(MasterplanStore);
  protected readonly planOptions = PLAN_OPTIONS;
  protected readonly layerToggles = LAYER_TOGGLES;
  protected readonly legend = LEGEND;

  protected choosePlan(key: string): void {
    this.store.choosePlan(key as PlanKey);
  }

  protected toggleLayer(key: LayerKey, e: Event): void {
    this.store.setLayer(key, (e.target as HTMLInputElement).checked);
  }
}
