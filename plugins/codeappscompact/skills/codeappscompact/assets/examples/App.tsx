import { RecordScreen } from 'codeappscompact';
import { RequestsService, type RequestDraft, type RequestRecord } from './service';

export default function App() {
  return <RecordScreen<RequestRecord, RequestDraft>
    title="Service requests" queryKey={['requests']} service={RequestsService}
    defaults={{ summary: '', ownerEmail: '', priority: 'Normal', hours: 1 }}
    getId={row => row.id}
    toDraft={row => ({ summary: row.summary, ownerEmail: row.ownerEmail, priority: row.priority, hours: row.hours })}
    searchText={row => `${row.summary} ${row.ownerEmail}`}
    fields={[
      { name: 'summary', label: 'Summary', kind: 'text', required: true, maxLength: 80 },
      { name: 'ownerEmail', label: 'Owner email', kind: 'email', required: true },
      { name: 'priority', label: 'Priority', kind: 'select', required: true, options: ['Normal', 'Urgent'] },
      { name: 'hours', label: 'Hours', kind: 'number', required: true, min: 0, max: 100 },
    ]}
    columns={[
      { header: 'Summary', render: row => row.summary },
      { header: 'Owner email', render: row => row.ownerEmail },
      { header: 'Priority', render: row => row.priority },
      { header: 'Hours', render: row => row.hours },
    ]}
  />;
}
