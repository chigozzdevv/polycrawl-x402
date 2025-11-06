import { findResourceById, searchResourcesByQuery, type ResourceDoc } from '@/features/resources/resources.model.js';

export type Resource = ResourceDoc & { id?: string };

export async function searchResources(query: string, opts?: { format?: string[] }) {
  const list = await searchResourcesByQuery(query, { format: opts?.format });
  return list.map((r) => ({ ...r, id: r._id }));
}

export async function getResourceById(id: string) {
  const r = await findResourceById(id);
  return r ? ({ ...r, id: r._id } as Resource) : null;
}
