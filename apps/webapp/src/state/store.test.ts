import { beforeEach, describe, expect, it, vi } from 'vitest';
import { photosActions, usePhotos } from './store';

const png = new File([new Uint8Array([137,80,78,71,1])], 'a.png', { type: 'image/png' });

beforeEach(() => {
  // reset state
  photosActions.clear();
  // mock URL methods
  (globalThis.URL as any).createObjectURL = vi.fn(() => 'blob:' + Math.random());
  (globalThis.URL as any).revokeObjectURL = vi.fn();
});

describe('photosActions', () => {
  it('addFiles adds photos preserving order', () => {
    const files = [
      new File(['1'], '1.png', { type: 'image/png' }),
      new File(['2'], '2.png', { type: 'image/png' }),
    ];
    photosActions.addFiles(files);
    const { items } = usePhotos.getState();
    expect(items).toHaveLength(2);
    expect(items[0].fileName).toBe('1.png');
    expect(items[1].fileName).toBe('2.png');
  });

  it('move swaps items correctly and ignores edges', () => {
    const files = [
      new File(['1'], '1.png', { type: 'image/png' }),
      new File(['2'], '2.png', { type: 'image/png' }),
      new File(['3'], '3.png', { type: 'image/png' }),
    ];
    photosActions.addFiles(files);
    const firstId = usePhotos.getState().items[0].id;
    photosActions.move(firstId, 'left'); // ignore edge
    expect(usePhotos.getState().items[0].id).toBe(firstId);
    photosActions.move(firstId, 'right');
    expect(usePhotos.getState().items[1].id).toBe(firstId);
  });

  it('remove deletes photo and revokes url', () => {
    photosActions.addFiles([png]);
    const id = usePhotos.getState().items[0].id;
    photosActions.remove(id);
    expect(usePhotos.getState().items).toHaveLength(0);
    expect((URL.revokeObjectURL as any)).toHaveBeenCalled();
  });
});

