const path = require('node:path');

// Point Tailwind at this app's config by absolute path so it resolves
// correctly no matter what the process cwd is (root `npm run dev` vs apps/web).
/** @type {import('postcss-load-config').Config} */
module.exports = {
  plugins: {
    tailwindcss: { config: path.join(__dirname, 'tailwind.config.js') },
    autoprefixer: {},
  },
};
