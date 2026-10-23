import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { useInfiniteQuery, useMutation, useQueryClient, } from '@tanstack/react-query';
function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
}
function errorMessage(error) {
    if (error instanceof Error)
        return error.message;
    if (typeof error === 'string')
        return error;
    if (typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string') {
        return error.message;
    }
    return 'Operation failed without an error message.';
}
function requireSuccess(result) {
    if (!result.success) {
        throw new Error(errorMessage('error' in result ? result.error : undefined));
    }
}
async function readPage(service, skipToken) {
    const result = await service.getAll(skipToken === undefined ? undefined : { skipToken });
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
function assertFlat(value, label) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error(`${label} must be a flat string/number object.`);
    }
    const entries = Object.entries(value);
    if (Reflect.ownKeys(value).length !== entries.length) {
        throw new Error(`${label} must have only enumerable string keys.`);
    }
    for (const [name, item] of entries) {
        if (typeof item !== 'string' &&
            (typeof item !== 'number' || !Number.isFinite(item))) {
            throw new Error(`${label}.${name} must be a string or finite number.`);
        }
    }
}
function selectOptions(field) {
    const options = field.options;
    if (!Array.isArray(options) ||
        options.length === 0 ||
        options.some((option) => typeof option !== 'string')) {
        throw new Error(`Select field "${field.name}" requires nonempty string options.`);
    }
    return options;
}
function checkConfiguration(defaults, fields) {
    assertFlat(defaults, 'defaults');
    const names = new Set();
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
        if (field.maxLength !== undefined &&
            (!Number.isInteger(field.maxLength) || field.maxLength < 0)) {
            throw new Error(`maxLength for "${field.name}" must be a nonnegative integer.`);
        }
        if ((field.min !== undefined && !Number.isFinite(field.min)) ||
            (field.max !== undefined && !Number.isFinite(field.max)) ||
            (field.min !== undefined &&
                field.max !== undefined &&
                field.min > field.max)) {
            throw new Error(`Invalid numeric bounds for "${field.name}".`);
        }
        if (field.kind === 'select')
            selectOptions(field);
    }
}
function checkEditDraft(draft, defaults) {
    assertFlat(draft, 'toDraft result');
    if (Object.keys(draft).length !== Object.keys(defaults).length ||
        Object.keys(defaults).some((name) => !hasOwn(draft, name) ||
            typeof draft[name] !== typeof defaults[name])) {
        throw new Error('toDraft must return exactly the default keys and primitive types.');
    }
}
function normalize(values, defaults, fields) {
    const names = Object.keys(defaults);
    if (names.length !== Object.keys(values).length ||
        names.some((name) => !hasOwn(values, name))) {
        throw new Error('Form keys no longer match defaults; remount to change the schema.');
    }
    const draft = { ...defaults };
    const errors = new Map();
    const byName = new Map();
    for (const field of fields)
        byName.set(field.name, field);
    for (const key of names) {
        const name = key;
        const text = String(values[name]).trim();
        const value = typeof defaults[name] === 'number'
            ? text === '' ? Number.NaN : Number(text)
            : text;
        const field = byName.get(name);
        if (field) {
            let issue;
            if (field.required && text === '') {
                issue = 'is required.';
            }
            else if (typeof value === 'number' && !Number.isFinite(value)) {
                issue = 'must be a finite number.';
            }
            else if (field.maxLength !== undefined && text.length > field.maxLength) {
                issue = `must have at most ${field.maxLength} characters.`;
            }
            else if (typeof value === 'number' &&
                field.min !== undefined &&
                value < field.min) {
                issue = `must be at least ${field.min}.`;
            }
            else if (typeof value === 'number' &&
                field.max !== undefined &&
                value > field.max) {
                issue = `must be at most ${field.max}.`;
            }
            else if (field.kind === 'email' &&
                text !== '' &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
                issue = 'must be a valid email address.';
            }
            else if (field.kind === 'select' &&
                !selectOptions(field).includes(text)) {
                issue = 'must be one of the declared options.';
            }
            if (issue !== undefined)
                errors.set(name, `${field.label} ${issue}`);
        }
        if (typeof value !== typeof defaults[name]) {
            throw new Error(`Normalized type for "${name}" does not match its default.`);
        }
        // Only existing own keys are assigned, preserving their default primitive type.
        draft[name] = value;
    }
    return { draft, errors };
}
export function RecordScreen(props) {
    const { title, queryKey, service, fields, columns, defaults, getId, toDraft, searchText, } = props;
    checkConfiguration(defaults, fields);
    const uid = React.useId();
    const client = useQueryClient();
    const [values, setValues] = React.useState(() => ({ ...defaults }));
    const [editId, setEditId] = React.useState(null);
    const [fieldErrors, setFieldErrors] = React.useState(new Map());
    const [formError, setFormError] = React.useState(null);
    const [readError, setReadError] = React.useState(null);
    const [saved, setSaved] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const writeLock = React.useRef(false);
    const query = useInfiniteQuery({
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
    async function runRead(action) {
        setReadError(null);
        try {
            await action();
        }
        catch (error) {
            setReadError(errorMessage(error));
        }
    }
    function replaceForm(draft, id) {
        setValues({ ...draft });
        setEditId(id);
        setFieldErrors(new Map());
        setFormError(null);
    }
    const mutation = useMutation({
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
            void runRead(() => client.invalidateQueries({ queryKey, exact: true }, { throwOnError: true }));
        },
        onSettled: () => {
            writeLock.current = false;
        },
    });
    function edit(row, id) {
        if (writeLock.current)
            return;
        try {
            const draft = toDraft(row);
            checkEditDraft(draft, defaults);
            replaceForm(draft, id);
            mutation.reset();
            setSaved(false);
        }
        catch (error) {
            setFormError(errorMessage(error));
        }
    }
    function cancel() {
        if (writeLock.current)
            return;
        replaceForm(defaults, null);
        mutation.reset();
        setSaved(false);
    }
    function submit(event) {
        event.preventDefault();
        if (writeLock.current)
            return;
        setSaved(false);
        setFormError(null);
        mutation.reset();
        try {
            const result = normalize(values, defaults, fields);
            setFieldErrors(result.errors);
            if (result.errors.size !== 0)
                return;
            writeLock.current = true;
            mutation.mutate({ id: editId, draft: result.draft });
        }
        catch (error) {
            writeLock.current = false;
            setFormError(errorMessage(error));
        }
    }
    const visible = [];
    const seen = new Set();
    const term = search.toLowerCase();
    for (const page of query.data?.pages ?? []) {
        for (const row of page.rows) {
            const id = getId(row);
            if (seen.has(id))
                continue;
            seen.add(id);
            if (searchText(row).toLowerCase().includes(term)) {
                visible.push({ id, row });
            }
        }
    }
    const readMessage = query.isError ? errorMessage(query.error) : readError;
    const writeMessage = formError ??
        (mutation.isError ? errorMessage(mutation.error) : null);
    return (_jsxs("section", { "aria-labelledby": `${uid}-title`, children: [_jsx("h1", { id: `${uid}-title`, children: title }), _jsx("label", { htmlFor: `${uid}-search`, children: "Search loaded records" }), _jsx("input", { id: `${uid}-search`, type: "search", value: search, "aria-describedby": `${uid}-search-help`, onChange: (event) => setSearch(event.currentTarget.value) }), _jsx("p", { id: `${uid}-search-help`, children: "Search is local to loaded records and makes no requests." }), query.isPending && _jsx("p", { role: "status", children: "Loading" }), query.isFetchingNextPage && _jsx("p", { role: "status", children: "Loading more" }), readMessage !== null && (_jsxs("div", { children: [_jsx("p", { role: "alert", children: readMessage }), !query.isFetchNextPageError && (_jsx("button", { type: "button", disabled: query.isFetching, onClick: () => {
                            void runRead(() => query.refetch({ throwOnError: true, cancelRefetch: false }));
                        }, children: "Retry" }))] })), _jsxs("table", { "aria-labelledby": `${uid}-title`, children: [_jsx("thead", { children: _jsxs("tr", { children: [columns.map((column, index) => (_jsx("th", { scope: "col", children: column.header }, index))), _jsx("th", { scope: "col", children: "Actions" })] }) }), _jsxs("tbody", { children: [visible.map(({ id, row }) => (_jsxs("tr", { children: [columns.map((column, index) => (_jsx("td", { children: column.render(row) }, index))), _jsx("td", { children: _jsx("button", { type: "button", disabled: mutation.isPending, onClick: () => edit(row, id), children: "Edit" }) })] }, id))), query.data !== undefined && visible.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: columns.length + 1, children: "No records" }) }))] })] }), query.hasNextPage && (_jsx("button", { type: "button", disabled: query.isFetching, onClick: () => {
                    void runRead(() => query.fetchNextPage({ throwOnError: true, cancelRefetch: false }));
                }, children: "Load more" })), _jsxs("form", { noValidate: true, onSubmit: submit, "aria-label": editId === null ? 'Create record' : 'Edit record', children: [_jsx("h2", { children: editId === null ? 'Create record' : 'Edit record' }), fields.map((field, index) => {
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
                            onChange: (event) => {
                                const value = event.currentTarget.value;
                                setValues((previous) => ({ ...previous, [field.name]: value }));
                                setSaved(false);
                            },
                        };
                        let control;
                        if (field.kind === 'select') {
                            const options = selectOptions(field);
                            control = (_jsxs("select", { ...controlProps, children: [!options.includes(controlProps.value) && (_jsx("option", { value: controlProps.value, disabled: true, children: controlProps.value || 'Select an option' })), options.map((option, optionIndex) => (_jsx("option", { value: option, children: option }, optionIndex)))] }));
                        }
                        else {
                            control = (_jsx("input", { ...controlProps, type: field.kind, step: field.kind === 'number' ? 'any' : undefined }));
                        }
                        return (_jsxs("div", { children: [_jsx("label", { htmlFor: id, children: field.label }), control, error !== undefined && (_jsx("span", { id: `${id}-error`, role: "alert", children: error }))] }, field.name));
                    }), writeMessage !== null && _jsx("p", { role: "alert", children: writeMessage }), saved && _jsx("p", { role: "status", children: "Saved" }), _jsx("button", { type: "submit", disabled: mutation.isPending, children: "Save" }), _jsx("button", { type: "button", disabled: mutation.isPending, onClick: cancel, children: "Cancel" })] })] }));
}
