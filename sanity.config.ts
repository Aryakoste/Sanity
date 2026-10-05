import {defineConfig} from 'sanity';
import {structureTool} from 'sanity/structure';
import {schemaTypes} from './sanity/schema';
import {SubmitReview, ApproveRepair, withReviewGuard} from './sanity/actions';

export default defineConfig({
  name:'mend', title:'Mend · Repair library',
  projectId:process.env.PUBLIC_SANITY_PROJECT_ID || '5zzpp9q6',
  dataset:process.env.PUBLIC_SANITY_DATASET || 'production',
  plugins:[structureTool({structure:S=>S.list().title('Repair room').items([
    S.listItem().title('Needs review').child(S.documentList().title('Needs review').filter('_type == "repairGuide" && review.status == "inReview"')),
    S.listItem().title('Approved repairs').child(S.documentList().title('Approved repairs').filter('_type == "repairGuide" && review.status == "approved"')),
    S.divider(), ...S.documentTypeListItems(),
  ])})],
  schema:{types:schemaTypes},
  document:{actions:(previous,context)=>context.schemaType==='repairGuide'?[...previous.map(action=>action.action==='publish'?withReviewGuard(action):action),SubmitReview,ApproveRepair]:previous},
});
