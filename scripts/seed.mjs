import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createClient} from '@sanity/client';
import {reviewSnapshot} from '../sanity/review.ts';
const seed=JSON.parse(await readFile(new URL('../src/data/library.json',import.meta.url),'utf8'));
const documents=[
  ...seed.tools.map(t=>({...t,_type:'repairTool'})),
  ...seed.guides.map(({toolIds,...g})=>{
    const doc={...g,_type:'repairGuide',tools:toolIds.map((id,i)=>({_key:`tool-${i}`,_type:'reference',_ref:id}))};
    return {...doc,review:{...g.review,approvedContent:reviewSnapshot(doc)}};
  }),
];
await mkdir(new URL('../sanity/',import.meta.url),{recursive:true});
await writeFile(new URL('../sanity/seed.ndjson',import.meta.url),documents.map(d=>JSON.stringify(d)).join('\n')+'\n');
if(!process.env.SANITY_API_TOKEN){
  console.log('Prepared sanity/seed.ndjson (11 documents). No token was provided.');
  console.log('Use your local Sanity login: npm exec -- sanity dataset import sanity/seed.ndjson production --missing');
  process.exit(0);
}
const client=createClient({projectId:process.env.PUBLIC_SANITY_PROJECT_ID||'5zzpp9q6',dataset:process.env.PUBLIC_SANITY_DATASET||'production',apiVersion:'2026-03-01',useCdn:false,token:process.env.SANITY_API_TOKEN});
const tx=client.transaction();documents.forEach(d=>tx.createIfNotExists(d));
await tx.commit();console.log(`Imported ${documents.length} documents without replacing existing content.`);
