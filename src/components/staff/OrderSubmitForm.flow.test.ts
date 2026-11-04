// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../messages/en/brand.json';
import type { UploadOutcome } from '@/lib/outbox';
import type { PendingOrder } from '@/lib/staff/orderStore';
import type { FormDraft } from './orderForm';

const uploadOrder = vi.hoisted(() => vi.fn<(order: PendingOrder) => Promise<UploadOutcome<PendingOrder>>>());
vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ userId: 'user_a' }) }));
vi.mock('@/lib/presignedUpload', () => ({ uploadOrder }));
vi.mock('@/lib/staff/pageCache', () => ({ reloadFromServer: async () => {} }));
vi.mock('@/lib/telemetry', () => ({ sendTelemetry: () => {} }));
// Shrinking a photo needs a canvas: here the photo just comes back.
vi.mock('@/lib/compressImage', () => ({ compressImage: async (file: Blob) => file }));
// next/image checks its parent's CSS, which happy-dom doesn't apply.
vi.mock('next/image', async () => {
  const { createElement } = await import('react');
  return { default: ({ src, alt }: { src: string; alt: string }) => createElement('img', { src, alt }) };
});

const submit = messages.submit;
const APPS = [
  { id: 'app-1', name: 'Jahez' },
  { id: 'app-2', name: 'Keeta' },
];
const DRAFT_ID = 'user_a:demo';

// Loaded afresh for each test: the outbox lives at module level.
let React: typeof import('react');
let ReactDOM: typeof import('react-dom/client');
let NextIntl: typeof import('next-intl');
let OrderSubmitForm: typeof import('./OrderSubmitForm').default;
let orderStore: typeof import('@/lib/staff/orderStore');

let container: HTMLDivElement;
let unmount: (() => void) | undefined;
let confirmAnswer = true;
const confirm = vi.fn(() => confirmAnswer);
const alert = vi.fn();

beforeEach(async () => {
  vi.resetModules();
  globalThis.indexedDB = new IDBFactory();
  // Uploads never finish: what the form saved stays on the phone to be looked at.
  uploadOrder.mockReset().mockReturnValue(new Promise(() => {}));
  confirmAnswer = true;
  confirm.mockClear();
  alert.mockClear();
  Object.assign(window, { confirm, alert });
  // Photos read back from fake-indexeddb aren't happy-dom Blobs, which its createObjectURL insists on.
  let previews = 0;
  Object.assign(URL, { createObjectURL: () => `blob:test/${++previews}`, revokeObjectURL: () => {} });
  React = await import('react');
  ReactDOM = await import('react-dom/client');
  NextIntl = await import('next-intl');
  OrderSubmitForm = (await import('./OrderSubmitForm')).default;
  orderStore = await import('@/lib/staff/orderStore');
});

afterEach(() => {
  unmount?.();
  unmount = undefined;
  container?.remove();
});

const until = (check: () => void | Promise<void>) => vi.waitFor(check, { timeout: 3_000 });

/** Renders the screen; resolves once the draft check is done (the form, or the question about an old draft). */
async function render(apps = APPS) {
  container = document.createElement('div');
  document.body.append(container);
  const root = ReactDOM.createRoot(container);
  const intl = { locale: 'en', timeZone: 'Asia/Riyadh', messages: { brand: messages } } as unknown as ComponentProps<
    typeof NextIntl.NextIntlClientProvider
  >;
  const form = React.createElement(OrderSubmitForm, { userId: 'user_a', brandId: 'brand-1', brandSlug: 'demo', apps });
  root.render(React.createElement(NextIntl.NextIntlClientProvider, intl, form));
  unmount = () => root.unmount();
  await until(() => expect(field('number')?.disabled === false || text().includes(submit.draftFound)).toBe(true));
}

const text = () => container.textContent ?? '';
const field = (name: 'number' | 'amount' | 'notes') => container.querySelector<HTMLInputElement>(`[id$="${name}"]`);
const buttons = (label: string) => [...container.querySelectorAll('button')].filter((b) => b.textContent?.includes(label));
const button = (label: string) => buttons(label)[0];
const saveButton = () => container.querySelector<HTMLButtonElement>('button[aria-disabled]')!;
const photos = () => container.querySelectorAll('img');

/** Types into a field the way a keyboard does, so React sees the change. */
function type(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** The camera hands the page a photo for one tile. */
function takePhoto(slot: 'opened' | 'sealed', lastModified = Date.now()) {
  const input = container.querySelector(`[id$="${slot}"]`)!.parentElement!.querySelector<HTMLInputElement>('input[type="file"]')!;
  const file = new File(['photo'], `${slot}.jpg`, { type: 'image/jpeg', lastModified });
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

const refused = (id: string, overrides: Partial<PendingOrder>): PendingOrder => ({
  id,
  userId: 'user_a',
  brandId: 'brand-1',
  brandSlug: 'demo',
  orderNumber: id,
  deliveryAppId: 'app-1',
  subtotal: '37.95',
  currency: 'SAR',
  sealedBlob: new Blob(['s']),
  openedBlob: new Blob(['o']),
  createdAt: 1_000,
  attempts: 1,
  failed: true,
  lastError: 'upload-urls: Order number already exists for this branch',
  ...overrides,
});

const draft = (overrides: Partial<FormDraft>): FormDraft => ({
  id: DRAFT_ID,
  orderNumber: '77',
  amount: '12',
  notes: '',
  deliveryAppId: 'app-2',
  openedBlob: new Blob(['o']),
  ...overrides,
});

describe('saving an order', () => {
  it('saves what was typed with Arabic digits and a decimal comma the way the server reads it', async () => {
    await render();
    takePhoto('opened');
    takePhoto('sealed');
    await until(() => expect(photos()).toHaveLength(2));
    button('Jahez').click();
    type(field('number')!, '#٤٥١٢');
    await until(() => expect(field('number')!.value).toBe('#4512'));
    type(field('amount')!, '37,95');
    await until(() => expect(text()).toContain('Will be saved as 37.95 SAR'));
    await until(() => expect(saveButton().textContent).toContain('Jahez · 4512 · 37.95 SAR'));

    saveButton().click();
    await until(() => expect(text()).toContain(submit.orderSaved));
    const [saved] = await orderStore.pendingOrders.getAll();
    expect(saved).toMatchObject({ orderNumber: '4512', subtotal: '37.95', deliveryAppId: 'app-1', userId: 'user_a', attempts: 0 });
    expect(saved.notes).toBeUndefined();

    // A tap skips the confirmation: the form is ready for the next order, with the same app.
    [...container.querySelectorAll('h2')].find((heading) => heading.textContent === submit.orderSaved)!.parentElement!.click();
    await until(() => expect(field('number')!.value).toBe(''));
    expect(photos()).toHaveLength(0);
    expect(button('Jahez').getAttribute('aria-pressed')).toBe('true');
    expect(text()).toContain('Last saved: 4512 at');
    await until(() => expect(text()).toContain('1 order waiting to upload'));
    // Nothing of the saved order can come back as a draft.
    expect(await orderStore.orderDrafts.get(DRAFT_ID)).toMatchObject({ orderNumber: '', amount: '', deliveryAppId: 'app-1' });
    expect((await orderStore.orderDrafts.get(DRAFT_ID))?.openedBlob).toBeUndefined();
  });

  it('says on Save what is missing, and brings the worker to it', async () => {
    await render();
    saveButton().click();
    expect(saveButton().textContent).toContain(submit.needOpenedPhoto);
    await until(() => expect(document.activeElement?.id).toMatch(/opened$/));

    takePhoto('opened');
    takePhoto('sealed');
    await until(() => expect(saveButton().textContent).toContain(submit.needDeliveryApp));
    saveButton().click();
    await until(() => expect(document.activeElement?.id).toMatch(/app$/));

    button('Keeta').click();
    type(field('number')!, '4512');
    type(field('amount')!, '3,7,9');
    await until(() => expect(saveButton().textContent).toContain(submit.amountInvalid));
    // Not said under the field while it is still being typed.
    expect(container.querySelector('[id$="amount-hint"]')).toBeNull();
    saveButton().click();
    await until(() => expect(container.querySelector('[id$="amount-hint"]')?.textContent).toBe(submit.amountInvalid));
    expect(document.activeElement).toBe(field('amount'));
    expect(field('amount')!.getAttribute('aria-invalid')).toBe('true');
    expect(await orderStore.pendingOrders.getAll()).toEqual([]);
  });

  it('warns about a photo file made long before, without refusing it', async () => {
    await render();
    takePhoto('opened', Date.now() - 3 * 60 * 60_000);
    await until(() => expect(text()).toContain('This photo was taken 3 hours ago.'));
    takePhoto('sealed');
    await until(() => expect(photos()).toHaveLength(2));
    const warnings = [...container.querySelectorAll('p:not(.sr-only)')].filter((p) => p.textContent?.includes('This photo was taken'));
    expect(warnings).toHaveLength(1);
  });
});

describe('drafts', () => {
  it('brings back a recent draft and says so; Clear empties the form and keeps the app', async () => {
    await orderStore.orderDrafts.save(draft({ savedAt: Date.now() - 5 * 60_000 }));
    await render();
    await until(() => expect(field('number')!.value).toBe('77'));
    expect(text()).toContain(submit.restoredOrder);
    expect(button('Keeta').getAttribute('aria-pressed')).toBe('true');
    expect(photos()).toHaveLength(1);

    button(submit.clearForm).click();
    expect(confirm).toHaveBeenCalledWith(submit.clearConfirm);
    await until(() => expect(field('number')!.value).toBe(''));
    await until(async () => expect(await orderStore.orderDrafts.get(DRAFT_ID)).toMatchObject({ orderNumber: '', deliveryAppId: 'app-2' }));
    expect((await orderStore.orderDrafts.get(DRAFT_ID))?.openedBlob).toBeUndefined();
  });

  it('asks about a draft older than 30 minutes before showing it', async () => {
    await orderStore.orderDrafts.save(draft({ savedAt: Date.now() - 2 * 60 * 60_000 }));
    await render();
    expect(text()).toContain(`${submit.draftFound} Last changed 2 hours ago.`);
    // Neither the form nor Save until the worker answers.
    expect(field('number')).toBeNull();
    expect(container.querySelector('button[aria-disabled]')).toBeNull();

    button(submit.draftContinue).click();
    await until(() => expect(field('number')!.value).toBe('77'));
    expect(text()).toContain(submit.restoredOrder);
    expect((await orderStore.orderDrafts.get(DRAFT_ID)) as FormDraft).toMatchObject({ orderNumber: '77' });
  });

  it('asks about a draft of unknown age too, and Start a new order deletes it', async () => {
    await orderStore.orderDrafts.save(draft({}));
    await render();
    expect(text()).toContain(submit.draftFound);
    expect(text()).not.toContain('Last changed');
    // Its age stays unknown when the form writes it back, not 1970.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(((await orderStore.orderDrafts.get(DRAFT_ID)) as FormDraft).savedAt).toBeUndefined();

    button(submit.draftDiscard).click();
    await until(() => expect(field('number')!.value).toBe(''));
    expect(photos()).toHaveLength(0);
    await until(async () => expect(await orderStore.orderDrafts.get(DRAFT_ID)).toMatchObject({ orderNumber: '' }));
  });

  it('ignores a delivery app the brand turned off since', async () => {
    await orderStore.orderDrafts.save(draft({ deliveryAppId: 'app-gone', savedAt: Date.now() }));
    await render();
    await until(() => expect(field('number')!.value).toBe('77'));
    expect(container.querySelector('[aria-pressed="true"]')).toBeNull();
  });

  it('remembers the camera is open, and says so if the phone closed the page meanwhile', async () => {
    await render();
    container.querySelector<HTMLButtonElement>('[id$="opened"]')!.click();
    await until(async () => expect(await orderStore.orderDrafts.get(DRAFT_ID)).toMatchObject({ capturing: 'opened' }));
    unmount!();
    unmount = undefined;
    container.remove();

    // The page reloads: the photo the camera took never arrived.
    await render();
    await until(() => expect(text()).toContain(submit.photoLost));
  });

  it('forgets the open camera once the worker closes it without a photo', async () => {
    await render();
    const tile = container.querySelector<HTMLButtonElement>('[id$="opened"]')!;
    tile.click();
    await until(async () => expect(await orderStore.orderDrafts.get(DRAFT_ID)).toMatchObject({ capturing: 'opened' }));
    tile.parentElement!.querySelector('input[type="file"]')!.dispatchEvent(new Event('cancel'));
    await until(async () => expect(((await orderStore.orderDrafts.get(DRAFT_ID)) as FormDraft | undefined)?.capturing).toBeUndefined());
  });
});

describe('refused orders', () => {
  beforeEach(async () => {
    await orderStore.pendingOrders.save(refused('o1', { orderNumber: '4512', errorCode: 'duplicate_order' }));
    await orderStore.pendingOrders.save(
      refused('o2', { orderNumber: '900', errorCode: 'invalid_input', errorField: 'subtotal', createdAt: 2_000 })
    );
  });

  it('are listed with their reason in the worker’s language, and removed only after asking', async () => {
    await render();
    await until(() => expect(text()).toContain("2 orders couldn't be uploaded"));
    button(submit.showFailed).click();
    await until(() => expect(text()).toContain(submit.failedReason.duplicate_order));
    expect(text()).toContain(submit.failedReason.invalid_input);
    // The server's own words stay in the logs.
    expect(text()).not.toContain('already exists');
    // Sending them again unchanged would only be refused again.
    expect(button(submit.retryFailed)).toBeUndefined();

    confirmAnswer = false;
    buttons(submit.removeOrder)[1].click();
    expect(confirm).toHaveBeenCalledWith("Remove order 900 and its photos from this phone? It won't be sent.");
    expect(await orderStore.pendingOrders.get('o2')).toBeDefined();
    confirmAnswer = true;
    buttons(submit.removeOrder)[1].click();
    await until(async () => expect((await orderStore.pendingOrders.getAll()).map((order) => order.id)).toEqual(['o1']));
  });

  it('are corrected in the form, photos included, and saved again under their own id', async () => {
    await render();
    await until(() => expect(button(submit.showFailed)).toBeDefined());
    button(submit.showFailed).click();
    await until(() => expect(button(submit.editOrder)).toBeDefined());
    button(submit.editOrder).click();
    await until(() => expect(field('number')!.value).toBe('4512'));
    expect(text()).toContain('Correcting order 4512');
    expect(text()).toContain(submit.failedReason.duplicate_order);
    expect(field('number')!.getAttribute('aria-invalid')).toBe('true');
    expect(photos()).toHaveLength(2);
    // Until the corrected order is saved, the refused one stays where it was.
    expect(await orderStore.pendingOrders.get('o1')).toMatchObject({ failed: true });

    type(field('number')!, '4521');
    await until(() => expect(saveButton().getAttribute('aria-disabled')).toBe('false'));
    saveButton().click();
    await until(async () =>
      expect(await orderStore.pendingOrders.get('o1')).toMatchObject({ orderNumber: '4521', createdAt: 1_000, attempts: 0 })
    );
    const corrected = await orderStore.pendingOrders.get('o1');
    expect(corrected?.failed).toBeUndefined();
    expect(corrected?.errorCode).toBeUndefined();
    await until(() => expect(uploadOrder).toHaveBeenCalledWith(expect.objectContaining({ id: 'o1', orderNumber: '4521' }), expect.anything()));
  });

  it('offer sending again only while none is being corrected', async () => {
    await orderStore.pendingOrders.save(refused('o3', { orderNumber: '77', errorCode: 'no_branch', createdAt: 3_000 }));
    await render();
    await until(() => expect(button(submit.showFailed)).toBeDefined());
    button(submit.showFailed).click();
    await until(() => expect(button(submit.retryFailed)).toBeDefined());
    button(submit.editOrder).click();
    await until(() => expect(field('number')!.value).toBe('4512'));
    button(submit.showFailed).click();
    await until(() => expect(button(submit.editingOrder)).toBeDefined());
    expect(button(submit.retryFailed)).toBeUndefined();
  });

  it('are saved under a new id when the refused copy was sent again meanwhile', async () => {
    await render();
    await until(() => expect(button(submit.showFailed)).toBeDefined());
    button(submit.showFailed).click();
    await until(() => expect(button(submit.editOrder)).toBeDefined());
    button(submit.editOrder).click();
    await until(() => expect(field('number')!.value).toBe('4512'));
    // E.g. another tab sent it again: it is waiting, not refused, and its upload will remove it when done.
    await orderStore.pendingOrders.save({ ...(await orderStore.pendingOrders.get('o1'))!, failed: false });

    type(field('number')!, '4521');
    await until(() => expect(saveButton().getAttribute('aria-disabled')).toBe('false'));
    saveButton().click();
    await until(async () => expect((await orderStore.pendingOrders.getAll()).some((order) => order.orderNumber === '4521')).toBe(true));
    const corrected = (await orderStore.pendingOrders.getAll()).find((order) => order.orderNumber === '4521')!;
    expect(corrected.id).not.toBe('o1');
    expect(await orderStore.pendingOrders.get('o1')).toMatchObject({ orderNumber: '4512' });
  });

  it('are not loaded over an order the worker is filling in', async () => {
    await render();
    takePhoto('opened');
    await until(() => expect(photos()).toHaveLength(1));
    button(submit.showFailed).click();
    await until(() => expect(button(submit.editOrder)).toBeDefined());
    button(submit.editOrder).click();
    expect(alert).toHaveBeenCalledWith(submit.editBusy);
    expect(field('number')!.value).toBe('');
  });
});
