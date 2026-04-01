import { cn } from "@/lib/utils";

interface TwoColumnLayoutProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  leftWidth?: number;
  stickyLeft?: boolean;
  className?: string;
}

const TwoColumnLayout = ({
  leftContent,
  rightContent,
  leftWidth = 280,
  stickyLeft = true,
  className,
}: TwoColumnLayoutProps) => {
  return (
    <div className={cn("flex flex-col md:flex-row h-full", className)}>
      {/* Left column */}
      <div
        className={cn(
          "w-full md:flex-shrink-0 border-b md:border-b-0 md:border-r border-border bg-background p-6 overflow-y-auto",
          stickyLeft && "md:sticky md:top-0 md:h-[calc(100vh-64px)]"
        )}
        style={{ maxWidth: undefined }}
      >
        <div className="md:hidden">{leftContent}</div>
        <div className="hidden md:block" style={{ width: leftWidth }}>
          {leftContent}
        </div>
      </div>

      {/* Right column */}
      <div className="flex-1 min-w-0 overflow-y-auto p-6">
        {rightContent}
      </div>
    </div>
  );
};

export default TwoColumnLayout;
