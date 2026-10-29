'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import SuperAdminNav from '../../components/superadmin/SuperAdminNav';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/superadmin/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col lg:flex-row">
      <SuperAdminNav />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
