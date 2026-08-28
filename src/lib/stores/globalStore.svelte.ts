import { globalStore as store } from './globalStore.svelte.js';
import { db as mockDb } from '../db/mockDb.svelte.js';

export const globalStore = store;
export const db = mockDb;

export default store;
