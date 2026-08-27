interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode; // action buttons
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex gap-2 mt-2 sm:mt-0">{children}</div>}
    </div>
  );
}
