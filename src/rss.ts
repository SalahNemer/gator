import { XMLParser } from "fast-xml-parser";

export type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

export type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  const response = await fetch(feedURL, {
    headers: {
      "User-Agent": "gator",
    },
  });

  const xml = await response.text();

  const parser = new XMLParser({
    processEntities: false,
  });

  const parsedFeed = parser.parse(xml);

  if (!parsedFeed.rss || !parsedFeed.rss.channel) {
    throw new Error("Invalid RSS feed: missing channel field");
  }

  const channel = parsedFeed.rss.channel;

  if (!channel.title || !channel.link || !channel.description) {
    throw new Error("Invalid RSS feed: missing required channel fields");
  }

  let items: RSSItem[] = [];

  if (channel.item) {
    const rawItems = Array.isArray(channel.item) ? channel.item : [channel.item];

    for (const item of rawItems) {
      if (!item.title || !item.link || !item.description || !item.pubDate) {
        continue; // تخطي أي item ناقص أو غير صالح
      }

      items.push({
        title: item.title,
        link: item.link,
        description: item.description,
        pubDate: item.pubDate,
      });
    }
  }

  const feed: RSSFeed = {
    channel: {
      title: channel.title,
      link: channel.link,
      description: channel.description,
      item: items,
    },
  };

  return feed;
}
