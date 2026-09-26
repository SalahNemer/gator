
import { createPost, getPostsForUser } from "./lib/db/queries/posts.js";
import type { Feed } from "./schema.js";
import type { Config } from "./config.js";
import type { User } from "./schema.js";
import { createFeed, getFeeds, getFeedByURL, getNextFeedToFetch, markFeedFetched } from "./lib/db/queries/feeds.js";
import { createFeedFollow, getFeedFollowsForUser, deleteFeedFollow } from "./lib/db/queries/feedFollows.js";
import { fetchFeed } from "./rss.js";
import { createUser, getUser, deleteAllUsers, getUsers } from "./lib/db/queries/users.js";
import { setUser, readConfig } from "./config.js";

type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

export async function handlerRegister(cmdName: string, ...args: string[]): Promise<void> {
  if (args.length === 0) {
    throw new Error(`username is required for the ${cmdName} command`);
  }

  const username = args[0];

  const existingUser = await getUser(username);
  if (existingUser) {
    throw new Error(`user ${username} already exists`);
  }

  const user = await createUser(username);
  setUser(username);

  console.log(`User ${username} was created`);
  console.log(user);
}

export async function handlerReset(cmdName: string, ...args: string[]): Promise<void> {
  try {
    await deleteAllUsers();
    console.log("Database has been reset successfully");
  } catch (err) {
    throw new Error(`error resetting database: ${err instanceof Error ? err.message : err}`);
  }
}

export async function handlerUsers(cmdName: string, ...args: string[]): Promise<void> {
  const allUsers = await getUsers();
  const config = readConfig();

  for (const user of allUsers) {
    if (user.name === config.currentUserName) {
      console.log(`* ${user.name} (current)`);
    } else {
      console.log(`* ${user.name}`);
    }
  }
}



function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);

  if (!match) {
    throw new Error(`invalid duration: ${durationStr}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    default:
      throw new Error(`invalid duration unit: ${unit}`);
  }
}

export async function handlerAgg(cmdName: string, ...args: string[]): Promise<void> {
  if (args.length < 1) {
    throw new Error(`usage: ${cmdName} <time_between_reqs>`);
  }

  const timeBetweenRequests = parseDuration(args[0]);
  console.log(`Collecting feeds every ${args[0]}`);

  scrapeFeeds().catch(handleError);

  const interval = setInterval(() => {
    scrapeFeeds().catch(handleError);
  }, timeBetweenRequests);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("Shutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}

function handleError(err: unknown): void {
  if (err instanceof Error) {
    console.error(err.message);
  } else {
    console.error(err);
  }
}


export type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

export async function handlerLogin(cmdName: string, ...args: string[]): Promise<void> {
  if (args.length === 0) {
    throw new Error(`username is required for the ${cmdName} command`);
  }

  const username = args[0];

  const existingUser = await getUser(username);
  if (!existingUser) {
    throw new Error(`user ${username} does not exist`);
  }

  setUser(username);

  console.log(`User has been set to ${username}`);
}

export type CommandsRegistry = Record<string, CommandHandler>;

export function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler,
): void {
  registry[cmdName] = handler;
}

export async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const handler = registry[cmdName];
  if (!handler) {
    throw new Error(`unknown command: ${cmdName}`);
  }
  await handler(cmdName, ...args);
}


function printFeed(feed: Feed, user: User): void {
  console.log(`* ID:            ${feed.id}`);
  console.log(`* Created:       ${feed.createdAt}`);
  console.log(`* Updated:       ${feed.updatedAt}`);
  console.log(`* Name:          ${feed.name}`);
  console.log(`* URL:           ${feed.url}`);
  console.log(`* User:          ${user.name}`);
}

export async function handlerAddFeed(cmdName: string, user: User, ...args: string[]): Promise<void> {
  if (args.length < 2) {
    throw new Error(`usage: ${cmdName} <name> <url>`);
  }

  const [name, url] = args;

  const feed = await createFeed(name, url, user.id);

  printFeed(feed, user);

  const feedFollow = await createFeedFollow(user.id, feed.id);

  console.log(`Feed: ${feedFollow.feedName}`);
  console.log(`User: ${feedFollow.userName}`);
}

export async function handlerFeeds(cmdName: string, ...args: string[]): Promise<void> {
  const allFeeds = await getFeeds();

  for (const feed of allFeeds) {
    console.log(`* Name: ${feed.name}`);
    console.log(`* URL:  ${feed.url}`);
    console.log(`* User: ${feed.userName}`);
    console.log("");
  }
}


export async function handlerFollow(cmdName: string, user: User, ...args: string[]): Promise<void> {
  if (args.length < 1) {
    throw new Error(`usage: ${cmdName} <url>`);
  }

  const [url] = args;

  const feed = await getFeedByURL(url);
  if (!feed) {
    throw new Error(`feed with url ${url} does not exist`);
  }

  const feedFollow = await createFeedFollow(user.id, feed.id);

  console.log(`Feed: ${feedFollow.feedName}`);
  console.log(`User: ${feedFollow.userName}`);
}

export async function handlerFollowing(cmdName: string, user: User, ...args: string[]): Promise<void> {
  const follows = await getFeedFollowsForUser(user.id);

  for (const follow of follows) {
    console.log(`* ${follow.feedName}`);
  }
}


async function scrapeFeeds(): Promise<void> {
  const feed = await getNextFeedToFetch();
  if (!feed) {
    console.log("No feeds to fetch");
    return;
  }

  await markFeedFetched(feed.id);

  const rssFeed = await fetchFeed(feed.url);

  for (const item of rssFeed.channel.item) {
    let publishedAt: Date | null = null;

    if (item.pubDate) {
      const parsed = new Date(item.pubDate);
      if (!isNaN(parsed.getTime())) {
        publishedAt = parsed;
      }
    }

    try {
      await createPost(
        item.title,
        item.link,
        item.description || null,
        publishedAt,
        feed.id,
      );
    } catch (err) {
      console.error(`Couldn't save post: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`Feed ${feed.name} collected, ${rssFeed.channel.item.length} posts found`);
}

export function middlewareLoggedIn(handler: UserCommandHandler): CommandHandler {
  return async (cmdName: string, ...args: string[]): Promise<void> => {
    const config = readConfig();
    const user = await getUser(config.currentUserName);

    if (!user) {
      throw new Error(`User ${config.currentUserName} not found`);
    }

    await handler(cmdName, user, ...args);
  };
}

export async function handlerUnfollow(cmdName: string, user: User, ...args: string[]): Promise<void> {
  if (args.length < 1) {
    throw new Error(`usage: ${cmdName} <url>`);
  }

  const [url] = args;

  const feed = await getFeedByURL(url);
  if (!feed) {
    throw new Error(`feed with url ${url} does not exist`);
  }

  await deleteFeedFollow(user.id, feed.id);

  console.log(`${user.name} unfollowed ${feed.name}`);
}

export async function handlerBrowse(cmdName: string, user: User, ...args: string[]): Promise<void> {
  let limit = 2;

  if (args.length > 0) {
    const parsed = parseInt(args[0], 10);
    if (isNaN(parsed) || parsed <= 0) {
      throw new Error(`invalid limit: ${args[0]}`);
    }
    limit = parsed;
  }

  const posts = await getPostsForUser(user.id, limit);

  for (const post of posts) {
    console.log(`* ${post.title}`);
    console.log(`  ${post.feedName}`);
    console.log(`  ${post.url}`);
    if (post.description) {
      console.log(`  ${post.description}`);
    }
    console.log("");
  }
}
