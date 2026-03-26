import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ResolutionOverlay } from './ResolutionOverlay';

const mockUseAnimation = vi.fn();

vi.mock('./AnimationContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./AnimationContext')>();
  return {
    ...actual,
    useAnimation: () => mockUseAnimation(),
  };
});

vi.mock('framer-motion', () => {
  const passthrough = ({ children, ...props }: any) => React.createElement('div', props, children);
  return {
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
    motion: {
      div: passthrough,
    },
  };
});

describe('ResolutionOverlay', () => {
  beforeEach(() => {
    mockUseAnimation.mockReset();
  });

  it('renders action-card settlement as a centered blocking modal', () => {
    mockUseAnimation.mockReturnValue({
      currentAnimation: {
        id: 'resolve-1',
        type: 'resolve_effect',
        payload: {
          targetType: 'character',
          targetId: 'boy_student',
          cardIds: ['card-1'],
          cards: [
            {
              id: 'card-1',
              cardTemplateId: 'mastermind_forbid_goodwill',
              owner: 'mastermind',
              targetType: 'character',
              targetId: 'boy_student',
              faceUp: true,
              playedBySeat: '0',
            },
          ],
          effects: [
            { kind: 'forbidden', cardId: 'card-1', reason: '禁止移动：被能力封锁' },
          ],
        },
      },
      displayedG: {
        v1: {
          playedCards: [
            {
              id: 'card-1',
              cardTemplateId: 'mastermind_forbid_goodwill',
              owner: 'mastermind',
              targetType: 'character',
              targetId: 'boy_student',
              faceUp: true,
              playedBySeat: '0',
            },
          ],
        },
      },
    });

    const html = renderToStaticMarkup(<ResolutionOverlay />);

    expect(html).toContain('data-resolution-overlay="sequence-modal"');
    expect(html).toContain('男学生 受到限制效果');
    expect(html).toContain('脚本家友好禁止');
    expect(html).toContain('/assets/行动卡面/脚本家友好禁止.png');
    expect(html).not.toContain('/assets/卡背/card_back_剧作家.png');
    expect(html).not.toContain('行动卡结算');
    expect(html).not.toContain('当前焦点');
  });

  it('shows resolve_move settlement copy in the sequence modal', () => {
    mockUseAnimation.mockReturnValue({
      currentAnimation: {
        id: 'resolve-2',
        type: 'resolve_move',
        payload: {
          targetKey: 'character:boy_student',
          targetType: 'character',
          targetId: 'boy_student',
          charId: 'boy_student',
          from: 'hospital',
          to: 'school',
          cardIds: ['card-2'],
          cards: [
            {
              id: 'card-2',
              cardTemplateId: 'mastermind_move_vertical',
              owner: 'mastermind',
              targetType: 'character',
              targetId: 'boy_student',
              faceUp: true,
              playedBySeat: '0',
            },
          ],
        },
      },
      displayedG: {
        v1: {
          playedCards: [],
        },
      },
    });

    const html = renderToStaticMarkup(<ResolutionOverlay />);

    expect(html).toContain('data-resolution-overlay="sequence-modal"');
    expect(html).toContain('执行位移结果');
    expect(html).toContain('男学生：医院 → 学校');
    expect(html).toContain('脚本家移动上下');
    expect(html).toContain('/assets/行动卡面/脚本家移动上下.png');
  });
});
