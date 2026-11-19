'use client';

import React, { useState } from 'react';

export interface RecurrencePattern {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  endType: 'never' | 'count' | 'until';
  endValue?: string;
}

interface RecurrenceFormProps {
  onSubmit: (pattern: RecurrencePattern) => void;
  onCancel: () => void;
}

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;

export const RecurrenceForm: React.FC<RecurrenceFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [frequency, setFrequency] = useState<RecurrencePattern['frequency']>(
    'DAILY'
  );
  const [interval, setInterval] = useState(1);
  const [endType, setEndType] = useState<RecurrencePattern['endType']>('never');
  const [endValue, setEndValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      frequency,
      interval,
      endType,
      endValue: endType !== 'never' ? endValue : undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-slate-800 p-4 rounded-lg border border-slate-700"
    >
      <h3 className="text-sm font-semibold text-white">Recurrence Pattern</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Frequency
          </label>
          <select
            value={frequency}
            onChange={(e) =>
              setFrequency(e.target.value as RecurrencePattern['frequency'])
            }
            className="w-full px-2 py-1 bg-slate-700 text-white text-xs rounded border border-slate-600 focus:outline-none focus:border-blue-500"
          >
            {FREQUENCIES.map((freq) => (
              <option key={freq} value={freq}>
                {freq}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Interval (every X)
          </label>
          <input
            type="number"
            min="1"
            max="365"
            value={interval}
            onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
            className="w-full px-2 py-1 bg-slate-700 text-white text-xs rounded border border-slate-600 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-300 mb-2">
          Recurrence Ends
        </label>
        <div className="space-y-2">
          <label className="flex items-center text-xs">
            <input
              type="radio"
              value="never"
              checked={endType === 'never'}
              onChange={(e) =>
                setEndType(e.target.value as RecurrencePattern['endType'])
              }
              className="mr-2"
            />
            <span className="text-slate-300">Never</span>
          </label>

          <label className="flex items-center text-xs">
            <input
              type="radio"
              value="count"
              checked={endType === 'count'}
              onChange={(e) =>
                setEndType(e.target.value as RecurrencePattern['endType'])
              }
              className="mr-2"
            />
            <span className="text-slate-300 mr-2">After</span>
            {endType === 'count' && (
              <input
                type="number"
                min="1"
                max="365"
                value={endValue}
                onChange={(e) => setEndValue(e.target.value)}
                className="w-16 px-1 py-0 bg-slate-700 text-white text-xs rounded border border-slate-600"
                placeholder="10"
              />
            )}
            {endType === 'count' && (
              <span className="text-slate-300 ml-1">occurrences</span>
            )}
          </label>

          <label className="flex items-center text-xs">
            <input
              type="radio"
              value="until"
              checked={endType === 'until'}
              onChange={(e) =>
                setEndType(e.target.value as RecurrencePattern['endType'])
              }
              className="mr-2"
            />
            <span className="text-slate-300 mr-2">Until</span>
            {endType === 'until' && (
              <input
                type="date"
                value={endValue}
                onChange={(e) => setEndValue(e.target.value)}
                className="px-1 py-0 bg-slate-700 text-white text-xs rounded border border-slate-600"
              />
            )}
          </label>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
