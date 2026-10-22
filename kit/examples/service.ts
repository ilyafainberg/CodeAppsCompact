import type { IOperationResult } from '@microsoft/power-apps/data';

export type RequestDraft = {
  summary: string;
  ownerEmail: string;
  priority: string;
  hours: number;
};
export type RequestRecord = RequestDraft & { id: string };
export type ListOptions = { skipToken?: string };

export const initialRows: RequestRecord[] = [
  { id: 'r1', summary: 'Replace monitor', ownerEmail: 'alex@example.test', priority: 'Normal', hours: 2 },
  { id: 'r2', summary: 'Network access', ownerEmail: 'sam@example.test', priority: 'Urgent', hours: 3 },
];
let rows = initialRows.map(row => ({ ...row }));
let nextId = 3;

export const RequestsService = {
  async getAll(options?: ListOptions): Promise<IOperationResult<RequestRecord[]>> {
    if (options?.skipToken) return { success: false, data: [], error: new Error('Unknown demo page') };
    return { success: true, data: rows.map(row => ({ ...row })) };
  },
  async create(draft: RequestDraft): Promise<IOperationResult<RequestRecord>> {
    const row = { ...draft, id: `r${nextId++}` };
    rows = [...rows, row];
    return { success: true, data: row };
  },
  async update(id: string, draft: RequestDraft): Promise<IOperationResult<RequestRecord>> {
    const row = { ...draft, id };
    if (!rows.some(item => item.id === id)) return { success: false, data: row, error: new Error('Record not found') };
    rows = rows.map(item => item.id === id ? row : item);
    return { success: true, data: row };
  },
};
