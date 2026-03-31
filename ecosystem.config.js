module.exports = {
  apps: [
    {
      name: "bambu-whatsapp-bot",
      script: "node_modules/.bin/next",
      args: "start -p 3002",
      cwd: "/var/www/bambu-whatsapp-bot",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env_production: {
        NODE_ENV: "production",
        PORT: 3002,
      },
    },
  ],
}
