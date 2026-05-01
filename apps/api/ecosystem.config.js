// PM2 process manager configuration
// Usage:
//   pm2 start ecosystem.config.js --env production
//   pm2 restart ctrl-custo-api
//   pm2 logs ctrl-custo-api
module.exports = {
  apps: [
    {
      name: "ctrl-custo-api",
      script: "../../node_modules/.bin/tsx",
      args: "src/index.ts",
      cwd: "/home/deploy/ctrl-custo/apps/api",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      error_file: "/home/deploy/logs/api-error.log",
      out_file: "/home/deploy/logs/api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env_production: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
