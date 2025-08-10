# Trello Clone - A Real-Time Task Management Board

This project is a feature-rich clone of Trello, built from the ground up using a modern web stack. It provides a real-time, collaborative, and interactive platform for managing tasks and projects, powered by React on the frontend and Supabase for all backend services.

![Trello Clone Screenshot](https://raw.githubusercontent.com/supabase/supabase/master/examples/trello-clone/docs/trello-clone.png)

## Key Features

-   **Real-time Collaboration**: Changes made by one user are instantly visible to others via Supabase Realtime subscriptions.
-   **Drag & Drop**: Seamlessly reorder cards within and between lists using `@atlaskit/pragmatic-drag-and-drop`.
-   **Secure Authentication**: User login and management handled by Supabase Auth, with options for both email/password and public, no-account-needed boards.
-   **Rich Card Details**: Cards support descriptions, labels, checklists with progress bars, file attachments, due dates, and dynamic cover images.
-   **Dynamic Backgrounds**: Customize board backgrounds with solid colors, images from the Unsplash API, or your own custom uploads.
-   **Global Search**: A debounced search input allows you to quickly find cards across all your boards.
-   **Notifications**: Receive in-app notifications when you are invited to a board or mentioned in a comment.
-   **Team Management**: Invite users to boards and manage their roles.

---

## Diagrams

### Tech Stack

```mermaid
graph TD
    A[Trello Clone Project] --> B{Frontend};
    A --> C{Backend};
    A --> D{Styling};
    A --> E{Testing};

    subgraph Frontend
        B --> B1[React];
        B --> B2[TypeScript];
        B --> B3[Vite];
        B --> B4[React Router];
    end

    subgraph Backend
        C --> C1[Supabase];
        C1 --> C1a[Postgres DB];
        C1 --> C1b[Auth];
        C1 --> C1c[Storage];
        C1 --> C1d[Edge Functions];
    end

    subgraph Styling
        D --> D1[Tailwind CSS];
        D --> D2[shadcn/ui];
    end

    subgraph Testing
        E --> E1[Vitest];
        E --> E2[React Testing Library];
    end
```

### Infrastructure

```mermaid
graph TD
    User[End User] --> FE[React Frontend];

    subgraph Hosting
        FE
    end

    subgraph Supabase Platform
        Auth[Auth]
        DB[Postgres Database]
        Storage[File Storage]
        Functions[Edge Functions]
    end
    
    FE --> Auth;
    FE --> DB;
    FE --> Storage;
    FE --> Functions;

    Functions --> Unsplash[Unsplash API];

    DB -- Realtime --> FE;
```

### Code Structure

```mermaid
graph TD
    App[App.tsx] --> AuthProvider[AuthProvider];
    App --> Router[BrowserRouter];

    Router --> Route_Home[Route: /];
    Router --> Route_Dashboard[Route: /dashboard];
    Router --> Route_Board[Route: /board/:id];
    Router --> Route_Login[Route: /login];

    Route_Dashboard --> DashboardPage[Dashboard Page];
    Route_Board --> BoardPage[Board Page];
    Route_Login --> LoginPage[Login Page];

    BoardPage --> Header[Header Component];
    BoardPage --> TrelloBoard[TrelloBoard Component];
    
    TrelloBoard --> TrelloList[TrelloList Component];
    TrelloBoard --> CardDetailsModal[CardDetailsModal];

    TrelloList --> TrelloCard[TrelloCard Component];
```

### Data Flow (Real-time Update)

```mermaid
sequenceDiagram
    participant User
    participant ReactApp as React App
    participant SupabaseAPI as Supabase API
    participant SupabaseDB as Supabase DB
    participant Realtime as Supabase Realtime

    User->>ReactApp: Drags and drops a card
    ReactApp->>ReactApp: 1. Optimistic UI Update (move card in local state)
    ReactApp->>SupabaseAPI: 2. Update card position (RPC call)
    SupabaseAPI->>SupabaseDB: 3. Persist change in database
    SupabaseDB-->>Realtime: 4. Database change triggers event
    Realtime-->>ReactApp: 5. Broadcasts event to all clients
    ReactApp->>ReactApp: 6. Listener refetches board data for consistency
```

---

## Project Flow

The application's architecture is designed to be simple yet powerful, leveraging Supabase for most of the heavy lifting.

1.  **Authentication**: A user can either sign up/log in or create a public board without an account. The `AuthContext` manages the user's session and protects routes.
2.  **Dashboard**: Authenticated users land on a dashboard where they can see their boards or create new ones.
3.  **Board View**: When a board is selected, the user navigates to the `BoardPage`.
    -   **Data Fetching**: `BoardPage` makes a single, comprehensive query to Supabase to fetch the board, its lists, cards, labels, members, and all nested data in one go.
    -   **Real-time Subscription**: A Supabase Realtime channel is subscribed to for the specific board. Any change in the database (e.g., another user moving a card) triggers an event that causes the `BoardPage` to refetch its data, ensuring the UI is always up-to-date.
4.  **User Interaction**:
    -   When a user performs an action (e.g., dragging a card, adding a comment), the client-side handler in `TrelloBoard.tsx` is invoked.
    -   The handler first performs an **optimistic UI update**. It modifies the local state immediately to make the application feel instantaneous.
    -   It then sends the update request to the Supabase API.
    -   If the API call fails, the optimistic update is reverted, and an error toast is shown. If it succeeds, the change is persisted, and the real-time event (which is also received by the user who made the change) ensures final data consistency.

---

## Setup and Installation

Follow these steps to get the project running locally.

### Prerequisites

-   Node.js (v18 or later)
-   npm or yarn
-   A free [Supabase account](https://supabase.com/dashboard)

### 1. Backend Setup (Supabase)

1.  **Create a Supabase Project**:
    -   Go to the [Supabase Dashboard](https://supabase.com/dashboard) and click "New project".
    -   Give your project a name and a strong database password.
    -   Choose a region and click "Create project".

2.  **Get API Credentials**:
    -   In your new project's dashboard, navigate to **Project Settings** (the gear icon) > **API**.
    -   Find your **Project URL** and the **`anon` public key**. You will need these for the frontend setup.

3.  **Set up the Database Schema**:
    -   Navigate to the **SQL Editor** in the Supabase dashboard.
    -   Click **+ New query**.
    -   Copy the entire content of the SQL script below and paste it into the editor. This script will create all the necessary tables, functions, triggers, and security policies.
    -   Click **RUN**.

    ```sql
    -- Create Tables
    CREATE TABLE public.users (
        id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        full_name text,
        avatar_url text,
        email text
    );

    CREATE TABLE public.boards (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        name text NOT NULL,
        background_config jsonb,
        is_closed boolean NOT NULL DEFAULT false,
        created_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE public.board_members (
        board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        role text NOT NULL DEFAULT 'member',
        created_at timestamp with time zone DEFAULT now(),
        PRIMARY KEY (board_id, user_id)
    );

    CREATE TABLE public.lists (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
        title text NOT NULL,
        position double precision NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE public.cards (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        list_id uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
        content text NOT NULL,
        description text,
        position double precision NOT NULL,
        is_completed boolean NOT NULL DEFAULT false,
        cover_config jsonb,
        start_date timestamp with time zone,
        due_date timestamp with time zone,
        created_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE public.labels (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
        name text,
        color text NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE public.card_labels (
        card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
        label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
        PRIMARY KEY (card_id, label_id)
    );

    CREATE TABLE public.card_comments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        content text NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE public.checklists (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
        title text NOT NULL,
        position double precision NOT NULL,
        created_at timestamp with time zone DEFAULT now()
    );

    CREATE TABLE public.checklist_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        checklist_id uuid NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
        content text NOT NULL,
        is_completed boolean NOT NULL DEFAULT false,
        position double precision NOT NULL,
        created_at timestamp with time zone DEFAULT now()
    );

    CREATE TABLE public.card_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
        file_path text NOT NULL,
        file_name text NOT NULL,
        file_type text,
        created_at timestamp with time zone DEFAULT now()
    );

    CREATE TABLE public.card_relations (
        card1_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
        card2_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
        PRIMARY KEY (card1_id, card2_id)
    );

    CREATE TABLE public.notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        type text NOT NULL,
        data jsonb,
        is_read boolean NOT NULL DEFAULT false,
        created_at timestamp with time zone NOT NULL DEFAULT now()
    );

    -- Create Storage Buckets
    -- You must do this manually in the Supabase Dashboard under Storage.
    -- Create a bucket named `board-backgrounds` with public access.
    -- Create a bucket named `card-attachments` with public access.
    -- Create a bucket named `card-covers` with public access.
    -- For production, you would want to set up proper RLS policies on these buckets.

    -- Create Functions
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      INSERT INTO public.users (id, email, full_name, avatar_url)
      VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
      );
      RETURN NEW;
    END;
    $$;

    CREATE OR REPLACE FUNCTION public.add_board_creator_as_admin()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    BEGIN
      IF NEW.user_id IS NOT NULL THEN
        INSERT INTO public.board_members (board_id, user_id, role)
        VALUES (NEW.id, NEW.user_id, 'admin');
      END IF;
      RETURN NEW;
    END;
    $$;

    -- Create Triggers
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

    CREATE TRIGGER on_board_created
      AFTER INSERT ON public.boards
      FOR EACH ROW EXECUTE FUNCTION public.add_board_creator_as_admin();

    -- Enable Row Level Security (RLS) on all tables
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.card_labels ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.card_comments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.card_attachments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.card_relations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

    -- Create RLS Policies
    -- (This is a simplified set of policies for demonstration. Production apps may need more granular rules.)
    CREATE POLICY "Public user data is viewable by everyone." ON public.users FOR SELECT USING (true);
    CREATE POLICY "Users can update their own data." ON public.users FOR UPDATE USING (auth.uid() = id);

    CREATE POLICY "Allow board creation" ON public.boards FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow viewing of public or member boards" ON public.boards FOR SELECT USING (user_id IS NULL OR (EXISTS ( SELECT 1 FROM board_members WHERE board_members.board_id = boards.id AND board_members.user_id = auth.uid())));
    CREATE POLICY "Admins can update board" ON public.boards FOR UPDATE USING ((EXISTS ( SELECT 1 FROM board_members WHERE board_members.board_id = boards.id AND board_members.user_id = auth.uid() AND board_members.role = 'admin')));
    CREATE POLICY "Admins can delete board" ON public.boards FOR DELETE USING ((EXISTS ( SELECT 1 FROM board_members WHERE board_members.board_id = boards.id AND board_members.user_id = auth.uid() AND board_members.role = 'admin')));

    CREATE POLICY "Members can view other members" ON public.board_members FOR SELECT USING ((EXISTS ( SELECT 1 FROM board_members bm WHERE bm.board_id = board_members.board_id AND bm.user_id = auth.uid())));
    CREATE POLICY "Admins can manage members" ON public.board_members FOR ALL USING ((EXISTS ( SELECT 1 FROM board_members bm WHERE bm.board_id = board_members.board_id AND bm.user_id = auth.uid() AND bm.role = 'admin')));

    CREATE POLICY "Members or public can manage lists" ON public.lists FOR ALL USING (board_id IN (SELECT id FROM boards WHERE user_id IS NULL) OR (EXISTS ( SELECT 1 FROM board_members WHERE board_members.board_id = lists.board_id AND board_members.user_id = auth.uid())));
    CREATE POLICY "Members or public can manage cards" ON public.cards FOR ALL USING (list_id IN (SELECT id FROM lists WHERE board_id IN (SELECT id FROM boards WHERE user_id IS NULL)) OR (EXISTS ( SELECT 1 FROM board_members bm JOIN lists l ON bm.board_id = l.board_id WHERE l.id = cards.list_id AND bm.user_id = auth.uid())));
    -- (Repeat similar broad policies for all other card-related tables: labels, comments, checklists, etc.)
    CREATE POLICY "Allow all access to card related tables for board members or public boards" ON public.card_labels FOR ALL USING (card_id IN (SELECT id FROM cards WHERE list_id IN (SELECT id FROM lists WHERE board_id IN (SELECT id FROM boards WHERE user_id IS NULL) OR (EXISTS ( SELECT 1 FROM board_members WHERE board_members.board_id = lists.board_id AND board_members.user_id = auth.uid())))));
    CREATE POLICY "Allow all access to labels for board members or public boards" ON public.labels FOR ALL USING (board_id IN (SELECT id FROM boards WHERE user_id IS NULL) OR (EXISTS ( SELECT 1 FROM board_members WHERE board_members.board_id = labels.board_id AND board_members.user_id = auth.uid())));
    CREATE POLICY "Allow commenting on accessible cards" ON public.card_comments FOR INSERT WITH CHECK (card_id IN (SELECT id FROM cards WHERE list_id IN (SELECT id FROM lists WHERE board_id IN (SELECT id FROM boards WHERE user_id IS NULL) OR (EXISTS ( SELECT 1 FROM board_members WHERE board_members.board_id = lists.board_id AND board_members.user_id = auth.uid())))));
    CREATE POLICY "Allow viewing comments on accessible cards" ON public.card_comments FOR SELECT USING (card_id IN (SELECT id FROM cards WHERE list_id IN (SELECT id FROM lists WHERE board_id IN (SELECT id FROM boards WHERE user_id IS NULL) OR (EXISTS ( SELECT 1 FROM board_members WHERE board_members.board_id = lists.board_id AND board_members.user_id = auth.uid())))));
    CREATE POLICY "Users can manage their own comments" ON public.card_comments FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can manage their own comments" ON public.card_comments FOR DELETE USING (auth.uid() = user_id);
    CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
    ```

4.  **Set up Environment Variables for Edge Functions**:
    -   This project uses an Edge Function to search the Unsplash API. You need to provide it with an API key.
    -   Go to [Unsplash Developers](https://unsplash.com/developers) and create an account/app to get an access key.
    -   In your Supabase project dashboard, go to **Edge Functions** > **(select your project)** > **Settings** > **Add new secret**.
    -   Create a secret named `UNSPLASH_ACCESS_KEY` and paste your Unsplash access key as the value.

### 2. Frontend Setup

1.  **Clone the Repository**:
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Create Environment File**:
    -   Create a file named `.env` in the root of the project.
    -   Add your Supabase API credentials to it:
    ```
    VITE_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
    VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
    ```
    -   Replace the placeholder values with the ones you copied from your Supabase project settings.

4.  **Run the Development Server**:
    ```bash
    npm run dev
    ```
    -   The application should now be running on `http://localhost:8080`.

---

## How to Develop

This project is structured to be easy to extend.

-   **Adding a New Component**: Create new `.tsx` files in `src/components`. If it's a general UI element, put it in `src/components/ui`. If it's specific to the Trello functionality, use `src/components/trello`.
-   **Adding a New Page**: Create a new page component in `src/pages` and add the route to `src/App.tsx`.
-   **Interacting with Supabase**: The Supabase client is initialized in `src/integrations/supabase/client.ts` and can be imported anywhere in the application. Use it to query your database, manage authentication, or call Edge Functions.
-   **Styling**: Use Tailwind CSS utility classes directly in your components for styling.
-   **Running Tests**: To run the test suite, use the command:
    ```bash
    npm test
    ```

Enjoy building!