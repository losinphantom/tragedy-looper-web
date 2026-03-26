import { z } from 'zod';

export const ResultAnnouncementPayloadSchema = z.object({
  resultType: z.enum(['loop_failure', 'loop_end', 'game_victory', 'game_defeat']),
  title: z.string().min(1),
  summary: z.string().min(1),
  detail: z.string().min(1).optional(),
  characterId: z.string().min(1).optional(),
  locationId: z.string().min(1).optional(),
  targetId: z.string().min(1).optional(),
  targetType: z.enum(['character', 'location']).optional(),
});

export type ResultAnnouncementPayload = z.infer<typeof ResultAnnouncementPayloadSchema>;
