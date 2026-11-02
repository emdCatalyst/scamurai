import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SERVICE_KEYS } from '@/config/services';
import { NAMESPACES } from './messages';
import { routing } from './routing';

const MESSAGES_DIR = path.resolve(__dirname, '../../messages');

function read(locale: string, namespace: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, locale, `${namespace}.json`), 'utf8'));
}

function keyPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key));
}

describe('messages', () => {
  it('has exactly one file per registered namespace in every locale', () => {
    for (const locale of routing.locales) {
      const files = fs.readdirSync(path.join(MESSAGES_DIR, locale)).filter((f) => f.endsWith('.json'));
      expect(files.map((f) => f.replace(/\.json$/, '')).sort()).toEqual([...NAMESPACES].sort());
    }
  });

  it.each([...NAMESPACES])('keeps "%s" keys identical across locales', (namespace) => {
    const [first, ...rest] = routing.locales.map((locale) => keyPaths(read(locale, namespace)).sort());
    for (const other of rest) expect(other).toEqual(first);
  });

  it('has no empty strings', () => {
    for (const locale of routing.locales) {
      for (const namespace of NAMESPACES) {
        const flat = keyPaths(read(locale, namespace));
        const data = read(locale, namespace);
        for (const keyPath of flat) {
          const value = keyPath.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], data);
          if (typeof value === 'string') expect(value.trim(), `${locale}/${namespace}:${keyPath}`).not.toBe('');
        }
      }
    }
  });

  it('describes every catalog service in every locale', () => {
    for (const locale of routing.locales) {
      const services = read(locale, 'services');
      for (const key of SERVICE_KEYS) {
        for (const field of ['name', 'tagline', 'summary']) {
          expect(services, `${locale}: services.${key}.${field}`).toHaveProperty([key, field]);
        }
      }
    }
  });
});
