import {useState} from 'react';
import {useClient, type DocumentActionComponent} from 'sanity';
import {reviewSnapshot} from './review';

function reviewAction(target:'inReview'|'approved'): DocumentActionComponent {
  return function ReviewAction({draft,published}) {
    const client=useClient({apiVersion:'2026-03-01'});
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState<string|null>(null);
    const doc=draft || published;
    const review=doc?.review as {status?:string;approvedContent?:string}|undefined;
    const source=doc?.source as {name?:string;url?:string}|undefined;
    const tools=doc?.tools as unknown[]|undefined;
    const steps=doc?.steps as {title?:string;body?:string}[]|undefined;
    const complete=!!doc?.title && !!doc?.summary && !!doc?.category && !!doc?.symptom && !!doc?.duration && !!doc?.difficulty && !!doc?.icon && !!doc?.color && !!doc?.caution && !!source?.name && !!source?.url?.startsWith('https://') && !!tools?.length && !!steps && steps.length>=2 && steps.every(s=>s.title&&s.body);
    const expected=target==='inReview'?['draft','approved']:['inReview'];
    return {
      label:busy?'Saving…':target==='inReview'?'Send for review':'Approve repair',
      title:!complete?'Complete the repair details, source, tools, and checklist first.':`Move this guide to ${target==='inReview'?'review':'approved'}. Publish afterwards to update the public library.`,
      disabled:busy||!complete||!expected.includes(review?.status || 'draft'),
      tone:target==='approved'?'positive':'primary',
      onHandle:async()=>{
        if(!doc||!complete||!expected.includes(review?.status||'draft')) return;
        setBusy(true);setError(null);
        try{
          await client.patch(doc._id).ifRevisionId(doc._rev).set({review:{...review,status:target,...(target==='approved'?{reviewedAt:new Date().toISOString().slice(0,10),approvedContent:reviewSnapshot(doc)}:{})}}).commit();
        }catch{setError('This guide changed or the update failed. Reload the document and try again.');}
        finally{setBusy(false);}
      },
      dialog:error?{type:'confirm',message:error,onCancel:()=>setError(null),onConfirm:()=>setError(null)}:undefined,
    };
  };
}
export const SubmitReview=reviewAction('inReview');
export const ApproveRepair=reviewAction('approved');

export function withReviewGuard(original: DocumentActionComponent): DocumentActionComponent {
  const GuardedPublish: DocumentActionComponent = function GuardedPublish(props) {
    const action=original(props);
    if(!action) return null;
    const doc=props.draft || props.published;
    const review=doc?.review as {status?:string;approvedContent?:string}|undefined;
    const approved=!!doc && review?.status==='approved' && review.approvedContent===reviewSnapshot(doc);
    return {...action,disabled:action.disabled||!approved,onHandle:approved?action.onHandle:()=>{},title:approved?action.title:'Send this version for review and approve it before publishing.'};
  };
  GuardedPublish.action=original.action;
  return GuardedPublish;
}
