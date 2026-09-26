import { CommandsRegistry, registerCommand, runCommand, handlerLogin } from "./commands";

async function main() {
  const registry: CommandsRegistry = {};
  registerCommand(registry, "login", handlerLogin);

  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error("usage: cli <command> [args...]");
    process.exit(1);
  }

  const [cmdName, ...cmdArgs] = args;

  try {
    runCommand(registry, cmdName, ...cmdArgs);
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

main();
