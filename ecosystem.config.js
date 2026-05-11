module.exports = {
  apps: [
    {
      name: 'culcloud-frontend',
      cwd: './file-cloud-frontend',
      script: 'npm',
      args: 'run dev',
      watch: false,
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};
