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

export type Card = {
  id: string;
  content: string;
  description: string | null;
  start_date: string | null;
  due_date: string | null;
  position: number;
  list_id: string;
  is_completed: boolean;
  labels: Label[];
  related_cards: RelatedCardInfo[];
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
  lists: List[];
  labels: Label[];
};