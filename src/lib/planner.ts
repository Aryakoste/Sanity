import type {Guide, Tool, Repair} from './types';
import seed from '../data/library.json';

export function sampleGuides(): Guide[] {
  return seed.guides.map(({toolIds, ...guide}) => ({
    ...guide, tools: toolIds.map(id => seed.tools.find(t => t._id === id)!).filter(Boolean),
  })) as Guide[];
}
export const sampleTools = seed.tools as Tool[];
export function missingTools(guide: Guide, owned: string[]): Tool[] {
  return guide.tools.filter(tool => !owned.includes(tool._id));
}
export function matchGuides(guides: Guide[], category: string, minutes: number, owned: string[]) {
  return guides.filter(g => g.category === category && g.duration <= minutes)
    .sort((a,b) => missingTools(a,owned).length - missingTools(b,owned).length || a.duration - b.duration);
}
export function impact(repairs: Repair[]) {
  const done = repairs.filter(r => !!r.completedAt);
  return { count: done.length, grams: done.reduce((total,r) => total + r.weightGrams,0) };
}
export function validateRepairs(value: unknown): Repair[] {
  if (!Array.isArray(value)) return [];
  return value.filter((r): r is Repair => !!r && typeof r === 'object' &&
    typeof r.id === 'string' && typeof r.guideId === 'string' && typeof r.title === 'string' &&
    typeof r.createdAt === 'string' && Array.isArray(r.checkedSteps) && r.checkedSteps.every((s: unknown)=>typeof s === 'string') &&
    typeof r.weightGrams === 'number' && Number.isFinite(r.weightGrams) && r.weightGrams >= 0 && r.weightGrams <= 100000 &&
    (r.completedAt === undefined || typeof r.completedAt === 'string'));
}
