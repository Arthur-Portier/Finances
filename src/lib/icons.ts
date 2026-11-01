import {
  ShoppingBasket, Shirt, Trophy, Home, UtensilsCrossed, Car, Gamepad2, Repeat, HeartPulse, Sparkles,
  Banknote, PiggyBank, Plane, Gift, GraduationCap, Dumbbell, Music, Smartphone, Coffee, Dog, Baby,
  Bike, Wrench, Fuel, BookOpen, Film, Wine, Wallet, Briefcase, Tag, type LucideIcon,
} from 'lucide-react'

export const ICONS: Record<string, LucideIcon> = {
  ShoppingBasket, Shirt, Trophy, Home, UtensilsCrossed, Car, Gamepad2, Repeat, HeartPulse, Sparkles,
  Banknote, PiggyBank, Plane, Gift, GraduationCap, Dumbbell, Music, Smartphone, Coffee, Dog, Baby,
  Bike, Wrench, Fuel, BookOpen, Film, Wine, Wallet, Briefcase, Tag,
}
export const iconFor = (name: string): LucideIcon => ICONS[name] ?? Tag
