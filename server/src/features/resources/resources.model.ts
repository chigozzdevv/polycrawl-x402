import { getDb } from '@/config/db.js';

export type ResourceDoc = {
  _id: string;
  provider_id: string;
  title: string;
  type: 'site' | 'dataset' | 'file';
  format: 'csv' | 'pdf' | 'json' | 'html' | string;
  domain?: string;
  path?: string;
  tags?: string[];
  summary?: string;
  sample_preview?: string;
  schema?: string[]; // optional columns for CSV/JSON
  size_bytes?: number;
  price_per_kb?: number;
  price_flat?: number;
  visibility?: 'public' | 'restricted';
  modes?: Array<'raw' | 'summary'>;
  policy?: { visibility?: 'public' | 'restricted'; allow?: string[]; deny_paths?: string[]; modes?: Array<'raw' | 'summary'> };
  updated_at?: string;
  connector_id?: string;
  storage_ref?: string; // cloudinary public id or URL
  verified?: boolean;
  avg_latency_ms?: number;
};

export async function findResourceById(id: string) {
  const db = await getDb();
  const doc = await db.collection<ResourceDoc>('resources').findOne({ _id: id });
  return doc || null;
}

export async function searchResourcesByQuery(query: string, opts?: { format?: string[] }) {
  const db = await getDb();
  const tokens = Array.from(new Set(String(query).split(/[^a-zA-Z0-9]+/).filter(t => t.length > 1))).slice(0, 6);
  const andClauses = tokens.length > 0
    ? tokens.map(t => ({
        $or: [
          { title: { $regex: t, $options: 'i' } },
          { summary: { $regex: t, $options: 'i' } },
          { sample_preview: { $regex: t, $options: 'i' } },
          { domain: { $regex: t, $options: 'i' } },
          { tags: { $in: [new RegExp(t, 'i')] } },
        ],
      }))
    : [
        {
          $or: [
            { title: { $regex: query, $options: 'i' } },
            { summary: { $regex: query, $options: 'i' } },
            { sample_preview: { $regex: query, $options: 'i' } },
            { domain: { $regex: query, $options: 'i' } },
            { tags: { $in: [new RegExp(query, 'i')] } },
          ],
        },
      ];
  const match: any = { $and: andClauses };
  if (opts?.format?.length) match.format = { $in: opts.format };
  const cursor = db.collection<ResourceDoc>('resources').find(match).limit(10);
  const list = await cursor.toArray();
  return list;
}
