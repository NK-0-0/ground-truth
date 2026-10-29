import { Pipe, PipeTransform } from '@angular/core';

const formatters = new Map<string, Intl.NumberFormat>();

/**
 * South African number formatting. `digits` is the maximum fraction digits;
 * `minDigits` defaults to the same value (fixed precision).
 */
export function formatZa(value: number, digits = 0, minDigits = digits): string {
  const key = digits + ':' + minDigits;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat('en-ZA', {
      maximumFractionDigits: digits,
      minimumFractionDigits: minDigits,
    });
    formatters.set(key, f);
  }
  return f.format(value);
}

/** `{{ value | za }}`, `{{ value | za: 2 }}`, `{{ value | za: 1 : 0 }}` */
@Pipe({ name: 'za' })
export class ZaNumberPipe implements PipeTransform {
  transform(value: number, digits = 0, minDigits = digits): string {
    return formatZa(value, digits, minDigits);
  }
}
