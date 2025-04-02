const { exec } = require('child_process');
const net = require('net');

/**
 * Check if a port is in use
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} - Whether the port is in use
 */
const isPortInUse = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => {
        // Port is in use
        resolve(true);
      })
      .once('listening', () => {
        // Port is free
        server.close();
        resolve(false);
      })
      .listen(port);
  });
};

/**
 * Find process using a specific port
 * @param {number} port - Port to check
 * @returns {Promise<string|null>} - PID of the process or null
 */
const findProcessUsingPort = (port) => {
  return new Promise((resolve) => {
    // Command varies by OS, but this works for Linux/Mac/Windows with certain shells
    const command = process.platform === 'win32'
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port} | grep LISTEN`;

    exec(command, (error, stdout) => {
      if (error || !stdout) {
        resolve(null);
        return;
      }

      let pid = null;
      
      if (process.platform === 'win32') {
        // Parse Windows netstat output
        const match = stdout.trim().split('\n')[0].trim().split(/\s+/).pop();
        pid = match;
      } else {
        // Parse Unix lsof output
        const match = stdout.trim().split('\n')[0].trim().split(/\s+/)[1];
        pid = match;
      }

      resolve(pid);
    });
  });
};

/**
 * Kill a process by its PID
 * @param {string} pid - Process ID to kill
 * @returns {Promise<boolean>} - Whether the process was killed
 */
const killProcess = (pid) => {
  return new Promise((resolve) => {
    if (!pid) {
      resolve(false);
      return;
    }

    const command = process.platform === 'win32'
      ? `taskkill /F /PID ${pid}`
      : `kill -9 ${pid}`;

    exec(command, (error) => {
      if (error) {
        console.error(`Failed to kill process ${pid}:`, error);
        resolve(false);
        return;
      }
      
      console.log(`Successfully killed process ${pid}`);
      resolve(true);
    });
  });
};

/**
 * Ensure a port is free to use by killing any process using it
 * @param {number} port - Port to free
 * @returns {Promise<boolean>} - Whether the port was successfully freed
 */
const ensurePortIsFree = async (port) => {
  try {
    const inUse = await isPortInUse(port);
    
    if (!inUse) {
      console.log(`Port ${port} is already free`);
      return true;
    }
    
    console.log(`Port ${port} is in use, attempting to free it`);
    const pid = await findProcessUsingPort(port);
    
    if (!pid) {
      console.error(`Could not identify process using port ${port}`);
      return false;
    }
    
    console.log(`Found process ${pid} using port ${port}, attempting to kill it`);
    const killed = await killProcess(pid);
    
    if (!killed) {
      console.error(`Failed to kill process ${pid}`);
      return false;
    }
    
    // Verify the port is now free
    const stillInUse = await isPortInUse(port);
    if (stillInUse) {
      console.error(`Port ${port} is still in use after killing process ${pid}`);
      return false;
    }
    
    console.log(`Successfully freed port ${port}`);
    return true;
  } catch (error) {
    console.error('Error ensuring port is free:', error);
    return false;
  }
};

module.exports = {
  isPortInUse,
  findProcessUsingPort,
  killProcess,
  ensurePortIsFree
}; 