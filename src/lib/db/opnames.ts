import type { Opname, OpnameLine, OpnameStatus } from "../types";
import { deleteRows, diffRows, same, selectAll, upsertRows, type Row } from "./client";

type OpnameRow = {
  id: string;
  date: string;
  status: string;
  submitted_by: string | null;
  submitted_at: string | null;
  decided_by: string | null;
  decided_at: string | null;
  position: number;
};

type LineRow = {
  opname_id: string;
  position: number;
  vid: string;
  sys: number;
  phys: number | null;
  note: string;
};

function opnameRows(opnames: Opname[]): OpnameRow[] {
  return opnames.map((o, index) => ({
    id: o.id,
    date: o.date,
    status: o.status,
    submitted_by: o.sub ?? null,
    submitted_at: o.submittedAt ?? null,
    decided_by: o.by ?? null,
    decided_at: o.decidedAt ?? null,
    position: index,
  }));
}

function lineRows(opnames: Opname[]): LineRow[] {
  return opnames.flatMap((o) =>
    o.lines.map((l, index) => ({
      opname_id: o.id,
      position: index,
      vid: l.vid,
      sys: l.sys,
      phys: l.phys === "" ? null : l.phys,
      note: l.note,
    })),
  );
}

export async function loadOpnames(): Promise<Opname[]> {
  const [opnames, lines] = await Promise.all([
    selectAll<OpnameRow>("opnames"),
    selectAll<LineRow>("opname_lines"),
  ]);

  const linesByOpname = new Map<string, OpnameLine[]>();
  for (const l of lines) {
    const list = linesByOpname.get(l.opname_id) ?? [];
    list.push({
      vid: l.vid,
      sys: Number(l.sys),
      // Belum dihitung fisik = string kosong (bukan 0).
      phys: l.phys === null ? "" : Number(l.phys),
      note: l.note,
    });
    linesByOpname.set(l.opname_id, list);
  }

  return opnames.map((o) => ({
    id: o.id,
    date: o.date,
    status: o.status as OpnameStatus,
    lines: linesByOpname.get(o.id) ?? [],
    sub: o.submitted_by ?? undefined,
    by: o.decided_by ?? undefined,
    submittedAt: o.submitted_at ?? undefined,
    decidedAt: o.decided_at ?? undefined,
  }));
}

export async function saveOpnames(
  prev: Opname[],
  next: Opname[],
): Promise<void> {
  const prevById = new Map(prev.map((o) => [o.id, o]));
  const header = diffRows(opnameRows(prev), opnameRows(next), (r) => r.id);

  await upsertRows("opnames", header.changed as unknown as Row[]);
  await deleteRows("opnames", "id", header.removed);

  const linesChanged = next.filter((o) => {
    const before = prevById.get(o.id);
    return !before || !same(lineRows([before]), lineRows([o]));
  });
  if (linesChanged.length) {
    await deleteRows(
      "opname_lines",
      "opname_id",
      linesChanged.map((o) => o.id),
    );
    await upsertRows("opname_lines", lineRows(linesChanged) as unknown as Row[]);
  }
}
