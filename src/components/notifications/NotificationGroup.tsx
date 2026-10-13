import { NotificationItem, type NotificationData } from "./NotificationItem";

interface Props {
  label: string;
  items: NotificationData[];
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export const NotificationGroup = ({ label, items, onMarkRead, onDelete }: Props) => (
  <section aria-label={label}>
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2 mt-6 first:mt-0">
      {label}
    </p>
    <div className="space-y-2">
      {items.map((n) => (
        <NotificationItem
          key={n.id}
          notification={n}
          onMarkRead={onMarkRead}
          onDelete={onDelete}
        />
      ))}
    </div>
  </section>
);
