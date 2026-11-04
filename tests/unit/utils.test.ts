import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  calculatePercentageChange,
  cn,
} from '../../src/lib/utils';

describe('Yardımcı Fonksiyonlar (Utils) Testleri', () => {
  describe('calculatePercentageChange', () => {
    it('Artış durumunda pozitif yüzde hesaplamalı', () => {
      const change = calculatePercentageChange(150, 100);
      expect(change).toBe(50);
    });

    it('Azalış durumunda negatif yüzde hesaplamalı', () => {
      const change = calculatePercentageChange(80, 100);
      expect(change).toBe(-20);
    });

    it('Önceki değer 0 ve mevcut değer pozitifse %100 dönmeli', () => {
      const change = calculatePercentageChange(100, 0);
      expect(change).toBe(100);
    });

    it('Her iki değer de 0 ise 0 dönmeli', () => {
      const change = calculatePercentageChange(0, 0);
      expect(change).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('Sayısal tutarı TL para birimi formatına dönüştürmeli', () => {
      const formatted = formatCurrency(1250.5);
      expect(formatted).toContain('1.250,50');
      expect(formatted).toContain('₺');
    });
  });

  describe('cn (Tailwind classnames)', () => {
    it('Sınıfları doğru birleştirmeli ve çakışanları ezmeli', () => {
      const result = cn('px-2 py-1', 'px-4', { 'bg-red-500': true, 'text-white': false });
      expect(result).toBe('py-1 px-4 bg-red-500');
    });
  });
});
