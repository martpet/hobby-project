import { Alert } from "@/shared/types.ts";

interface PageAlertsProps {
  items: Alert[];
}

export function PageAlerts({ items }: PageAlertsProps) {
  return (
    <div class="page-alerts">
      {items.map(({ type, content }) => {
        const id = `alert-${Math.random().toString(36).slice(2, 8)}`;

        return (
          <dialog open id={id} class={type}>
            {content}
            <button
              class="plain"
              title="Close"
              commandfor={id}
              command="close"
            >
              ×
            </button>
          </dialog>
        );
      })}
    </div>
  );
}
