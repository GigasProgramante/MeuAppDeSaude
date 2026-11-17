export const colors = {
  brand: {
    primary: '#0F3A60',
    primaryHover: '#164B7A',
    primarySoft: '#EBF3FA',
    teal: '#0F766E',
    tealSoft: '#CCFBF1',
  },
  surface: {
    canvas: '#F5F7FA',
    card: '#FFFFFF',
    subtle: '#EEF2F6',
    overlay: 'rgba(15, 23, 42, 0.56)',
  },
  border: {
    default: '#DCE3EC',
    strong: '#94A3B8',
  },
  text: {
    primary: '#0F172A',
    secondary: '#334155',
    muted: '#64748B',
    inverse: '#FFFFFF',
  },
  semantic: {
    success: '#15803D',
    successBg: '#ECFDF5',
    successBorder: '#86EFAC',
    warning: '#B45309',
    warningBg: '#FFFBEB',
    warningBorder: '#FCD34D',
    danger: '#B91C1C',
    dangerBg: '#FEF2F2',
    dangerBorder: '#FCA5A5',
    info: '#1D4ED8',
    infoBg: '#EFF6FF',
    infoBorder: '#93C5FD',
  },
  areas: {
    psicologia: { color: '#6D28D9', bg: '#F5F3FF' },
    enfermagem: { color: '#BE123C', bg: '#FFF1F2' },
    farmacia: { color: '#047857', bg: '#ECFDF5' },
    corpoMovimento: { color: '#0E7490', bg: '#ECFEFF' },
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800' as const,
    color: colors.text.primary,
  },
  h1: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800' as const,
    color: colors.text.primary,
  },
  h2: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  h3: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '400' as const,
    color: colors.text.secondary,
  },
  bodyCompact: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
    color: colors.text.secondary,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600' as const,
    color: colors.text.muted,
  },
} as const;

export const layout = {
  maxWidthForm: 680,
  maxWidthGrid: 960,
  minTouchTarget: 44,
  minButtonHeight: 48,
} as const;

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  modal: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
