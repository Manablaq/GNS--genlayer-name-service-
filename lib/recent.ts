import { validateName } from './domain.ts'
export const RECENT_SEARCH_KEY='gns:recent-searches:v1'
export function parseRecentSearches(raw:string|null){if(!raw)return[];try{const value=JSON.parse(raw);return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'&&validateName(item).valid).slice(0,5):[]}catch{return[]}}
export function addRecentSearch(items:string[],name:string){const valid=validateName(name);if(!valid.valid)return items;return [valid.canonical,...items.filter(item=>item!==valid.canonical)].slice(0,5)}
