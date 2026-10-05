import {createClient} from '@sanity/client';
const projectId=process.env.PUBLIC_SANITY_PROJECT_ID||'5zzpp9q6';
const dataset=process.env.PUBLIC_SANITY_DATASET||'production';
const client=createClient({projectId,dataset,apiVersion:'2026-03-01',useCdn:false,perspective:'published'});
const result=await client.fetch(`{"guides": count(*[_type == "repairGuide" && review.status == "approved"]), "tools": count(*[_type == "repairTool"]), "brokenReferences": count(*[_type == "repairGuide" && count(tools[!defined(@->)]) > 0])}`);
console.log(JSON.stringify({projectId,dataset,...result},null,2));
if(result.guides===0 || result.tools===0 || result.brokenReferences>0) process.exitCode=1;
