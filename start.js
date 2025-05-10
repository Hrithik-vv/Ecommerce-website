#!/usr/bin/env node
const app = require('./app');
const figlet = require('figlet');
const chalk = require('chalk');
const { ensurePortIsFree } = require('./utils/portUtils');

// Get the port from environment or use default
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

/**
 * Display a nice startup banner with app information
 */
const displayBanner = () => {
  // Create ASCII art for the app name
  console.log('\n');
  console.log(
    chalk.cyan(
      figlet.textSync('OXYBOO', {
        font: 'ANSI Shadow',
        horizontalLayout: 'default',
        verticalLayout: 'default',
        width: 80,
        whitespaceBreak: true
      })
    )
  );
  console.log('\n');
  console.log(chalk.cyan('========================================================='));
  console.log(chalk.green('  📦 E-Commerce Platform'));
  console.log(chalk.cyan('========================================================='));
  console.log(chalk.cyan('  ⚡️ Mode:       '), chalk.yellow(process.env.NODE_ENV || 'development'));
  console.log(chalk.cyan('  🔗 URL:        '), chalk.yellow(BASE_URL));
  console.log(chalk.cyan('  🚪 Port:       '), chalk.yellow(PORT));
  console.log(chalk.cyan('========================================================='));
  console.log('\n');
};

/**
 * Start the server
 */
const startServer = async () => {
  try {
    console.log(chalk.yellow('Checking if port is available...'));
    
    // Ensure the port is free
    const isPortFree = await ensurePortIsFree(PORT);
    
    if (!isPortFree) {
      console.log(chalk.red(`Unable to free port ${PORT}. Please close any applications using this port.`));
      process.exit(1);
    }
    
    // Display the startup banner
    displayBanner();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(chalk.green('✓ Server started successfully!'));
      console.log(chalk.blue(`✓ Open ${chalk.underline(BASE_URL)} in your browser`));
      console.log('\n');
    });
  } catch (error) {
    console.error(chalk.red('Error starting server:'), error);
    process.exit(1);
  }
};

// Start the server
startServer(); 