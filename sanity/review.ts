/** Exact snapshot of the fields reviewed; changing a repair requires approval again. */
export function reviewSnapshot(doc: Record<string,unknown>): string {
  const tools=doc.tools as {_ref:string}[] | undefined;
  const steps=doc.steps as {_key:string;title:string;body:string}[] | undefined;
  const source=doc.source as {name:string;url:string} | undefined;
  return JSON.stringify({
    title:doc.title,summary:doc.summary,category:doc.category,symptom:doc.symptom,
    duration:doc.duration,difficulty:doc.difficulty,icon:doc.icon,color:doc.color,
    materials:doc.materials,caution:doc.caution,
    source:source?{name:source.name,url:source.url}:undefined,
    tools:tools?.map(t=>t._ref),steps:steps?.map(s=>({_key:s._key,title:s.title,body:s.body})),
  });
}
