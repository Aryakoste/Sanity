import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('main views and repair dialog pass automated accessibility checks',async({page})=>{
  await page.goto('./');await expect(page.locator('.app-shell')).toHaveAttribute('data-ready','true');
  async function check(){const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(results.violations.map(v=>({id:v.id,description:v.description,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);}
  await check();
  await page.getByRole('button',{name:'Find my repair',exact:true}).click();await check();
  await page.getByRole('button',{name:'Make this my plan'}).first().click();await check();
  await page.getByRole('button',{name:'Close dialog'}).click();
  await page.getByRole('button',{name:'My impact',exact:true}).click();await check();
  await page.setViewportSize({width:390,height:844});await check();
});
