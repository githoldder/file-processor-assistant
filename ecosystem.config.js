module.exports = {
  apps: [
    {
      name: 'frontend-dev',
      cwd: './file-cloud-frontend',
      script: 'npm',
      args: 'run dev',
      watch: false,
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'frontend-build',
      cwd: './file-cloud-frontend',
      script: 'npm',
      args: 'run build',
      watch: false,
      autorestart: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'frontend-preview',
      cwd: './file-cloud-frontend',
      script: 'npm',
      args: 'run preview',
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};

