import chalk from 'chalk';

export function errorAndExit(message: string, code = 1): never {
  console.error(chalk.red(`Error: ${message}`));
  process.exit(code);
}

export function warnMessage(message: string): void {
  console.warn(chalk.yellow(`Warning: ${message}`));
}
