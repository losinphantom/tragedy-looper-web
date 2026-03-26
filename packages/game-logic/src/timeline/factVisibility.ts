import { z } from 'zod';

const timelineAudienceValues = ['public', 'mastermind', 'seat-private'] as const;

export const TimelineAudienceSchema = z.enum(timelineAudienceValues);

function validateSeatAudience(
  value: { audience: z.infer<typeof TimelineAudienceSchema>; seatIds: string[] },
  ctx: z.RefinementCtx,
): void {
  if (value.audience === 'seat-private' && value.seatIds.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'seat-private visibility requires at least one seat id',
      path: ['seatIds'],
    });
  }

  if (value.audience !== 'seat-private' && value.seatIds.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'seatIds are only allowed for seat-private visibility',
      path: ['seatIds'],
    });
  }
}

export const TimelineFieldVisibilitySchema = z.object({
  audience: TimelineAudienceSchema,
  seatIds: z.array(z.string().min(1)).default([]),
}).superRefine(validateSeatAudience);

export const TimelineVisibilitySchema = z.object({
  audience: TimelineAudienceSchema,
  seatIds: z.array(z.string().min(1)).default([]),
  fieldOverrides: z.record(z.string().min(1), TimelineFieldVisibilitySchema).default({}),
}).superRefine(validateSeatAudience);

export type TimelineAudience = z.infer<typeof TimelineAudienceSchema>;
export type TimelineFieldVisibility = z.infer<typeof TimelineFieldVisibilitySchema>;
export type TimelineVisibility = z.infer<typeof TimelineVisibilitySchema>;

export function createPublicTimelineVisibility(): TimelineVisibility {
  return TimelineVisibilitySchema.parse({
    audience: 'public',
  });
}

export function createMastermindTimelineVisibility(): TimelineVisibility {
  return TimelineVisibilitySchema.parse({
    audience: 'mastermind',
  });
}

export function createSeatPrivateTimelineVisibility(seatIds: string[]): TimelineVisibility {
  return TimelineVisibilitySchema.parse({
    audience: 'seat-private',
    seatIds,
  });
}

export function canViewerSeeTimelineVisibility(
  visibility: TimelineVisibility,
  viewerSeat: string | null,
  isMastermind: boolean,
): boolean {
  if (isMastermind) return true;
  if (visibility.audience === 'public') return true;
  if (visibility.audience === 'mastermind') return false;
  return viewerSeat != null && visibility.seatIds.includes(viewerSeat);
}
