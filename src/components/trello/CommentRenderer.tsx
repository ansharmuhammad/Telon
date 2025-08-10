import React from 'react';

type CommentRendererProps = {
  content: string;
};

export const CommentRenderer = ({ content }: CommentRendererProps) => {
  const mentionRegex = /@\[(.*?)\]\(user:(.*?)\)/g;

  const parts = content.split(mentionRegex);

  return (
    <p>
      {parts.map((part, index) => {
        if (index % 3 === 1) {
          // This is the display name of the mention
          return (
            <span key={index} className="bg-blue-100 text-blue-800 font-semibold rounded px-1 py-0.5">
              @{part}
            </span>
          );
        }
        if (index % 3 === 2) {
          // This is the user ID, we don't render it
          return null;
        }
        // This is a regular text part
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </p>
  );
};