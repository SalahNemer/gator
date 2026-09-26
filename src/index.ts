import { CommandsRegistry, registerCommand, runCommand, handlerLogin, handlerRegister, handlerReset, handlerUsers, handlerAgg, handlerAddFeed, handlerFeeds, handlerFollow, handlerFollowing, handlerUnfollow, handlerBrowse, middlewareLoggedIn } from "./commands.js";

async function main() {
  const registry: CommandsRegistry = {};
  registerCommand(registry, "register", handlerRegister);
  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "reset", handlerReset);
  registerCommand(registry, "users", handlerUsers);
  registerCommand(registry, "agg", handlerAgg);
  registerCommand(registry, "feeds", handlerFeeds);
  registerCommand(registry, "addfeed", middlewareLoggedIn(handlerAddFeed));
  registerCommand(registry, "follow", middlewareLoggedIn(handlerFollow));
  registerCommand(registry, "following", middlewareLoggedIn(handlerFollowing));
  registerCommand(registry, "unfollow", middlewareLoggedIn(handlerUnfollow));
  registerCommand(registry, "browse", middlewareLoggedIn(handlerBrowse));

  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error("usage: cli <command> [args...]");
    process.exit(1);
  }

  const [cmdName, ...cmdArgs] = args;

  try {
    await runCommand(registry, cmdName, ...cmdArgs);
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }
    process.exit(1);
  }

  process.exit(0);
}

main();
