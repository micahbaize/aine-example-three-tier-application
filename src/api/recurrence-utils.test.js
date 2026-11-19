const {
  parseRecurrencePattern,
  generateNextInstance,
  getNextOccurrence,
  generateRecurrenceInstances,
} = require('./recurrence-utils');

describe('Recurrence Utils', () => {
  describe('parseRecurrencePattern', () => {
    test('should parse daily pattern', () => {
      const pattern = parseRecurrencePattern('FREQ=DAILY;INTERVAL=1;COUNT=10');
      expect(pattern.freq).toBe('DAILY');
      expect(pattern.interval).toBe(1);
      expect(pattern.count).toBe(10);
    });

    test('should parse weekly pattern with days', () => {
      const pattern = parseRecurrencePattern('FREQ=WEEKLY;BYDAY=MO,WE,FR');
      expect(pattern.freq).toBe('WEEKLY');
      expect(pattern.byDay).toEqual(['MO', 'WE', 'FR']);
    });

    test('should handle invalid pattern', () => {
      expect(() => {
        parseRecurrencePattern('INVALID');
      }).toThrow('Invalid recurrence pattern');
    });
  });

  describe('generateNextInstance', () => {
    test('should generate next daily instance', () => {
      const task = {
        id: 1,
        title: 'Daily task',
        recurrencePattern: 'FREQ=DAILY;INTERVAL=1',
        scheduledFor: new Date('2024-01-01T10:00:00Z'),
      };

      const nextInstance = generateNextInstance(task);
      expect(nextInstance).toBeDefined();
      expect(nextInstance.title).toBe('Daily task');
      expect(nextInstance.scheduledFor.getDate()).toBe(2);
    });

    test('should generate next weekly instance', () => {
      const task = {
        id: 1,
        title: 'Weekly task',
        recurrencePattern: 'FREQ=WEEKLY;INTERVAL=1',
        scheduledFor: new Date('2024-01-01T10:00:00Z'),
      };

      const nextInstance = generateNextInstance(task);
      expect(nextInstance).toBeDefined();
      expect(nextInstance.scheduledFor.getDate()).toBe(8);
    });

    test('should generate next monthly instance', () => {
      const task = {
        id: 1,
        title: 'Monthly task',
        recurrencePattern: 'FREQ=MONTHLY;INTERVAL=1',
        scheduledFor: new Date('2024-01-15T10:00:00Z'),
      };

      const nextInstance = generateNextInstance(task);
      expect(nextInstance).toBeDefined();
      expect(nextInstance.scheduledFor.getMonth()).toBe(1); // February
    });

    test('should not generate instance if end date passed', () => {
      const task = {
        id: 1,
        title: 'Task',
        recurrencePattern: 'FREQ=DAILY;INTERVAL=1',
        scheduledFor: new Date('2024-01-31T10:00:00Z'),
        recurrenceEndDate: new Date('2024-01-31T11:00:00Z'),
      };

      const nextInstance = generateNextInstance(task);
      expect(nextInstance).toBeNull();
    });
  });

  describe('getNextOccurrence', () => {
    test('should get next occurrence with FREQ=DAILY', () => {
      const startDate = new Date('2024-01-01T10:00:00Z');
      const pattern = 'FREQ=DAILY;INTERVAL=2';

      const nextDate = getNextOccurrence(startDate, pattern);
      expect(nextDate).toBeDefined();
      expect(nextDate.getDate()).toBe(3);
    });

    test('should get next occurrence with FREQ=WEEKLY', () => {
      const startDate = new Date('2024-12-20T10:00:00Z');  // Friday
      const pattern = 'FREQ=WEEKLY;BYDAY=MO,WE,FR';
      
      const nextDate = getNextOccurrence(startDate, pattern);
      expect(nextDate).toBeDefined();
      // Should be Monday (2024-12-23)
      expect(nextDate.getDay()).toBe(1);
    });
  });

  describe('generateRecurrenceInstances', () => {
    test('should generate multiple instances', () => {
      const startDate = new Date('2024-01-01T10:00:00Z');
      const pattern = 'FREQ=DAILY;INTERVAL=1';

      const instances = generateRecurrenceInstances(startDate, pattern, 3);
      expect(instances).toHaveLength(3);
      expect(instances[0].getDate()).toBe(1);
      expect(instances[1].getDate()).toBe(2);
      expect(instances[2].getDate()).toBe(3);
    });

    test('should generate weekly instances starting Friday for MO,WE', () => {
      const startDate = new Date('2024-12-20T10:00:00Z');  // Friday
      const pattern = 'FREQ=WEEKLY;BYDAY=MO,WE';
      
      const instances = generateRecurrenceInstances(startDate, pattern, 2);
      expect(instances).toHaveLength(2);
      // First should be Monday (2024-12-23)
      expect(instances[0].getDay()).toBe(1);
      // Second should be Wednesday (2024-12-25)
      expect(instances[1].getDay()).toBe(3);
    });
  });
});
