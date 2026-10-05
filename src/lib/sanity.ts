import {createClient} from '@sanity/client';
import {sampleGuides, sampleTools} from './planner';
import type {Library, Guide, Tool} from './types';

export const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID || '5zzpp9q6';
export const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production';
export const client = createClient({projectId, dataset, apiVersion:'2026-03-01', useCdn:true, perspective:'published'});
export const libraryQuery = `{
  "guides": *[_type == "repairGuide" && review.status == "approved"] | order(title asc) {
    _id, title, summary, category, icon, color, duration, difficulty, symptom, materials,
    "tools": tools[]->{_id, name, description}, steps[]{_key,title,body}, caution, source, review{status,reviewedAt}
  },
  "tools": *[_type == "repairTool"] | order(name asc) {_id, name, description}
}`;
export async function loadLibrary(): Promise<Library> {
  try {
    const result = await client.fetch<{guides: Guide[]; tools: Tool[]}>(libraryQuery, {}, {timeout:10000});
    if (result.guides.length && result.tools.length) return {...result, mode:'sanity', fetchedAt:new Date().toISOString()};
  } catch {
    console.warn('Mend: Sanity unavailable. Building the explicitly labeled sample library.');
  }
  return {guides:sampleGuides(), tools:sampleTools, mode:'sample', fetchedAt:new Date().toISOString()};
}
