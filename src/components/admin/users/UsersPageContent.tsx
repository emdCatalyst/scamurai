'use client';

import { useState } from 'react';
import { UsersFilterBar } from './UsersFilterBar';
import { UsersTable } from './UsersTable';
import { UsersPagination } from './UsersPagination';
import { UserDetailDrawer } from './UserDetailDrawer';
import { AnimatePresence } from 'framer-motion';
import { UserRow } from '@/lib/queries/users';

interface UsersPageContentProps {
  users: UserRow[];
  total: number;
  counts: Record<string, number>;
  status: string;
  role: string;
  search: string;
  sort: string;
  page: number;
  pageSize: number;
  brandId?: string;
  brands?: { id: string, name: string }[];
}

export function UsersPageContent({
  users,
  total,
  counts,
  status,
  role,
  search,
  sort,
  page,
  pageSize,
  brandId,
  brands,
}: UsersPageContentProps) {
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  return (
    <div className="space-y-6 pb-20">
      <UsersFilterBar
        counts={counts}
        currentStatus={status}
        currentRole={role}
        currentSearch={search}
        currentSort={sort}
        currentBrandId={brandId}
        brands={brands}
      />

      <div className="px-4 md:px-0">
        <UsersTable
          users={users}
          onDetailOpen={setSelectedUser}
        />
      </div>

      <UsersPagination
        total={total}
        pageSize={pageSize}
        currentPage={page}
      />

      <AnimatePresence mode="wait">
        {selectedUser && (
          <UserDetailDrawer
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
