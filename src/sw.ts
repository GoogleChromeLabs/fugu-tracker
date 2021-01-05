import { pageCache, staticResourceCache, imageCache } from 'workbox-recipes';

const version = '1.0.0';
console.log('Hello from SW version:', version);

pageCache();
staticResourceCache();
imageCache();
