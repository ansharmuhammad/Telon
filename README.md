# Trello Clone - A React & Supabase Project

Welcome to this Trello Clone application, built with React, TypeScript, and Supabase. This project demonstrates how to build a real-time, interactive, drag-and-drop task management board.

## Key Features

*   **Real-time Collaboration**: Changes made by one user are instantly visible to others thanks to Supabase Realtime subscriptions.
*   **Drag & Drop**: Reorder cards and lists seamlessly using `@atlaskit/pragmatic-drag-and-drop`.
*   **Authentication**: Secure user authentication handled by Supabase Auth, including options for social providers or simple email/password.
*   **Rich Card Details**: Cards can have descriptions, labels, checklists, attachments, due dates, and covers.
*   **Dynamic Backgrounds**: Users can customize board backgrounds with colors or images from Unsplash.
*   **Global Search**: Quickly find cards across all your boards.
*   **Notifications**: Get notified when you are invited to a board or mentioned in a comment.

## Tech Stack

*   **Frontend**: React, TypeScript, Vite
*   **Styling**: Tailwind CSS with shadcn/ui components
*   **Backend & Database**: Supabase (Auth, Postgres Database, Storage, Edge Functions)
*   **Routing**: React Router
*   **State Management**: React Query for server state, `useState`/`useContext` for client state.
*   **Drag & Drop**: `@atlaskit/pragmatic-drag-and-drop`
*   **Testing**: Vitest & React Testing Library

## Project Structure

```
/
├── public/             # Static assets
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── layout/     # Header, search, etc.
│   │   ├── trello/     # Core Trello components (Board, List, Card)
│   │   └── ui/         # shadcn/ui components
│   ├── contexts/       # React contexts (e.g., AuthContext)
│   ├── hooks/          # Custom React hooks
│   ├── integrations/   # Supabase client setup
│   ├── lib/            # Utility functions
│   ├── pages/          # Top-level page components
│   └── types/          # TypeScript type definitions
├── supabase/           # Supabase-specific files
│   └── functions/      # Edge Functions
└── README.md
```

## Getting Started

1.  **Environment Variables**: Ensure you have a `.env` file with your Supabase project URL and anon key.
2.  **Install Dependencies**: Run `npm install`.
3.  **Run Development Server**: Run `npm run dev`.