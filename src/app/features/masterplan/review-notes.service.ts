import { Injectable, signal } from '@angular/core';

export const CASE_STATUSES = [
  'Open',
  'In progress',
  'Awaiting evidence',
  'Ready for review',
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export interface CaseNote {
  office: string;
  owner: string;
  due: string;
  status: CaseStatus;
  evidence: string;
  saved: string;
}

const STORAGE_KEY = 'groundtruth-r8-public-actions-v1';

/** Investigation notes, saved in this browser only. */
@Injectable({ providedIn: 'root' })
export class ReviewNotesService {
  readonly notes = signal<Record<string, CaseNote>>(load());

  /** Returns false when browser storage is unavailable (the note is kept for this session). */
  save(caseId: string, note: CaseNote): boolean {
    this.notes.update((n) => ({ ...n, [caseId]: note }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notes()));
      return true;
    } catch {
      return false;
    }
  }
}

function load(): Record<string, CaseNote> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
