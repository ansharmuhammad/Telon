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
  id: string;
  title: string;
  position: number;
  board_id: string;
  cards: Card[];
};

export type Board = {
  id: string;
  name: string;
  lists: List[];
  labels: Label[];
};