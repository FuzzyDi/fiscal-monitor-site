const {
  generateStateKey,
  calculateMaxSeverity,
  isStale,
  validateSnapshot
} = require('../utils/helpers');

describe('Helper Functions', () => {
  
  describe('generateStateKey', () => {
    test('generates key with all parameters', () => {
      const key = generateStateKey('1234567890', '1', '2');
      expect(key).toBe('1234567890:1:2');
    });

    test('uses 0 for undefined shop number', () => {
      const key = generateStateKey('1234567890', undefined, '2');
      expect(key).toBe('1234567890:0:2');
    });

    test('uses 0 for undefined pos number', () => {
      const key = generateStateKey('1234567890', '1', undefined);
      expect(key).toBe('1234567890:1:0');
    });

    test('uses 0 for both undefined numbers', () => {
      const key = generateStateKey('1234567890', null, null);
      expect(key).toBe('1234567890:0:0');
    });
  });

  describe('calculateMaxSeverity', () => {
    test('returns null for empty alerts', () => {
      expect(calculateMaxSeverity([])).toBeNull();
      expect(calculateMaxSeverity(null)).toBeNull();
    });

    test('returns CRITICAL when present', () => {
      const alerts = [
        { severity: 'INFO' },
        { severity: 'CRITICAL' },
        { severity: 'WARN' }
      ];
      expect(calculateMaxSeverity(alerts)).toBe('CRITICAL');
    });

    test('returns DANGER when no CRITICAL', () => {
      const alerts = [
        { severity: 'INFO' },
        { severity: 'DANGER' },
        { severity: 'WARN' }
      ];
      expect(calculateMaxSeverity(alerts)).toBe('DANGER');
    });

    test('returns WARN when no CRITICAL or DANGER', () => {
      const alerts = [
        { severity: 'INFO' },
        { severity: 'WARN' }
      ];
      expect(calculateMaxSeverity(alerts)).toBe('WARN');
    });

    test('handles case-insensitive severity', () => {
      const alerts = [{ severity: 'critical' }];
      expect(calculateMaxSeverity(alerts)).toBe('CRITICAL');
    });

    test('ignores invalid severity levels', () => {
      const alerts = [
        { severity: 'INVALID' },
        { severity: 'WARN' }
      ];
      expect(calculateMaxSeverity(alerts)).toBe('WARN');
    });
  });

  describe('isStale', () => {
    test('returns false for recent timestamp', () => {
      const now = new Date();
      expect(isStale(now, 15)).toBe(false);
    });

    test('returns true for old timestamp', () => {
      const old = new Date(Date.now() - 20 * 60 * 1000); // 20 minutes ago
      expect(isStale(old, 15)).toBe(true);
    });

    test('returns false at exact threshold', () => {
      const exact = new Date(Date.now() - 15 * 60 * 1000); // Exactly 15 minutes ago
      expect(isStale(exact, 15)).toBe(false);
    });

    test('works with custom minutes', () => {
      const old = new Date(Date.now() - 35 * 60 * 1000); // 35 minutes ago
      expect(isStale(old, 30)).toBe(true);
      expect(isStale(old, 40)).toBe(false);
    });
  });

  describe('validateSnapshot', () => {
    test('validates correct snapshot', () => {
      const snapshot = { shopInn: '1234567890' };
      const result = validateSnapshot(snapshot);
      expect(result.valid).toBe(true);
    });

    test('rejects missing shopInn', () => {
      const snapshot = { shopNumber: 1 };
      const result = validateSnapshot(snapshot);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('shopInn');
    });

    test('rejects null snapshot', () => {
      const result = validateSnapshot(null);
      expect(result.valid).toBe(false);
    });

    test('rejects non-string shopInn', () => {
      const snapshot = { shopInn: 12345 };
      const result = validateSnapshot(snapshot);
      expect(result.valid).toBe(false);
    });
  });
});
