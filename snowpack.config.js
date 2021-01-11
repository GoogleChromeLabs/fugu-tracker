/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
module.exports = {
  buildOptions: {
    clean: true,
    out: 'dist',
  },
  mount: {
    public: { url: '/', static: true },
    src: { url: '/' },
  },
  plugins: [
    ['@snowpack/plugin-run-script', { cmd: 'npm run build:11ty', watch: 'npm run watch:11ty' }],
    ['@snowpack/plugin-sass', { compilerOptions: { style: 'compressed', sourceMap: true, embedSourceMap: true } }],
    [
      'legacy-bundle-snowpack-plugin',
      {
        filePath: '/sw.js',
      },
    ],
    ['@snowpack/plugin-optimize', { preloadModules: true, preloadCSS: true }],
  ],
};
