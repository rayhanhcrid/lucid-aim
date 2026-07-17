import {
  Flower2,
  Laptop,
  Droplets,
  BookOpen,
  Dumbbell,
  Footprints,
  PenLine,
  Apple,
  Sunrise,
  Moon,
  HeartPulse,
  Coffee,
  Music,
  Camera,
  Sparkles,
  Brain,
  Palette,
  Wallet,
  Users,
  Bike,
  type LucideIcon,
} from "lucide-react";

// Map both keyword slugs and legacy emoji → Lucide icons (iOS SF-Symbols feel).
const MAP: Record<string, LucideIcon> = {
  // slugs
  meditation: Flower2,
  work: Laptop,
  water: Droplets,
  book: BookOpen,
  gym: Dumbbell,
  walk: Footprints,
  journal: PenLine,
  food: Apple,
  morning: Sunrise,
  night: Moon,
  heart: HeartPulse,
  coffee: Coffee,
  music: Music,
  camera: Camera,
  spark: Sparkles,
  mind: Brain,
  art: Palette,
  money: Wallet,
  people: Users,
  bike: Bike,
  // legacy emoji → same icon
  "🧘": Flower2,
  "💻": Laptop,
  "💧": Droplets,
  "📖": BookOpen,
  "🏋️": Dumbbell,
  "🚶": Footprints,
  "✍️": PenLine,
  "🥗": Apple,
  "🌅": Sunrise,
  "🌙": Moon,
};

export const ICON_KEYS = [
  "meditation","work","water","book","gym","walk","journal","food",
  "morning","night","heart","coffee","music","camera","spark","mind",
  "art","money","people","bike",
] as const;

export function HabitIcon({
  name,
  className = "size-4",
  strokeWidth = 1.75,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = MAP[name] || Sparkles;
  return <Icon className={className} strokeWidth={strokeWidth} />;
}