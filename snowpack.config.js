module.exports = {
  buildOptions: {
    clean: true,
    out: 'dist',
  },
  mount: {
    public: { url: '/', static: true },
    css: { url: '/css' },
    js: { url: '/js' },
  },
  plugins: [
    ['@snowpack/plugin-run-script', { cmd: 'npm run build:11ty', watch: 'npm run watch:11ty' }],
    ['@snowpack/plugin-sass', { compilerOptions: { style: 'compressed', sourceMap: true, embedSourceMap: true } }],
  ],
};
