import { ReactNode } from "react";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: { label: string; to?: string }[];
  actions?: ReactNode;
}

/**
 * Unified header for every admin page.
 * Provides a consistent breadcrumb + h1 + optional action area.
 */
export const AdminPageHeader = ({ title, description, breadcrumb, actions }: AdminPageHeaderProps) => {
  const items = [{ label: "Admin", to: "/admin" }, ...(breadcrumb ?? []), { label: title }];
  return (
    <div className="space-y-3 mb-6">
      <PageBreadcrumb items={items} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
};

export default AdminPageHeader;
