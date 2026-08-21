module.exports = {
  apps: [
    {
      name: "jamurechat",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "1G",
      watch: false,
      restart_delay: 3000,
    },
  ],
};
