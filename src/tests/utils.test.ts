import { describe, it, expect } from 'vitest';
import { getBackgroundStyle, getCoverStyle } from '@/lib/utils';
import { BackgroundConfig, CoverConfig } from '@/types/trello';

describe('Utility Functions', () => {
  describe('getBackgroundStyle', () => {
    it('should return correct style for a color background', () => {
      const config: BackgroundConfig = { type: 'color', color: '#ff0000' };
      expect(getBackgroundStyle(config)).toEqual({ backgroundColor: '#ff0000' });
    });

    it('should return correct style for an image background', () => {
      const config: BackgroundConfig = {
        type: 'image',
        fullUrl: 'http://example.com/image.jpg',
        thumbUrl: 'http://example.com/thumb.jpg',
        userName: 'test',
        userLink: 'http://example.com',
      };
      expect(getBackgroundStyle(config)).toEqual({
        backgroundImage: 'url(http://example.com/image.jpg)',
      });
    });

    it('should return an empty object for null config', () => {
      expect(getBackgroundStyle(null)).toEqual({});
    });
  });

  describe('getCoverStyle', () => {
    it('should identify dark colors correctly', () => {
      const config: CoverConfig = { type: 'color', color: '#000000', size: 'header' };
      const { isDark } = getCoverStyle(config);
      expect(isDark).toBe(true);
    });

    it('should identify light colors correctly', () => {
      const config: CoverConfig = { type: 'color', color: '#ffffff', size: 'header' };
      const { isDark } = getCoverStyle(config);
      expect(isDark).toBe(false);
    });

    it('should always assume images are dark for text contrast', () => {
      const config: CoverConfig = {
        type: 'image',
        fullUrl: 'http://example.com/image.jpg',
        thumbUrl: 'http://example.com/thumb.jpg',
        userName: 'test',
        userLink: 'http://example.com',
        size: 'header',
      };
      const { isDark } = getCoverStyle(config);
      expect(isDark).toBe(true);
    });
  });
});