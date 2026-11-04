import { createElement, type ComponentProps } from 'react';
import { renderToString } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import brand from '../../../messages/en/brand.json';
import { BrandLoginForm } from './BrandLoginForm';

vi.mock('@clerk/nextjs', () => ({ useClerk: () => ({ client: undefined, setActive: async () => {} }) }));

describe('BrandLoginForm', () => {
  const intl = { locale: 'en', timeZone: 'Asia/Riyadh', messages: { brand } } as unknown as ComponentProps<typeof NextIntlClientProvider>;
  const html = renderToString(createElement(NextIntlClientProvider, intl, createElement(BrandLoginForm, { brandSlug: 'demo' })));

  it('asks workers on a shared phone not to let the browser keep their password', () => {
    expect(html).toContain(brand.login.sharedDeviceHint.replace(/'/g, '&#x27;'));
    // The standard hint stays: "off" is ignored on sign-in forms, and "new-password" makes iOS invent one.
    expect(html).toContain('autoComplete="current-password"');
  });

  it('names the show-password button, and makes it big enough to tap', () => {
    expect(html).toContain(`aria-label="${brand.login.showPassword}"`);
    expect(html).toMatch(/<button[^>]*class="[^"]*h-11 w-11[^"]*"[^>]*aria-label|aria-label="[^"]*"[^>]*class="[^"]*h-11 w-11/);
  });
});
