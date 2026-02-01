import { Router } from 'express';
import { createMatchSchema, listMatchesQuerySchema } from '../validation/matches.js';
import { db } from '../db/db.js';
import { matches } from '../db/schema.js';
import { getMatchStatus } from '../utils/match-status.js';
import { desc } from 'drizzle-orm';

const Max_Limit = 100;

export const matchesRouter = Router();

matchesRouter.get('/', async (req, res) => {
  const parsedInfo = listMatchesQuerySchema.safeParse(req.query);

  if (!parsedInfo.success) {
    return res.status(400).json({ error: 'Invalid query parameters', details: parsedInfo.error });
  }

  const limit = Math.min(parsedInfo.data.limit ?? 50, Max_Limit);
  try {
    const events = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(limit);
    return res.status(200).json({ data: events });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error', details: JSON.stringify(e) });
  }
});

matchesRouter.post('/', async (req, res) => {
  const parsedInfo = createMatchSchema.safeParse(req.body);

  const {
    data: { startTime, endTime, homeScore, awayScore },
  } = parsedInfo;

  if (!parsedInfo.success) {
    return res.status(400).json({ error: 'Invalid match data', details: parsedInfo.error });
  }

  try {
    const [event] = await db
      .insert(matches)
      .values({
        ...parsedInfo.data,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status: getMatchStatus(startTime, endTime),
      })
      .returning();

    return res.status(201).json({ data: event });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error', details: JSON.stringify(e) });
  }
});
