import Dexie, { type EntityTable } from 'dexie';

export interface Gift {
  event_id: string;
  event_slug?: string;
  host_email?: string;
  id: string;
  guest_name: string;
  amount_usd: number;
  amount_khr: number;
  slip_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const db = new Dexie('WeddingGiftsDB') as Dexie & {
  gifts: EntityTable<
    Gift,
    'id' // primary key "id" (for the typings only)
  >;
};

// Schema declaration, id is primary key, created_at is indexed
db.version(1).stores({
  gifts: 'id, guest_name, status, created_at'
});

export { db };
