'use client';

import { useTranslations, useFormatter } from 'next-intl';
import { Circle, CheckCircle2, Clock } from 'lucide-react';

interface TimelineEvent {
  status: 'pending' | 'quoted' | 'approved' | 'rejected';
  timestamp: Date;
  actor: string;
  note?: string;
}

interface StatusTimelineProps {
  events: TimelineEvent[];
}

export default function StatusTimeline({ events }: StatusTimelineProps) {
  const t = useTranslations('admin.applications.timeline');
  const format = useFormatter();

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-slate-900 px-1">{t('title')}</h3>
      
      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent">
        {events.map((event, index) => (
          <div key={index} className="relative flex items-start group">
            <div className="flex items-center justify-center w-10 h-10 mx-2 rounded-full bg-white border-2 border-slate-200 shrink-0 z-10 group-last:border-sky/50">
              {event.status === 'approved' ? (
                <CheckCircle2 size={18} className="text-mint-500" />
              ) : event.status === 'pending' ? (
                <Clock size={18} className="text-amber-500" />
              ) : (
                <Circle size={10} className="fill-slate-400 text-slate-400" />
              )}
            </div>
            
            <div className="flex-1 ml-4 pt-0.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-slate-800">
                  {t(`status.${event.status}`)}
                </p>
                <time className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  {format.dateTime(event.timestamp, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </time>
              </div>
              
              <p className="text-xs text-slate-500">
                {t('by')} <span className="font-semibold text-slate-700">{event.actor}</span>
              </p>
              
              {/*event.note && (
                <div className="mt-2 p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600 italic">
                  "{event.note}"
                </div>
              )*/}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
