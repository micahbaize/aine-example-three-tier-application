'use client';

import React, { useState } from 'react';
import { CalendarDay } from '../actions';

interface CalendarProps {
  days: CalendarDay[];
  onDateClick: (date: string) => void;
}

export const Calendar: React.FC<CalendarProps> = ({ days, onDateClick }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysByDate = new Map(
    days.map((day) => [day.date, day])
  );

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1));
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
          >
            ←
          </button>
          <button
            onClick={nextMonth}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center font-semibold text-slate-400 text-xs py-2"
          >
            {day}
          </div>
        ))}

        {calendarDays.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayData = daysByDate.get(dateStr);

          return (
            <button
              key={dateStr}
              onClick={() => onDateClick(dateStr)}
              className="aspect-square bg-slate-700 hover:bg-slate-600 rounded-lg p-1 text-xs flex flex-col items-center justify-center transition-colors cursor-pointer border border-slate-600 hover:border-blue-500"
            >
              <div className="font-semibold text-white">{day}</div>
              {dayData && (
                <div className="mt-1 text-slate-300">
                  <div className="text-xs">
                    {dayData.completed_count}/{dayData.task_count}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
