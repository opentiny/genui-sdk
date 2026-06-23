import { describe, expect, it } from 'vitest';
import {
  findBuilderCardById,
  groupBuilderHistoryFromCards,
  type IBuilderHistoryRecord,
} from '../builder-history-utils';
import type { IBuilderCardMessageItem } from '../builder-schema-utils';

function createCard(overrides: Partial<IBuilderCardMessageItem> = {}): IBuilderCardMessageItem {
  return {
    type: 'builder-card',
    id: 'card-1',
    title: 'Demo',
    input: 'create a page',
    schema: '{"componentName":"Page","children":[{"componentName":"Text","props":{"text":"Demo"}}]}',
    createdTime: '2026-06-22 10:30:00',
    ...overrides,
  };
}

describe('findBuilderCardById', () => {
  it('finds a card in assistant messages', () => {
    const card = createCard({ id: 'target-id' });
    const messages = [
      { role: 'user', messages: [] },
      { role: 'assistant', messages: [card] },
    ];

    expect(findBuilderCardById(messages, 'target-id')).toBe(card);
  });

  it('returns null when card id is missing', () => {
    expect(findBuilderCardById([], 'missing')).toBeNull();
  });
});

describe('groupBuilderHistoryFromCards', () => {
  it('groups cards by date and sorts records by time descending', () => {
    const cards = [
      createCard({ id: 'older', createdTime: '2026-06-22 09:00:00' }),
      createCard({ id: 'newer', createdTime: '2026-06-22 11:00:00' }),
    ];

    const groups = groupBuilderHistoryFromCards(cards);
    expect(groups).toHaveLength(1);
    expect(groups[0].dateKey).toBe('2026/06/22');
    expect(groups[0].records.map((record: IBuilderHistoryRecord) => record.id)).toEqual(['newer', 'older']);
  });
});
