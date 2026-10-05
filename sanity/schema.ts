import {defineType,defineField,defineArrayMember} from 'sanity';

export const schemaTypes=[
  defineType({name:'repairTool',title:'Repair tool',type:'document',fields:[
    defineField({name:'name',title:'Name',type:'string',validation:Rule=>Rule.required().max(60)}),
    defineField({name:'description',title:'What it is for',type:'string',validation:Rule=>Rule.required().max(180)}),
  ]}),
  defineType({name:'repairGuide',title:'Repair guide',type:'document',initialValue:{color:'mint',icon:'shirt',difficulty:'Beginner',review:{status:'draft'}},fields:[
    defineField({name:'title',title:'Title',type:'string',validation:Rule=>Rule.required().max(75)}),
    defineField({name:'summary',title:'Short description',type:'text',rows:2,validation:Rule=>Rule.required().max(150)}),
    defineField({name:'category',type:'string',options:{list:['Clothing','Bags','Home textiles']},validation:Rule=>Rule.required()}),
    defineField({name:'symptom',title:'When this repair fits',description:'Be precise about the failure this plan handles. Exclude incompatible damage.',type:'string',validation:Rule=>Rule.required().max(180)}),
    defineField({name:'duration',title:'Estimated minutes',type:'number',validation:Rule=>Rule.required().integer().min(1).max(180)}),
    defineField({name:'difficulty',type:'string',options:{list:['Beginner','Some practice']},validation:Rule=>Rule.required()}),
    defineField({name:'icon',type:'string',options:{list:['shirt','scissors','backpack','sofa','shopping-bag']},validation:Rule=>Rule.required()}),
    defineField({name:'color',type:'string',options:{list:['mint','lilac','peach','blue','rose','sand']},validation:Rule=>Rule.required()}),
    defineField({name:'tools',title:'Required tools',type:'array',of:[defineArrayMember({type:'reference',to:[{type:'repairTool'}]})],validation:Rule=>Rule.required().min(1).unique()}),
    defineField({name:'materials',type:'array',of:[defineArrayMember({type:'string'})],validation:Rule=>Rule.required().min(1)}),
    defineField({name:'steps',title:'Preparation checklist',description:'Write a concise, original checklist. Link to the full source for illustrated technique.',type:'array',of:[defineArrayMember({type:'object',name:'repairStep',fields:[
      defineField({name:'title',type:'string',validation:Rule=>Rule.required().max(80)}),
      defineField({name:'body',type:'text',rows:3,validation:Rule=>Rule.required().max(500)}),
    ],preview:{select:{title:'title',subtitle:'body'}}})],validation:Rule=>Rule.required().min(2).max(12)}),
    defineField({name:'caution',title:'Limits and precautions',type:'text',rows:3,validation:Rule=>Rule.required().max(500)}),
    defineField({name:'source',title:'Original source',type:'object',fields:[
      defineField({name:'name',title:'Source credit',type:'string',validation:Rule=>Rule.required()}),
      defineField({name:'url',title:'Full illustrated guide',type:'url',validation:Rule=>Rule.required().uri({scheme:['https']})}),
    ],validation:Rule=>Rule.required()}),
    defineField({name:'review',title:'Editorial review',type:'object',fields:[
      defineField({name:'status',type:'string',readOnly:true,options:{list:[{title:'Draft',value:'draft'},{title:'Needs review',value:'inReview'},{title:'Approved',value:'approved'}]},validation:Rule=>Rule.required()}),
      defineField({name:'reviewedAt',title:'Last reviewed',type:'date',readOnly:true}),
      defineField({name:'approvedContent',title:'Approved content snapshot',type:'text',hidden:true,readOnly:true}),
      defineField({name:'note',title:'Review notes',type:'text',rows:3}),
    ],validation:Rule=>Rule.required()}),
  ],preview:{select:{title:'title',category:'category',status:'review.status'},prepare:({title,category,status})=>({title,subtitle:`${category || 'Uncategorized'} · ${status || 'draft'}`})}}),
];
