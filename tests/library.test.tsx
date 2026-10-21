import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { RecordScreen, type DataService, type RecordScreenProps } from '../src/index';

type Draft = { caption: string; cost: number };
type Row = Draft & { key: string };
function config(): RecordScreenProps<Row, Draft> {
  const service: DataService<Row, Draft> = {
    getAll: vi.fn(async () => ({ success: true, data: [{ key: 'k1', caption: 'Chair', cost: 10 }] })),
    create: vi.fn(async data => ({ success: true, data: { ...data, key: 'k2' } })),
    update: vi.fn(async (key, data) => ({ success: true, data: { ...data, key } })),
  };
  return { title: 'Inventory', queryKey: ['inventory'], service, defaults: { caption: '', cost: 1 },
    fields: [{ name: 'caption', label: 'Caption', kind: 'text', required: true }, { name: 'cost', label: 'Cost', kind: 'number', required: true, min: 0 }],
    columns: [{ header: 'Caption', render: row => row.caption }], getId: row => row.key,
    toDraft: row => ({ caption: row.caption, cost: row.cost }), searchText: row => row.caption };
}
function wrap(props: RecordScreenProps<Row, Draft>) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><RecordScreen {...props} /></QueryClientProvider>;
}
describe('generic library, independent inventory schema', () => {
  it('works with different field names and a non-id key', async () => {
    const props = config(); render(wrap(props)); expect(await screen.findByText('Chair')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Caption'), { target: { value: ' Desk ' } });
    fireEvent.change(screen.getByLabelText('Cost'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(props.service.create).toHaveBeenCalledWith({ caption: 'Desk', cost: 0 }));
  });
  it('rejects duplicate field configuration explicitly', () => {
    const props = config(); props.fields = [props.fields[0], props.fields[0]];
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try { expect(() => render(wrap(props))).toThrow(); } finally { log.mockRestore(); }
  });
  it('rejects a select without options explicitly', () => {
    const props = config(); props.fields = [{ name: 'caption', label: 'Caption', kind: 'select' }];
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try { expect(() => render(wrap(props))).toThrow(); } finally { log.mockRestore(); }
  });
});
