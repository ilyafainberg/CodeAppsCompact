import * as React from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
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
  getAll(options?: { skipToken?: string }): Promise<IOperationResult<R[]>>;
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

type Values = Record<string, string | number>;
type Page<R> = { rows: R[]; skipToken: string | undefined };
type Submission<D> = { id: string | null; draft: D };

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Operation failed without an error message.';
}

function requireSuccess<T>(result: IOperationResult<T>): void {
  if (!result.success) {
    throw new Error(errorMessage('error' in result ? result.error : undefined));
  }
}

async function readPage<R, D>(
  service: DataService<R, D>,
  skipToken: string | undefined,
): Promise<Page<R>> {
  const result = await service.getAll(
    skipToken === undefined ? undefined : { skipToken },
  );
  requireSuccess(result);
  if (!Array.isArray(result.data)) {
    throw new Error('getAll succeeded but data is not an array.');
  }
  const next = 'skipToken' in result ? result.skipToken : undefined;
  if (next != null && typeof next !== 'string') {
    throw new Error('getAll returned an invalid skipToken.');
  }
  return {
    rows: result.data,
    skipToken: typeof next === 'string' && next !== '' ? next : undefined,
  };
}

function assertFlat(value: unknown, label: string): asserts value is Values {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be a flat string/number object.`);
  }
  const entries: [string, unknown][] = Object.entries(value);
  if (Reflect.ownKeys(value).length !== entries.length) {
    throw new Error(`${label} must have only enumerable string keys.`);
  }
  for (const [name, item] of entries) {
    if (
      typeof item !== 'string' &&
      (typeof item !== 'number' || !Number.isFinite(item))
    ) {
      throw new Error(`${label}.${name} must be a string or finite number.`);
    }
  }
}

function selectOptions<D>(field: Field<D>): readonly string[] {
  const options = field.options;
  if (
    !Array.isArray(options) ||
    options.length === 0 ||
    options.some((option: unknown) => typeof option !== 'string')
  ) {
    throw new Error(`Select field "${field.name}" requires nonempty string options.`);
  }
  return options;
}

function checkConfiguration<D extends Values>(
  defaults: D,
  fields: readonly Field<D>[],
): void {
  assertFlat(defaults, 'defaults');
  const names = new Set<string>();
  for (const field of fields) {
    if (names.has(field.name)) {
      throw new Error(`Duplicate field name "${field.name}".`);
    }
    names.add(field.name);
    if (!hasOwn(defaults, field.name)) {
      throw new Error(`Missing default for field "${field.name}".`);
    }
    if (!['text', 'email', 'number', 'select'].includes(field.kind)) {
      throw new Error(`Unsupported kind for field "${field.name}".`);
    }
    const expectedType = field.kind === 'number' ? 'number' : 'string';
    if (typeof defaults[field.name] !== expectedType) {
      throw new Error(`Default for "${field.name}" must be a ${expectedType}.`);
    }
    if (
      field.maxLength !== undefined &&
      (!Number.isInteger(field.maxLength) || field.maxLength < 0)
    ) {
      throw new Error(`maxLength for "${field.name}" must be a nonnegative integer.`);
    }
    if (
      (field.min !== undefined && !Number.isFinite(field.min)) ||
      (field.max !== undefined && !Number.isFinite(field.max)) ||
      (field.min !== undefined &&
        field.max !== undefined &&
        field.min > field.max)
    ) {
      throw new Error(`Invalid numeric bounds for "${field.name}".`);
    }
    if (field.kind === 'select') selectOptions(field);
  }
}

function checkEditDraft<D extends Values>(draft: D, defaults: D): void {
  assertFlat(draft, 'toDraft result');
  if (
    Object.keys(draft).length !== Object.keys(defaults).length ||
    Object.keys(defaults).some(
      (name) =>
        !hasOwn(draft, name) ||
        typeof draft[name] !== typeof defaults[name],
    )
  ) {
    throw new Error('toDraft must return exactly the default keys and primitive types.');
  }
}

function normalize<D extends Values>(
  values: Values,
  defaults: D,
  fields: readonly Field<D>[],
): { draft: D; errors: Map<string, string> } {
  const names = Object.keys(defaults);
  if (
    names.length !== Object.keys(values).length ||
    names.some((name) => !hasOwn(values, name))
  ) {
    throw new Error('Form keys no longer match defaults; remount to change the schema.');
  }
  const draft = { ...defaults };
  const errors = new Map<string, string>();
  const byName = new Map<string, Field<D>>();
  for (const field of fields) byName.set(field.name, field);

  for (const key of names) {
    const name = key as Extract<keyof D, string>;
    const text = String(values[name]).trim();
    const value =
      typeof defaults[name] === 'number'
        ? text === '' ? Number.NaN : Number(text)
        : text;
    const field = byName.get(name);
    if (field) {
      let issue: string | undefined;
      if (field.required && text === '') {
        issue = 'is required.';
      } else if (typeof value === 'number' && !Number.isFinite(value)) {
        issue = 'must be a finite number.';
      } else if (field.maxLength !== undefined && text.length > field.maxLength) {
        issue = `must have at most ${field.maxLength} characters.`;
      } else if (
        typeof value === 'number' &&
        field.min !== undefined &&
        value < field.min
      ) {
        issue = `must be at least ${field.min}.`;
      } else if (
        typeof value === 'number' &&
        field.max !== undefined &&
        value > field.max
      ) {
        issue = `must be at most ${field.max}.`;
      } else if (
        field.kind === 'email' &&
        text !== '' &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
      ) {
        issue = 'must be a valid email address.';
      } else if (
        field.kind === 'select' &&
        !selectOptions(field).includes(text)
      ) {
        issue = 'must be one of the declared options.';
      }
      if (issue !== undefined) errors.set(name, `${field.label} ${issue}`);
    }
    if (typeof value !== typeof defaults[name]) {
      throw new Error(`Normalized type for "${name}" does not match its default.`);
    }
    // Only existing own keys are assigned, preserving their default primitive type.
    draft[name] = value as D[typeof name];
  }
  return { draft, errors };
}

export function RecordScreen<R, D extends Record<string, string | number>>(
  props: RecordScreenProps<R, D>,
): React.ReactElement {
  const {
    title, queryKey, service, fields, columns, defaults,
    getId, toDraft, searchText,
  } = props;
  checkConfiguration(defaults, fields);

  const uid = React.useId();
  const client = useQueryClient();
  const [values, setValues] = React.useState<Values>(() => ({ ...defaults }));
  const [editId, setEditId] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState(new Map<string, string>());
  const [formError, setFormError] = React.useState<string | null>(null);
  const [readError, setReadError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const writeLock = React.useRef(false);

  const query = useInfiniteQuery<
    Page<R>, unknown, InfiniteData<Page<R>>, readonly unknown[], string | undefined
  >({
    queryKey,
    initialPageParam: undefined,
    queryFn: ({ pageParam }) => readPage(service, pageParam),
    getNextPageParam: (page) => page.skipToken,
    retry: false,
    refetchOnWindowFocus: false,
    throwOnError: false,
  });

  React.useEffect(() => {
    setReadError(null);
  }, [query.dataUpdatedAt]);

  async function runRead(action: () => Promise<unknown>): Promise<void> {
    setReadError(null);
    try {
      await action();
    } catch (error: unknown) {
      setReadError(errorMessage(error));
    }
  }

  function replaceForm(draft: D, id: string | null): void {
    setValues({ ...draft });
    setEditId(id);
    setFieldErrors(new Map());
    setFormError(null);
  }

  const mutation = useMutation<void, unknown, Submission<D>>({
    mutationFn: async ({ id, draft }) => {
      const result = id === null
        ? await service.create(draft)
        : await service.update(id, draft);
      requireSuccess(result);
    },
    retry: false,
    throwOnError: false,
    onSuccess: () => {
      setSaved(true);
      replaceForm(defaults, null);
      // Refresh failures belong to the read path, not the committed write.
      void runRead(() =>
        client.invalidateQueries(
          { queryKey, exact: true },
          { throwOnError: true },
        ),
      );
    },
    onSettled: () => {
      writeLock.current = false;
    },
  });

  function edit(row: R, id: string): void {
    if (writeLock.current) return;
    try {
      const draft = toDraft(row);
      checkEditDraft(draft, defaults);
      replaceForm(draft, id);
      mutation.reset();
      setSaved(false);
    } catch (error: unknown) {
      setFormError(errorMessage(error));
    }
  }

  function cancel(): void {
    if (writeLock.current) return;
    replaceForm(defaults, null);
    mutation.reset();
    setSaved(false);
  }

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (writeLock.current) return;
    setSaved(false);
    setFormError(null);
    mutation.reset();
    try {
      const result = normalize(values, defaults, fields);
      setFieldErrors(result.errors);
      if (result.errors.size !== 0) return;
      writeLock.current = true;
      mutation.mutate({ id: editId, draft: result.draft });
    } catch (error: unknown) {
      writeLock.current = false;
      setFormError(errorMessage(error));
    }
  }

  const visible: { id: string; row: R }[] = [];
  const seen = new Set<string>();
  const term = search.toLowerCase();
  for (const page of query.data?.pages ?? []) {
    for (const row of page.rows) {
      const id = getId(row);
      if (seen.has(id)) continue;
      seen.add(id);
      if (searchText(row).toLowerCase().includes(term)) {
        visible.push({ id, row });
      }
    }
  }
  const readMessage = query.isError ? errorMessage(query.error) : readError;
  const writeMessage = formError ??
    (mutation.isError ? errorMessage(mutation.error) : null);

  return (
    <section aria-labelledby={`${uid}-title`}>
      <h1 id={`${uid}-title`}>{title}</h1>
      <label htmlFor={`${uid}-search`}>Search loaded records</label>
      <input
        id={`${uid}-search`}
        type="search"
        value={search}
        aria-describedby={`${uid}-search-help`}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />
      <p id={`${uid}-search-help`}>
        Search is local to loaded records and makes no requests.
      </p>

      {query.isPending && <p role="status">Loading</p>}
      {query.isFetchingNextPage && <p role="status">Loading more</p>}
      {readMessage !== null && (
        <div>
          <p role="alert">{readMessage}</p>
          {!query.isFetchNextPageError && (
            <button
              type="button"
              disabled={query.isFetching}
              onClick={() => {
                void runRead(() =>
                  query.refetch({ throwOnError: true, cancelRefetch: false }),
                );
              }}
            >
              Retry
            </button>
          )}
        </div>
      )}

      <table aria-labelledby={`${uid}-title`}>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={index} scope="col">{column.header}</th>
            ))}
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visible.map(({ id, row }) => (
            <tr key={id}>
              {columns.map((column, index) => (
                <td key={index}>{column.render(row)}</td>
              ))}
              <td>
                <button
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => edit(row, id)}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
          {query.data !== undefined && visible.length === 0 && (
            <tr><td colSpan={columns.length + 1}>No records</td></tr>
          )}
        </tbody>
      </table>

      {query.hasNextPage && (
        <button
          type="button"
          disabled={query.isFetching}
          onClick={() => {
            void runRead(() =>
              query.fetchNextPage({ throwOnError: true, cancelRefetch: false }),
            );
          }}
        >
          Load more
        </button>
      )}

      <form
        noValidate
        onSubmit={submit}
        aria-label={editId === null ? 'Create record' : 'Edit record'}
      >
        <h2>{editId === null ? 'Create record' : 'Edit record'}</h2>
        {fields.map((field, index) => {
          const id = `${uid}-field-${index}`;
          const error = fieldErrors.get(field.name);
          const controlProps = {
            id,
            name: field.name,
            value: String(values[field.name]),
            disabled: mutation.isPending,
            'aria-required': field.required === true,
            'aria-invalid': error !== undefined,
            'aria-describedby': error === undefined ? undefined : `${id}-error`,
            onChange: (
              event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
            ) => {
              const value = event.currentTarget.value;
              setValues((previous) => ({ ...previous, [field.name]: value }));
              setSaved(false);
            },
          };
          let control: React.ReactElement;
          if (field.kind === 'select') {
            const options = selectOptions(field);
            control = (
              <select {...controlProps}>
                {!options.includes(controlProps.value) && (
                  <option value={controlProps.value} disabled>
                    {controlProps.value || 'Select an option'}
                  </option>
                )}
                {options.map((option, optionIndex) => (
                  <option key={optionIndex} value={option}>{option}</option>
                ))}
              </select>
            );
          } else {
            control = (
              <input
                {...controlProps}
                type={field.kind}
                step={field.kind === 'number' ? 'any' : undefined}
              />
            );
          }
          return (
            <div key={field.name}>
              <label htmlFor={id}>{field.label}</label>
              {control}
              {error !== undefined && (
                <span id={`${id}-error`} role="alert">{error}</span>
              )}
            </div>
          );
        })}
        {writeMessage !== null && <p role="alert">{writeMessage}</p>}
        {saved && <p role="status">Saved</p>}
        <button type="submit" disabled={mutation.isPending}>Save</button>
        <button type="button" disabled={mutation.isPending} onClick={cancel}>
          Cancel
        </button>
      </form>
    </section>
  );
}
