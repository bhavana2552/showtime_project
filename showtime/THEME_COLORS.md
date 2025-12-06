# Showtime Theme Color Palette

This document defines the color palette used throughout the Showtime application.

## Color Palette

Based on: https://colorhunt.co/palette/19183b708993a1c2bde7f2ef

### Primary Colors

- **Dark Blue (Background)**: `#19183B`
  - Use for: Main backgrounds, dark sections
  - Tailwind: `bg-[#19183B]` or `from-[#19183B]` for gradients

- **Muted Blue-Gray (Secondary)**: `#708993`
  - Use for: Secondary text, borders, subtle accents
  - Tailwind: `text-[#708993]`, `border-[#708993]`

- **Seafoam Green (Accent)**: `#A1C2BD`
  - Use for: Primary buttons, links, highlights, accents
  - Tailwind: `bg-[#A1C2BD]`, `text-[#A1C2BD]`, `border-[#A1C2BD]`
  - Hover variant: `#8FB3AD` (slightly darker)

- **Light Mint (Foreground)**: `#E7F2EF`
  - Use for: Primary text, light backgrounds on dark
  - Tailwind: `text-[#E7F2EF]`, `bg-[#E7F2EF]`

## Usage Guidelines

### Text Colors
- Primary text: `text-[#E7F2EF]`
- Secondary text: `text-[#708993]`
- Accent text (links, highlights): `text-[#A1C2BD]`

### Background Colors
- Main background: `bg-[#19183B]` or gradient `bg-gradient-to-b from-[#19183B] via-[#1a1a3d] to-[#1b1b3f]`
- Card/section background: `bg-[#19183B]/70` or `bg-[#19183B]/60` (with opacity)
- Light background (for contrast): `bg-[#E7F2EF]` with `text-[#19183B]`

### Border Colors
- Default borders: `border-[#708993]/30` or `border-[#A1C2BD]/20`
- Accent borders: `border-[#A1C2BD]/40`

### Button Colors
- Primary button: `bg-[#A1C2BD] text-[#19183B] hover:bg-[#8FB3AD]`
- Secondary button: `border border-[#A1C2BD]/40 text-[#A1C2BD] hover:border-[#A1C2BD] hover:text-[#E7F2EF]`
- Light button: `bg-[#E7F2EF] text-[#19183B] hover:bg-[#D0E5E0]`

### Shadow Colors
- Accent shadows: `shadow-[#A1C2BD]/20` or `shadow-[0_20px_50px_rgba(161,194,189,0.15)]`

## CSS Variables

The colors are also defined in `app/globals.css`:
- `--background: #19183B`
- `--foreground: #E7F2EF`
- `--accent: #A1C2BD`
- `--secondary: #708993`
- `--dark: #19183B`

## Important Notes

- **DO NOT** use red colors (`red-500`, `red-400`, etc.) - these have been replaced
- **DO NOT** use generic colors like `text-white`, `bg-black`, `text-zinc-*` - use the theme colors instead
- Always use the hex values with Tailwind arbitrary values: `text-[#E7F2EF]` instead of generic classes
- For opacity, use Tailwind's opacity syntax: `bg-[#A1C2BD]/20` for 20% opacity
