import {build} from 'vite';
await build({root:'client',configFile:false,build:{target:'es2022',outDir:'../docs/vfx-prototypes/2026-10-12-taunt-four/build',copyPublicDir:false,emptyOutDir:true,rollupOptions:{input:{comparison:'client/taunt-four.html',board:'client/taunt-four-board.html'}}}});
