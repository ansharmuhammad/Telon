export type Card = {
  id: string;
  content: string;
  description: string | null;
  start_date: string | null;
  due_date: string | null;
  position: number;
  list_id: string;
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
};