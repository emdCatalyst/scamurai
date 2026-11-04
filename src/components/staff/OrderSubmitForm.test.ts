import { createElement, type ComponentProps } from 'react';
import { renderToString } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import brand from '../../../messages/ar/brand.json';
import OrderSubmitForm from './OrderSubmitForm';

describe('OrderSubmitForm', () => {
  it('renders the order screen on the server without the browser-only parts', () => {
    const form = createElement(OrderSubmitForm, {
      userId: 'user_test',
      brandId: 'brand-1',
      brandSlug: 'demo',
      apps: [{ id: 'app-1', name: 'Jahez' }],
    });
    // createElement's typing wants `children` among the props; it arrives as the third argument.
    const intl = { locale: 'ar', timeZone: 'Asia/Riyadh', messages: { brand } } as unknown as ComponentProps<typeof NextIntlClientProvider>;
    const html = renderToString(createElement(NextIntlClientProvider, intl, form));
    expect(html).toContain(brand.submit.openedBag);
    expect(html).toContain(brand.submit.sealedBag);
    expect(html).toContain(brand.submit.submitOrder);
    expect(html).toContain('Jahez');
    // Nothing is waiting before the outbox has looked.
    expect(html).not.toContain('role="status"');
  });
});
