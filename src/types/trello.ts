/**
 * Represents a file object from Supabase Storage.
 */
export type FileObject = {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>;
};

/**
 * Represents a label with a name and color.
 */
export type Label = {
  id: string;
  name: string | null;
  color: string;
  board_id: string;
};

/**
 * Represents a simplified card object for displaying related cards.
 */
export type RelatedCardInfo = {
  id:string;
  content: string;
  list_title: string;
};

// --- Background & Cover Configuration Types ---

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

/**
 * Defines the visual background of a board. Can be a color, a Unsplash image, or a custom uploaded image.
 */
export type BackgroundConfig = BackgroundConfigImage | BackgroundConfigColor | BackgroundConfigCustomImage | null;

// Cover configs extend background configs with a size property.
export type CoverConfigImage = BackgroundConfigImage & { size: 'full' | 'header' };
export type CoverConfigColor = BackgroundConfigColor & { size: 'full' | 'header' };
export type CoverConfigCustomImage = BackgroundConfigCustomImage & { size: 'full' | 'header' };

/**
 * Defines the visual cover of a card.
 */
export type CoverConfig = CoverConfigImage | CoverConfigColor | CoverConfigCustomImage | null;


// --- Card Sub-Item Types ---

/**
 * Represents a single item within a checklist.
 */
export type ChecklistItem = {
  id: string;
  content: string;
  is_completed: boolean;
  position: number;
  checklist_id: string;
};

/**
 * Represents a checklist container on a card.
 */
export type Checklist = {
  id: string;
  title: string;
  position: number;
  card_id: string;
  items: ChecklistItem[];
};

/**
 * Represents a file attached to a card.
 */
export type Attachment = {
  id: string;
  card_id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  created_at: string;
};

/**
 * Represents a user's profile information.
 */
export type UserProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string | null;
};

/**
 * Represents a member of a board, linking a user to a board with a specific role.
 */
export type BoardMember = {
  user_id: string;
  role: string;
  user: UserProfile;
};

/**
 * Represents a comment made on a card.
 */
export type Comment = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  user: UserProfile;
};


// --- Core Trello Types ---

/**
 * The main Card object, containing all its details and sub-items.
 */
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
  comments: Comment[];
};

/**
 * Represents a List (column) on a board, which contains cards.
 */
export type List = {
  id:string;
  title: string;
  position: number;
  board_id: string;
  cards: Card[];
  card_limit: number | null;
};

/**
 * The top-level Board object, containing all lists, labels, and members.
 */
export type Board = {
  id: string;
  name: string;
  background_config: BackgroundConfig;
  is_closed: boolean;
  lists: List[];
  labels: Label[];
  members: BoardMember[];
};