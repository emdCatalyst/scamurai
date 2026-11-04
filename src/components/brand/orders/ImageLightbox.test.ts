// @vitest-environment happy-dom
import { createElement, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import brand from '../../../../messages/ar/brand.json';
import ImageLightbox from './ImageLightbox';

let root: Root | undefined;
let container: HTMLDivElement;

afterEach(() => {
  root?.unmount();
  root = undefined;
  container.remove();
  vi.restoreAllMocks();
});

function render(props: Partial<ComponentProps<typeof ImageLightbox>>) {
  const intl = { locale: 'ar', timeZone: 'Asia/Riyadh', messages: { brand } } as unknown as ComponentProps<typeof NextIntlClientProvider>;
  const element = createElement(NextIntlClientProvider, intl, createElement(ImageLightbox, { src: null, alt: 'photo', onClose: () => {}, ...props }));
  if (!root) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }
  root.render(element);
}

const until = (check: () => void) => vi.waitFor(check);
const dialog = () => container.querySelector('[role="dialog"]');

describe('ImageLightbox', () => {
  it('opens as a dialog on its Close button, in the page language, and gives the focus back', async () => {
    const opener = document.body.appendChild(document.createElement('button'));
    opener.focus();
    render({ src: 'blob:photo' });
    await until(() => expect(dialog()).not.toBeNull());
    expect(dialog()!.getAttribute('aria-modal')).toBe('true');
    const close = container.querySelector(`[aria-label="${brand.submit.closePhoto}"]`);
    expect(document.activeElement).toBe(close);

    render({ src: null });
    await until(() => expect(dialog()).toBeNull());
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('closes with Escape', async () => {
    const onClose = vi.fn();
    render({ src: 'blob:photo', onClose });
    await until(() => expect(dialog()).not.toBeNull());
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('on the staff screen, closes with the phone’s Back button instead of leaving the page', async () => {
    const pushState = vi.spyOn(history, 'pushState');
    const back = vi.spyOn(history, 'back').mockImplementation(() => {});
    const onClose = vi.fn();
    render({ src: 'blob:photo', onClose, closeOnBack: true });
    await until(() => expect(pushState).toHaveBeenCalledTimes(1));

    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(back).not.toHaveBeenCalled();
  });

  it('takes its history entry off again when closed on screen, and offers Retake', async () => {
    vi.spyOn(history, 'pushState');
    const back = vi.spyOn(history, 'back').mockImplementation(() => {});
    const onClose = vi.fn();
    const onRetake = vi.fn();
    render({ src: 'blob:photo', onClose, onRetake, closeOnBack: true });
    await until(() => expect(dialog()).not.toBeNull());

    container.querySelector<HTMLButtonElement>(`[aria-label="${brand.submit.closePhoto}"]`)!.click();
    expect(back).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();

    [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(brand.submit.retake))!.click();
    expect(onRetake).toHaveBeenCalledTimes(1);
  });
});
