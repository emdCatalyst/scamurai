import type { ReactNode } from 'react';

interface StepCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

/** Frame for the one thing the admin should do next with an application. */
export default function StepCard({ title, description, children }: StepCardProps) {
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-5 space-y-4">
      <div>
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        <p className="mt-1 text-sm text-slate-600 leading-relaxed">{description}</p>
      </div>
      {children}
    </div>
  );
}
