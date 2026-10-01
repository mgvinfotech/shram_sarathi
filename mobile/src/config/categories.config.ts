/**
 * SINGLE SOURCE OF TRUTH for all provider categories.
 *
 * Each category defines:
 *  - slug          : matches DB value & API param
 *  - label / labelHi : display name
 *  - emoji         : icon shown in UI
 *  - dedicatedScreen : if set, this category bypasses the generic
 *                      skill-selector and goes straight to its own screen
 *  - hasSkills     : whether sub-category/skills API should be called
 */

export interface CategoryConfig {
  slug: string;
  label: string;
  labelHi: string;
  emoji: string;
  /** Navigation screen name for the dedicated setup screen (if any) */
  dedicatedScreen?: string;
  /** Button label when shown in EditProfile redirect card */
  manageBtnEn?: string;
  manageBtnHi?: string;
  /** Description shown on redirect card */
  manageMsgEn?: string;
  manageMsgHi?: string;
  hasSkills: boolean;
}

export const CATEGORY_CONFIG: CategoryConfig[] = [
  {
    slug: 'majdoor',
    label: 'Labour',
    labelHi: 'मजदूर',
    emoji: '👷',
    hasSkills: true,
  },
  {
    slug: 'karigar',
    label: 'Artisan',
    labelHi: 'कारीगर',
    emoji: '🔧',
    hasSkills: true,
  },
  {
    slug: 'krishi_yantra',
    label: 'Krishi Yantra',
    labelHi: 'कृषि यंत्र',
    emoji: '🚜',
    hasSkills: true,
  },
  {
    slug: 'nirman_machine',
    label: 'Nirman Machine',
    labelHi: 'निर्माण मशीनें',
    emoji: '🏚️',
    hasSkills: true,
  },
  {
    slug: 'thekedar',
    label: 'Contractor',
    labelHi: 'ठेकेदार',
    emoji: '🏗️',
    dedicatedScreen: 'ContractorKyc',
    manageBtnEn: 'Manage Contractor Profile',
    manageBtnHi: 'ठेकेदार प्रोफाइल मैनेज करें',
    manageMsgEn: 'Your contractor details (firm name, base rate, bank etc.) are managed in a dedicated screen.',
    manageMsgHi: 'आपकी ठेकेदार प्रोफाइल (फर्म नाम, रेट, बैंक) एक अलग स्क्रीन में मैनेज होती है।',
    hasSkills: false,
  },
  {
    slug: 'taxi',
    label: 'Driver / Taxi',
    labelHi: 'ड्राइवर / टैक्सी',
    emoji: '🚕',
    dedicatedScreen: 'VehicleOwnerSetup',
    manageBtnEn: 'Manage Vehicle Profile',
    manageBtnHi: 'वाहन प्रोफाइल मैनेज करें',
    manageMsgEn: 'Your vehicle details (number, rate, driver etc.) are managed in a dedicated screen.',
    manageMsgHi: 'आपकी वाहन प्रोफाइल (गाड़ी नंबर, रेट, ड्राइवर) एक अलग स्क्रीन में मैनेज होती है।',
    hasSkills: false,
  },
  {
    slug: 'transport',
    label: 'Transport',
    labelHi: 'ट्रांसपोर्ट',
    emoji: '🚛',
    dedicatedScreen: 'VehicleOwnerSetup',
    manageBtnEn: 'Manage Vehicle Profile',
    manageBtnHi: 'वाहन प्रोफाइल मैनेज करें',
    manageMsgEn: 'Your vehicle details (number, rate, driver etc.) are managed in a dedicated screen.',
    manageMsgHi: 'आपकी वाहन प्रोफाइल (गाड़ी नंबर, रेट, ड्राइवर) एक अलग स्क्रीन में मैनेज होती है।',
    hasSkills: false,
  },
];

/** Quick lookup by slug */
export const getCategoryConfig = (slug: string): CategoryConfig | undefined =>
  CATEGORY_CONFIG.find((c) => c.slug === slug);

/** Resolve raw category string to standard slug */
export const resolveCategorySlug = (rawCategory: string): string => {
  if (!rawCategory) return '';
  const lower = rawCategory.toLowerCase();
  const found = CATEGORY_CONFIG.find(
    (c) => c.slug === lower || c.label.toLowerCase() === lower || c.labelHi.toLowerCase() === lower
  );
  if (found) return found.slug;
  if (lower.includes('labour') || lower.includes('majdoor') || lower.includes('construction')) return 'majdoor';
  if (lower.includes('karigar') || lower.includes('artisan')) return 'karigar';
  if (lower.includes('thekedar') || lower.includes('contractor')) return 'thekedar';
  if (lower.includes('driver')) return 'driver';
  if (lower.includes('transport')) return 'transport';
  return lower;
};

/** Only categories that use the generic skill-selector (shown as chips in ProviderSetup / EditProfile) */
export const SKILL_CATEGORIES = CATEGORY_CONFIG.filter((c) => c.hasSkills);

/** Categories that have their own dedicated setup screen */
export const DEDICATED_CATEGORIES = CATEGORY_CONFIG.filter((c) => !!c.dedicatedScreen);
