export type Category = 'Clothing' | 'Bags' | 'Home textiles';
export interface Tool { _id: string; name: string; description: string }
export interface Step { _key: string; title: string; body: string }
export interface Guide {
  _id: string; title: string; summary: string; category: Category;
  icon: string; color: string; duration: number; difficulty: 'Beginner' | 'Some practice';
  symptom: string; materials: string[]; tools: Tool[]; steps: Step[];
  caution: string; source: { name: string; url: string };
  review: { status: 'draft' | 'inReview' | 'approved'; reviewedAt?: string };
}
export interface Repair {
  id: string; guideId: string; title: string; createdAt: string;
  checkedSteps: string[]; completedAt?: string; weightGrams: number;
}
export interface Library { guides: Guide[]; tools: Tool[]; mode: 'sanity' | 'sample'; fetchedAt: string }
