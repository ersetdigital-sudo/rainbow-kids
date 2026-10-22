"use client";

export type Column<T> = {
  key: string;
  label: string;
  align?: "left" | "right";
  render: (row: T, index: number) => React.ReactNode;
  /** Sel tanpa label (mis. tombol aksi) — occupy full bar di mobile. */
  noLabel?: boolean;
  cellClass?: string;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyText = "Tidak ada data",
  className = "",
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  emptyText?: string;
  className?: string;
}) {
  return (
    <div className={`tw ${className}`}>
      <table className="t">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.align === "right" ? "r" : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-8 nolabel"
                style={{ color: "var(--mu)" }}
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                className={onRowClick ? "cl" : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    data-label={c.noLabel ? undefined : c.label}
                    className={[
                      c.align === "right" ? "r" : "",
                      c.noLabel ? "nolabel" : "",
                      c.cellClass ?? "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {c.render(row, i)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
