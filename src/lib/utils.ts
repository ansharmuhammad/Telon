import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { BackgroundConfig } from '@/types/trello';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getPublicUrl(path: string) {
  const { data } = supabase.storage.from('board-backgrounds').getPublicUrl(path);
  return data.publicUrl;
}

export function getBackgroundStyle(config: BackgroundConfig): React.CSSProperties {
  if (!config) return {};

  switch (config.type) {
    case 'image':
      return { backgroundImage: `url(${config.fullUrl})` };
    case 'color':
      return { backgroundColor: config.color };
    case 'custom-image':
      return { backgroundImage: `url(${getPublicUrl(config.path)})` };
    default:
      return {};
  }
}

export function getBackgroundThumbnailStyle(config: BackgroundConfig): React.CSSProperties {
  if (!config) return {};

  switch (config.type) {
    case 'image':
      return { backgroundImage: `url(${config.thumbUrl})` };
    case 'color':
      return { backgroundColor: config.color };
    case 'custom-image':
      return { backgroundImage: `url(${getPublicUrl(config.path)})` };
    default:
      return {};
  }
}