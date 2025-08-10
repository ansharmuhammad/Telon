import React from 'react';

type CommentRendererProps = {
  content: string;
};

export const CommentRenderer = ({ content }: CommentRendererProps) => {
  const mentionRegex = /@\[(.*?)\]\((user|group):(.*?)?\)/g;

  const [mainContent, mentionPart] = content.split('\n\nMentions: ');

  const renderTextWithMentions = (text: string) => {
    if (!text) return null;
    const parts = text.split(mentionRegex);

    return (
      <>
        {parts.map((part, index) => {
          if (index % 4 === 1) { // Display name
            const mentionType = parts[index + 2]; // 'user' or 'group'
            const isGroup = mentionType === 'group';
            return (
              <span
                key={index}
                className={isGroup
                  ? "bg-purple-100 text-purple-800 font-semibold rounded px-1 py-0.5"
                  : "bg-blue-100 text-blue-800 font-semibold rounded px-1 py-0.5"
                }
              >
                @{part}
              </span>
            );
          }
          if (index % 4 === 2 || index % 4 === 3 || index % 4 === 0 && parts.length > 1 && index > 0) {
            // This is the type, id, or the empty string between mentions.
            return null;
          }
          // Regular text part
          return <React.Fragment key={index}>{part}</React.Fragment>;
        })}
      </>
    );
  };

  const renderMainText = (text: string) => {
    const parts = text.split(mentionRegex);
    return parts.map((part, index) => {
      if (index % 4 === 0) {
        return <React.Fragment key={index}>{part}</React.Fragment>;
      }
      return null;
    }).filter(Boolean);
  }

  return (
    <div>
      <p>{renderMainText(mainContent)}</p>
      {mentionPart && (
        <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-1 text-xs">
          <span className="text-muted-foreground">Mentioned:</span>
          {renderTextWithMentions(mentionPart)}
        </div>
      )}
    </div>
  );
};