import { describe, expect, it } from 'vitest';
import { cn, generateId } from '../../utils/cn';

describe('cn', () => {
  it('merges and resolves class names', () => {
    const conditionalClass: string | undefined = undefined;
    expect(cn('p-2', 'text-sm', 'p-4')).toBe('text-sm p-4');
    expect(cn('bg-red-500', conditionalClass, 'bg-blue-500')).toBe('bg-blue-500');
  });
});

describe('generateId', () => {
  it('returns a 7 character base36 id', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-z0-9]{7}$/);
  });
});
