export type FileObject = {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>;
};

export type Label = {
  id: string;
  name: string | null;
  color: string;
  board_id: string;
};

export type RelatedCardInfo = {
  id: string;
  content: string;
  list_title: string;
};

export type BackgroundConfigImage = {
  type: 'image';
  fullUrl: string;
  thumbUrl: string;
  userName: string;
  userLink: string;
};

export type BackgroundConfigColor = {
  type: 'color';
  color: string;
};

export type BackgroundConfigCustomImage = {
  type: 'custom-image';
  path: string;
};

export type BackgroundConfig = BackgroundConfigImage | BackgroundConfigColor | BackgroundConfigCustomImage | null;

export type CoverConfigImage = BackgroundConfigImage & { size: 'full' | 'header' };
export type CoverConfigColor = BackgroundConfigColor & { size: 'full' | 'header' };
export type CoverConfigCustomImage = BackgroundConfigCustomImage & { size: 'full' | 'header' };
export type CoverConfig = CoverConfigImage | CoverConfigColor | CoverConfigCustomImage | null;

export type ChecklistItem = {
  id: string;
  content: string;
  is_completed: boolean;
  position: number;
  checklist_id: string;
};

export type Checklist = {
  id: string;
  title: string;
  position: number;
  card_id: string;
  items: ChecklistItem[];
};

export type Attachment = {
  id: string;
  card_id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  created_at: string;
};

export type Card = {
  id: string;
  content: string;
  description: string | null;
  start_date: string | null;
  due_date: string | null;
  position: number;
  list_id: string;
  is_completed: boolean;
  cover_config: CoverConfig;
  labels: Label[];
  related_cards: RelatedCardInfo[];
  checklists: Checklist[];
  attachments: Attachment[];
};

export type List = {
  id:string;
  title: string;
  position: number;
  board_id: string;
  cards: Card[];
};

export type Board = {
  id: string;
  name: string;
  background_config: BackgroundConfig;
  is_closed: boolean;
  lists: List[];
  labels: Label[];
};