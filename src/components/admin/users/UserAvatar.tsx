'use client';

interface UserAvatarProps {
  name: string;
  className?: string;
}

export function UserAvatar({ name, className = '' }: UserAvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return (
    <div className={`flex items-center justify-center rounded-xl bg-navy text-white font-bold text-sm shadow-sm shrink-0 ${className}`}>
      {initials}
    </div>
  );
}
