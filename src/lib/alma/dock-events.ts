export const ALMA_OPEN_DOCK_EVENT = "alma:open-dock";

export interface AlmaDockOpenDetail {
  subject?: string;
  instantLine?: string;
  readyReplies?: string[];
  trigger?: HTMLElement | null;
}

export function openAlmaDock(detail: AlmaDockOpenDetail = {}): void {
  window.dispatchEvent(
    new CustomEvent<AlmaDockOpenDetail>(ALMA_OPEN_DOCK_EVENT, { detail }),
  );
}