module.exports = {
  apps: [
    {
      name: 'media-builder-api',
      script: './apps/api/dist/main.js',
      cwd: '/home/pixot/media-builder-v3',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      log_file: './logs/api.log',
      out_file: './logs/api-out.log',
      error_file: './logs/api-error.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'media-builder-workers',
      script: './apps/workers/dist/main.js',
      cwd: '/home/pixot/media-builder-v3',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      log_file: './logs/workers.log',
      out_file: './logs/workers-out.log',
      error_file: './logs/workers-error.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'media-builder-web',
      script: 'pnpm',
      args: 'start',
      cwd: '/home/pixot/media-builder-v3/apps/web',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      log_file: '../../logs/web.log',
      out_file: '../../logs/web-out.log',
      error_file: '../../logs/web-error.log',
      merge_logs: true,
      time: true,
    },
  ],
}
