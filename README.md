# gator

A CLI tool I built to follow RSS feeds and read posts from the terminal. Made with TypeScript, Postgres, and Drizzle ORM as part of a boot.dev guided project.

## Setup

You'll need Node.js and Postgres installed first.

Clone the repo and install dependencies:

npm install

Create a database called `gator`:

sudo -u postgres psql
CREATE DATABASE gator;

Create a config file at `~/.gatorconfig.json`:

```json
{
  "db_url": "postgres://postgres:postgres@localhost:5432/gator?sslmode=disable",
  "current_user_name": ""
}
```

Update the db_url with your own Postgres credentials if needed.

Run the migrations:
npx drizzle-kit generate
npx drizzle-kit migrate

## Commands

Run everything with `npm run start <command>`.

- `register <name>` - creates a new user
- `login <name>` - switches to an existing user
- `reset` - wipes all users from the db
- `users` - lists users, shows who's currently logged in
- `addfeed <name> <url>` - adds a feed and follows it (need to be logged in)
- `feeds` - lists all feeds that have been added
- `follow <url>` - follow an existing feed
- `following` - shows feeds you're following
- `unfollow <url>` - stop following a feed
- `agg <duration>` - runs in a loop, fetching feeds and saving new posts. e.g. `npm run start agg 1m`. Ctrl+C to stop it
- `browse [limit]` - shows recent posts from feeds you follow, defaults to 2

## Example

npm run start register alice
npm run start addfeed "Hacker News" "https://hnrss.org/newest"
npm run start agg 1m

Then in another terminal:

