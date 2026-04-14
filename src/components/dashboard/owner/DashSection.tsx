import React, { memo } from "react";

interface DashSectionProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

const DashSection = memo(({ title, action, children }: DashSectionProps) => (
  <div className="animate-fade-in">
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-body text-base font-semibold">{title}</h2>
      {action}
    </div>
    {children}
  </div>
));

DashSection.displayName = "DashSection";
export default DashSection;
