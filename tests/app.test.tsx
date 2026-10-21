import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { IOperationResult } from '@microsoft/power-apps/data';
import App from '../examples/App';
import { initialRows, RequestsService, type RequestDraft, type RequestRecord } from '../examples/service';

const draft: RequestDraft = { summary: 'New keyboard', ownerEmail: 'lee@example.test', priority: 'Urgent', hours: 4 };
let rows: RequestRecord[];
let list: MockInstance<typeof RequestsService.getAll>;
let create: MockInstance<typeof RequestsService.create>;
let update: MockInstance<typeof RequestsService.update>;
let user: ReturnType<typeof userEvent.setup>;
const clients: QueryClient[] = [];
const ok = <T,>(data: T, skipToken?: string): IOperationResult<T> => ({ success: true, data, skipToken });
function pending<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 }, mutations: { retry: false } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}><App /></QueryClientProvider>);
}
async function ready() { mount(); await screen.findByText('Replace monitor'); }
function fill(values: Partial<RequestDraft> = {}) {
  const data = { ...draft, ...values };
  fireEvent.change(screen.getByLabelText('Summary'), { target: { value: data.summary } });
  fireEvent.change(screen.getByLabelText('Owner email'), { target: { value: data.ownerEmail } });
  fireEvent.change(screen.getByLabelText('Priority'), { target: { value: data.priority } });
  fireEvent.change(screen.getByLabelText('Hours'), { target: { value: String(data.hours) } });
}
async function save() { await user.click(screen.getByRole('button', { name: 'Save' })); }
async function editFirst() {
  const row = screen.getByText('Replace monitor').closest('tr');
  expect(row).not.toBeNull();
  await user.click(within(row!).getByRole('button', { name: 'Edit' }));
}
async function saved() { await waitFor(() => expect(screen.getAllByRole('status').some(node => /saved/i.test(node.textContent ?? ''))).toBe(true)); }

beforeEach(() => {
  vi.restoreAllMocks();
  rows = initialRows.map(row => ({ ...row }));
  user = userEvent.setup();
  list = vi.spyOn(RequestsService, 'getAll').mockImplementation(async () => ok(rows.map(row => ({ ...row }))));
  create = vi.spyOn(RequestsService, 'create').mockImplementation(async data => {
    const item = { ...data, id: 'r3' }; rows.push(item); return ok(item);
  });
  update = vi.spyOn(RequestsService, 'update').mockImplementation(async (id, data) => {
    const item = { ...data, id }; rows = rows.map(row => row.id === id ? item : row); return ok(item);
  });
});
afterEach(() => { for (const client of clients.splice(0)) client.clear(); });

describe('identical record-management contract', () => {
  it('shows loading while first read is pending', () => {
    list.mockImplementation(() => new Promise(() => {})); mount();
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    expect(create).not.toHaveBeenCalled();
  });
  it('renders the heading, table columns, and service data', async () => {
    await ready(); expect(screen.getByRole('heading', { name: 'Service requests' })).toBeVisible();
    for (const name of ['Summary', 'Owner email', 'Priority', 'Hours', 'Actions']) expect(screen.getByRole('columnheader', { name })).toBeVisible();
    expect(screen.getByText('sam@example.test')).toBeVisible(); expect(list).toHaveBeenCalledTimes(1);
  });
  it('shows empty state only for a successful empty list', async () => {
    list.mockResolvedValue(ok([])); mount(); expect(await screen.findByText('No records')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('surfaces unsuccessful SDK results and retries an initial read explicitly', async () => {
    list.mockResolvedValueOnce({ success: false, data: [], error: new Error('Access denied') }); mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');
    expect(screen.queryByText('No records')).not.toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Replace monitor')).toBeVisible(); expect(list).toHaveBeenCalledTimes(2);
  });
  it('surfaces rejected reads', async () => {
    list.mockRejectedValue(new Error('Offline')); mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Offline'); expect(list).toHaveBeenCalledTimes(1);
  });
  it('shows a diagnostic when a failed SDK result omits error details', async () => {
    list.mockResolvedValue({ success: false, data: [] }); mount();
    expect(await screen.findByRole('alert')).not.toBeEmptyDOMElement(); expect(screen.queryByText('No records')).not.toBeInTheDocument();
  });
  it('rejects malformed successful list payloads rather than silently showing empty data', async () => {
    list.mockResolvedValue({ success: true, data: undefined as never }); mount();
    expect(await screen.findByRole('alert')).not.toBeEmptyDOMElement(); expect(screen.queryByText('No records')).not.toBeInTheDocument();
  });
  it('searches loaded records case-insensitively without a connector call', async () => {
    await ready(); fireEvent.change(screen.getByLabelText('Search loaded records'), { target: { value: 'SAM@EXAMPLE' } });
    await waitFor(() => expect(screen.queryByText('Replace monitor')).not.toBeInTheDocument());
    expect(screen.getByText('Network access')).toBeVisible(); expect(list).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText('Search loaded records'), { target: { value: '' } });
    expect(await screen.findByText('Replace monitor')).toBeVisible();
  });
  it('passes the server cursor and appends deduplicated pages', async () => {
    const third = { ...draft, id: 'r3' };
    list.mockResolvedValueOnce(ok([rows[0]], 'page-2')).mockResolvedValueOnce(ok([rows[0], rows[1], third]));
    await ready(); await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByText('New keyboard')).toBeVisible();
    expect(list.mock.calls[1][0]?.skipToken).toBe('page-2'); expect(screen.getAllByText('Replace monitor')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });
  it('retains rows after paging failure and retries the same cursor on demand', async () => {
    list.mockResolvedValueOnce(ok([rows[0]], 'page-2')).mockRejectedValueOnce(new Error('Page unavailable')).mockResolvedValueOnce(ok([rows[1]]));
    await ready(); await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Page unavailable'); expect(screen.getByText('Replace monitor')).toBeVisible();
    expect(list).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByText('Network access')).toBeVisible(); expect(list.mock.calls[2][0]?.skipToken).toBe('page-2');
  });
  it('disables paging while its request is pending', async () => {
    const next = pending<IOperationResult<RequestRecord[]>>(); list.mockResolvedValueOnce(ok([rows[0]], 'page-2')).mockImplementationOnce(() => next.promise);
    await ready(); const button = screen.getByRole('button', { name: 'Load more' }); await user.click(button); await user.click(button);
    expect(button).toBeDisabled(); expect(list).toHaveBeenCalledTimes(2);
    await act(async () => next.resolve(ok([rows[1]])));
  });
  it('provides accessible controls and initial defaults', async () => {
    await ready(); expect(screen.getByLabelText('Summary')).toHaveValue(''); expect(screen.getByLabelText('Owner email')).toHaveValue('');
    expect(screen.getByLabelText('Priority')).toHaveValue('Normal'); expect(screen.getByLabelText('Hours')).toHaveValue(1);
    expect(screen.getByRole('button', { name: 'Save' }).closest('form')).toHaveAttribute('novalidate');
  });
  it.each(['', '   '])('rejects a blank or whitespace summary (%j)', async summary => {
    await ready(); fill({ summary }); await save(); expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0);
    expect(create).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled();
  });
  it('rejects a summary exceeding 80 trimmed characters', async () => {
    await ready(); fill({ summary: 'x'.repeat(81) }); await save(); await screen.findAllByRole('alert'); expect(create).not.toHaveBeenCalled();
  });
  it.each(['', 'bad@address', 'a b@example.test'])('rejects invalid owner email (%j)', async ownerEmail => {
    await ready(); fill({ ownerEmail }); await save(); await screen.findAllByRole('alert'); expect(create).not.toHaveBeenCalled();
  });
  it.each(['', '-1', '101', 'Infinity'])('rejects missing/nonfinite/out-of-range hours (%j)', async value => {
    await ready(); fill(); fireEvent.change(screen.getByLabelText('Hours'), { target: { value } });
    await save(); await screen.findAllByRole('alert'); expect(create).not.toHaveBeenCalled();
  });
  it('accepts zero and trims strings in an exact create payload', async () => {
    await ready(); fill({ summary: '  New keyboard  ', ownerEmail: '  lee@example.test  ', hours: 0 }); await save(); await saved();
    expect(create).toHaveBeenCalledTimes(1); expect(create).toHaveBeenCalledWith({ ...draft, hours: 0 });
    expect(update).not.toHaveBeenCalled(); expect(list.mock.calls.length).toBeGreaterThan(1);
    expect(screen.getByLabelText('Summary')).toHaveValue(''); expect(screen.getByLabelText('Priority')).toHaveValue('Normal'); expect(screen.getByLabelText('Hours')).toHaveValue(1);
  });
  it('accepts the inclusive upper bound and trims before checking text length', async () => {
    await ready(); fill({ summary: ` ${'x'.repeat(80)} `, hours: 100 }); await save(); await saved();
    expect(create).toHaveBeenCalledWith({ ...draft, summary: 'x'.repeat(80), hours: 100 });
  });
  it('loads an edit and updates the original ID without putting it in the draft', async () => {
    await ready(); await editFirst(); expect(screen.getByLabelText('Summary')).toHaveValue('Replace monitor'); expect(screen.getByLabelText('Hours')).toHaveValue(2);
    fill(); await save(); await saved(); expect(update).toHaveBeenCalledTimes(1); expect(update).toHaveBeenCalledWith('r1', draft); expect(create).not.toHaveBeenCalled();
    expect(await screen.findByText('New keyboard')).toBeVisible();
  });
  it('cancel resets to create defaults without writing', async () => {
    await ready(); await editFirst(); fill(); await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByLabelText('Summary')).toHaveValue(''); expect(screen.getByLabelText('Hours')).toHaveValue(1);
    expect(create).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled();
  });
  it('locks editing and prevents duplicate submissions while a write is pending', async () => {
    const write = pending<IOperationResult<RequestRecord>>(); update.mockImplementationOnce(() => write.promise);
    await ready(); await editFirst(); fill(); await save(); await save();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    for (const label of ['Summary', 'Owner email', 'Priority', 'Hours']) expect(screen.getByLabelText(label)).toBeDisabled();
    for (const button of screen.getAllByRole('button', { name: 'Edit' })) expect(button).toBeDisabled();
    expect(update).toHaveBeenCalledTimes(1); await act(async () => write.resolve(ok({ ...draft, id: 'r1' }))); await saved();
  });
  it('keeps failed create values and permits one explicit retry, never an automatic one', async () => {
    create.mockResolvedValueOnce({ success: false, data: { ...draft, id: 'failed' }, error: new Error('Create forbidden') });
    await ready(); fill(); await save(); expect(await screen.findByRole('alert')).toHaveTextContent('Create forbidden');
    expect(create).toHaveBeenCalledTimes(1); expect(screen.getByLabelText('Summary')).toHaveValue(draft.summary);
    expect(screen.queryAllByRole('status').some(node => /saved/i.test(node.textContent ?? ''))).toBe(false);
    await save(); await saved(); expect(create).toHaveBeenCalledTimes(2);
  });
  it('keeps edit target and values after a rejected write', async () => {
    update.mockRejectedValueOnce(new Error('Update offline')); await ready(); await editFirst(); fill(); await save();
    expect(await screen.findByRole('alert')).toHaveTextContent('Update offline'); expect(update).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Summary')).toHaveValue(draft.summary); await save(); await saved();
    expect(update).toHaveBeenNthCalledWith(2, 'r1', draft); expect(create).not.toHaveBeenCalled();
  });
  it('preserves committed success when refresh fails and does not repeat the write', async () => {
    await ready(); list.mockRejectedValue(new Error('Refresh unavailable')); fill(); await save(); await saved();
    expect(await screen.findByRole('alert')).toHaveTextContent('Refresh unavailable'); expect(create).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Replace monitor')).toBeVisible(); expect(screen.getByLabelText('Summary')).toHaveValue('');
  });
  it('renders service text without interpreting HTML', async () => {
    const unsafe = '<img src=x onerror=alert(1)>'; list.mockResolvedValue(ok([{ ...rows[0], summary: unsafe }]));
    const { container } = mount(); expect(await screen.findByText(unsafe)).toBeVisible(); expect(container.querySelector('img')).toBeNull();
  });
});
