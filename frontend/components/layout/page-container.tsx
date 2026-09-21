import type { ReactNode } from "react";

import { Topbar } from "@/components/layout/topbar";

export function PageContainer({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <Topbar title={title} />
      <main className="flex-1 space-y-6 p-4 lg:p-6">
        {actions && <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>}
        {children}
      </main>
    </>
  );
}
