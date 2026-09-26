import { eq, sql } from "drizzle-orm";
import { db } from "../index.js";
import { feeds, users } from "../../../schema.js";

export async function markFeedFetched(id: string) {
  await db
    .update(feeds)
    .set({ lastFetchedAt: new Date(), updatedAt: new Date() })
    .where(eq(feeds.id, id));
}

export async function createFeed(name: string, url: string, userId: string) {
  const [result] = await db
    .insert(feeds)
    .values({ name, url, userId })
    .returning();
  return result;
}

export async function getFeeds() {
  const result = await db
    .select({
      name: feeds.name,
      url: feeds.url,
      userName: users.name,
    })
    .from(feeds)
    .innerJoin(users, eq(feeds.userId, users.id));

  return result;
}
export async function getFeedByURL(url: string) {
  const [result] = await db.select().from(feeds).where(eq(feeds.url, url));
  return result;
}

export async function getNextFeedToFetch() {
  const [result] = await db
    .select()
    .from(feeds)
    .orderBy(sql`${feeds.lastFetchedAt} NULLS FIRST`)
    .limit(1);

  return result;
}
