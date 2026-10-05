import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
const env={...process.env,ASTRO_TELEMETRY_DISABLED:'1'};
if(process.argv[2]==='preview'&&existsSync('dist/build-info.json')){
  const info=JSON.parse(readFileSync('dist/build-info.json','utf8'));
  env.BASE_PATH=env.BASE_PATH||info.base;env.SITE_URL=env.SITE_URL||info.site;
}
const require=createRequire(import.meta.url);
const packagePath=require.resolve('astro/package.json');
const pkg=require(packagePath);
const bin=resolve(dirname(packagePath),typeof pkg.bin==='string'?pkg.bin:pkg.bin.astro);
const result=spawnSync(process.execPath,[bin,...process.argv.slice(2)],{stdio:'inherit',env});
if(result.status===0&&process.argv[2]==='build') writeFileSync('dist/build-info.json',JSON.stringify({base:env.BASE_PATH||'/',site:env.SITE_URL||'http://localhost:4321'},null,2)+'\n');
process.exit(result.status??1);
