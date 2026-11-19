const {
  parseRecurrencePattern,
  generateNextInstance,
  getNextOccurrence,
  generateRecurrenceInstances
} = require('./recurrence-utils');

describe('Recurrence Utils', () => {
  describe('parseRecurrencePattern', () => {
    test('should parse daily pattern', () => {
      const pattern = 'FREQ=DAILY';
      const result = parseRecurrencePattern(pattern);
      expect(result).toBeDefined();
      expect(result.freq).toBe('DAILY');
    });

    test('should parse weekly pattern with days', () => {
      const pattern = 'FREQ=WEEKLY;BYDAY=MO,WE,FR';
      const result = parseRecurrencePattern(pattern);
      expect(result).toBeDefined();
      expect(result.freq).toBe('WEEKLY');
      expect(result.byDay).toContain('MO');
    });

    test('should handle invalid pattern', () => {
      const pattern = 'INVALID';
      expect(() => parseRecurrencePattern(pattern)).toThrow();
    });
  });

  describe('generateNextInstance', () => {
    test('should generate next daily instance', () => {
      const task = {
        id: 1,
        title: 'Daily Task',
        recurrencePattern: 'FREQ=DAILY',
        scheduledFor: new Date('2024-12-20T10:00:00Z'),
        dueDate: new Date('2024-12-20T11:00:00Z')
      };

      const nextInstance = generateNextInstance(task);
      expect(nextInstance).toBeDefined();
      expect(nextInstance.parentTaskId).toBe(task.id);
      expect(nextInstance.scheduledFor.getDate()).toBe(21);
    });

    test('should generate next weekly instance', () => {
      const task = {
        id: 1,
        title: 'Weekly Task',
        recurrencePattern: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
        scheduledFor: new Date('2024-12-20T10:00:00Z'),  // Friday
        dueDate: new Date('2024-12-20T11:00:00Z')
      };

      const nextInstance = generateNextInstance(task);
      expect(nextInstance).toBeDefined();
      // Should be Monday (2024-12-23)
      expect(nextInstance.scheduledFor.getDay()).toBe(1);
    });

    test('should generate next monthly instance', () => {
      const task = {
        id: 1,
        title: 'Monthly Task',
        recurrencePattern: 'FREQ=MONTHLY;BYMONTHDAY=15',
        scheduledFor: new Date('2024-12-15T10:00:00Z'),
        dueDate: new Date('2024-12-15T11:00:00Z')
      };

      const nextInstance = generateNextInstance(task);
      expect(nextInstance).toBeDefined();
      // Should be Jan 15
      expect(nextInstance.scheduledFor.getMonth()).toBe(0);
      expect(nextInstance.scheduledFor.getDate()).toBe(15);
    });

    test('should not generate instance if end date passed', () => {
      const task = {
        id: 1,
        title: 'Expired Task',
        recurrencePattern: 'FREQ=DAILY',
        recurrenceEndDate: new Date('2024-12-20T10:00:00Z'),
        scheduledFor: new Date('2024-12-20T10:00:00Z'),
        dueDate: new Date('2024-12-20T11:00:00Z')
      };

      const nextInstance = generateNextInstance(task);
      expect(nextInstance).toBeNull();
    });
  });

  describe('getNextOccurrence', () => {
    test('should get next occurrence with FREQ=DAILY', () => {
      const startDate = new Date('2024-12-20T10:00:00Z');
      const pattern = 'FREQ=DAILY;COUNT=5';
      
      const nextDate = getNextOccurrence(startDate, pattern);
      expect(nextDate).toBeDefined();
      expect(nextDate.getDate()).toBe(21);
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
      const startDate = new Date('2024-12-20T10:00:00Z');
      const pattern = 'FREQ=DAILY;COUNT=3';
      
      const instances = generateRecurrenceInstances(startDate, pattern, 3);
      expect(instances).toHaveLength(3);
      expect(instances[0].getDate()).toBe(20);
      expect(instances[1].getDate()).toBe(21);
      expect(instances[2].getDate()).toBe(22);
    });

    test('should generate weekly instances', () => {
      const startDate = new Date('2024-12-20T10:00:00Z');  // Friday
      const pattern = 'FREQ=WEEKLY;BYDAY=MO,WE';
      
      const instances = generateRecurrenceInstances(startDate, pattern, 2);
      expect(instances).toHaveLength(2);
      // First should be Wednesday (2024-12-25)
      expect(instances[0].getDay()).toBe(3);
      // Second should be Monday (2024-12-30)
      expect(instances[1].getDay()).toBe(1);
    });
  });
});

// Example usage
if (require.main === module) {
  console.log('Testing recurrence utilities...');
  
  // Test 1: Parse a daily pattern
  console.log('\n1. Parse daily pattern:');
  const dailyPattern = parseRecurrencePattern('FREQ=DAILY');
  console.log(dailyPattern);
  
  // Test 2: Generate next instance for daily task
  console.log('\n2. Generate next instance (Daily):');
  const dailyTask = {
    id: 1,
    title: 'Daily Standup',
    recurrencePattern: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR',
    scheduledFor: new Date('2024-12-20T09:30:00Z'),
    dueDate: new Date('2024-12-20T10:00:00Z')
  };
  const nextDaily = generateNextInstance(dailyTask);
  console.log(nextDaily);
  
  // Test 3: Generate instances
  console.log('\n3. Generate multiple instances:');
  const startDate = new Date('2024-12-20T10:00:00Z');
  const instances = generateRecurrenceInstances(startDate, 'FREQ=DAILY;COUNT=5', 5);
  console.log(instances.map(d => d.toISOString()));
}
