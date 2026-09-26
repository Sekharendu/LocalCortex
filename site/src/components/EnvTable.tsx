export interface EnvVar {
  name: string;
  default: string;
  purpose: string;
}

export function EnvTable({ rows }: { rows: EnvVar[] }) {
  return (
    <div className="table-wrap">
      <table className="env-table">
        <thead>
          <tr>
            <th>Variable</th>
            <th>Default</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>
                <code>{r.name}</code>
              </td>
              <td>
                <code>{r.default}</code>
              </td>
              <td>{r.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
