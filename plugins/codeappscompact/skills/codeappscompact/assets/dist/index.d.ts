import * as React from 'react';
import type { IOperationResult } from '@microsoft/power-apps/data';
export type Field<D> = {
    name: Extract<keyof D, string>;
    label: string;
    kind: 'text' | 'email' | 'number' | 'select';
    required?: boolean;
    maxLength?: number;
    min?: number;
    max?: number;
    options?: readonly string[];
};
export type Column<R> = {
    header: string;
    render: (row: R) => React.ReactNode;
};
export type DataService<R, D> = {
    getAll(options?: {
        skipToken?: string;
    }): Promise<IOperationResult<R[]>>;
    create(draft: D): Promise<IOperationResult<R>>;
    update(id: string, draft: D): Promise<IOperationResult<R>>;
};
export type RecordScreenProps<R, D extends Record<string, string | number>> = {
    title: string;
    queryKey: readonly unknown[];
    service: DataService<R, D>;
    fields: readonly Field<D>[];
    columns: readonly Column<R>[];
    defaults: D;
    getId: (row: R) => string;
    toDraft: (row: R) => D;
    searchText: (row: R) => string;
};
export declare function RecordScreen<R, D extends Record<string, string | number>>(props: RecordScreenProps<R, D>): React.ReactElement;
