import { defineConfig } from 'vite';
export default defineConfig({ base: './', build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { output: { manualChunks: { three: ['three', 'three/addons/controls/OrbitControls.js', 'three/addons/loaders/STLLoader.js', 'three/addons/loaders/OBJLoader.js'], react: ['react', 'react-dom/client'] } } } } });
