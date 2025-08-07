import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { BackgroundConfig, CoverConfig } from '@/types/trello';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getPublicUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
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
      return { backgroundImage: `url(${getPublicUrl('board-backgrounds', config.path)})` };
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
      return { backgroundImage: `url(${getPublicUrl('board-backgrounds', config.path)})` };
    default:
      return {};
  }
}

export function getCoverStyle(config: CoverConfig): { style: React.CSSProperties, isDark: boolean } {
  if (!config) return { style: {}, isDark: false };

  let style: React.CSSProperties = {};
  let isDark = false;

  switch (config.type) {
    case 'image':
      style = { backgroundImage: `url(${config.fullUrl})` };
      isDark = true;
      break;
    case 'color':
      style = { backgroundColor: config.color };
      const hex = config.color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      isDark = brightness < 128;
      break;
    case 'custom-image':
      style = { backgroundImage: `url(${getPublicUrl('card-covers', config.path)})` };
      isDark = true;
      break;
  }
  return { style, isDark };
}