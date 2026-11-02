export type PageItem = number | 'gap';

/**
 * Page buttons to render: first, last and the current page with its
 * neighbours. A gap of exactly one page shows that page instead of an ellipsis.
 */
export function getPageItems(current: number, totalPages: number): PageItem[] {
  const pages = [...new Set([1, current - 1, current, current + 1, totalPages])]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  return pages.flatMap((page, index): PageItem[] => {
    const previous = pages[index - 1];
    if (previous === undefined || page - previous === 1) return [page];
    return page - previous === 2 ? [previous + 1, page] : ['gap', page];
  });
}
