import { Ellipsis, Landmark } from "lucide-react";
import type { FinAccountType } from "@/lib/store";
import { ACCOUNT_ICONS, CATEGORY_ICONS } from "./icon-map";

export function CategoryIcon({
  icon,
  className = "size-4",
}: {
  icon: string | undefined;
  className?: string;
}) {
  const Icon = (icon && CATEGORY_ICONS[icon]) || Ellipsis;
  return <Icon className={className} strokeWidth={1.75} />;
}

export function AccountIcon({
  type,
  className = "size-4",
}: {
  type: FinAccountType;
  className?: string;
}) {
  const Icon = ACCOUNT_ICONS[type] ?? Landmark;
  return <Icon className={className} strokeWidth={1.75} />;
}
