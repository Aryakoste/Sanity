import {spawnSync} from 'node:child_process';
const [owner,repository]=process.argv.slice(2);
if(!owner||!repository||!/^[-\w]+$/.test(owner)||!/^[-.\w]+$/.test(repository)) {
  console.error('Usage: npm run build:pages -- YOUR_GITHUB_USERNAME YOUR_REPOSITORY');process.exit(1);
}
const root=repository===`${owner}.github.io`;
const result=spawnSync(process.execPath,['scripts/astro.mjs','build'],{stdio:'inherit',env:{...process.env,SITE_URL:`https://${owner}.github.io`,BASE_PATH:root?'/':`/${repository}/`}});
process.exit(result.status??1);
