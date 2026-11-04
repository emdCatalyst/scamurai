import { createElement, type ComponentProps } from 'react';
import { renderToString } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import brand from '../../../messages/ar/brand.json';
import OrderSubmitForm from './OrderSubmitForm';

// On the server, Clerk answers with the user the page is made for.
vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ userId: 'user_test' }) }));

function render(apps: ComponentProps<typeof OrderSubmitForm>['apps']) {
  const form = createElement(OrderSubmitForm, { userId: 'user_test', brandId: 'brand-1', brandSlug: 'demo', apps });
  // createElement's typing wants `children` among the props; it arrives as the third argument.
  const intl = { locale: 'ar', timeZone: 'Asia/Riyadh', messages: { brand } } as unknown as ComponentProps<typeof NextIntlClientProvider>;
  return renderToString(createElement(NextIntlClientProvider, intl, form));
}

describe('OrderSubmitForm', () => {
  it('renders the order screen on the server without the browser-only parts', () => {
    const html = render([{ id: 'app-1', name: 'Jahez' }, { id: 'app-2', name: 'Keeta' }]);
    expect(html).toContain(brand.submit.openedBag);
    expect(html).toContain(brand.submit.sealedBag);
    expect(html).toContain(brand.submit.submitOrder);
    expect(html).toContain('Jahez');
    expect(html).toContain('Keeta');
    // Nothing is said about uploads before the outbox has looked, but the row is there already.
    expect(html).not.toContain(brand.submit.allSent);
    expect(html).toContain('aria-live="polite"');
    // Until the draft check is done, nothing can be typed over.
    expect(html).toMatch(/<input id="[^"]*number"[^>]* disabled=""/);
  });

  it('says on the Save button what is missing first', () => {
    const html = render([{ id: 'app-1', name: 'Jahez' }]);
    expect(html).toContain(brand.submit.needOpenedPhoto);
    // A Save button that can't save yet stays tappable: it then shows the way.
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toMatch(/<button[^>]*aria-disabled="true"[^>]* disabled=""/);
  });

  it('chooses the only delivery app, and tells a brand without one to call the manager', () => {
    expect(render([{ id: 'app-1', name: 'Jahez' }])).toContain('aria-pressed="true"');
    expect(render([{ id: 'app-1', name: 'Jahez' }, { id: 'app-2', name: 'Keeta' }])).not.toContain('aria-pressed="true"');
    const none = render([]);
    expect(none).toContain(brand.submit.noDeliveryApps);
    expect(none).not.toContain('aria-pressed');
  });

  it('labels the fields for screen readers', () => {
    const html = render([{ id: 'app-1', name: 'Jahez' }]);
    for (const field of ['number', 'amount', 'notes']) {
      const id = html.match(new RegExp(`<(?:input|textarea) id="([^"]*${field})"`))?.[1];
      expect(id, field).toBeDefined();
      expect(html).toContain(`for="${id}"`);
    }
    // The amount is text, so Chrome can't drop "," or "٫": the keypad still shows digits.
    expect(html).toMatch(/<input id="[^"]*amount" type="text" inputMode="decimal"/);
  });
});
