import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../client',import.meta.url));
export default defineConfig({root,build:{outDir:'/tmp/lore-shield-brand-twenty-build',emptyOutDir:true,copyPublicDir:false,rollupOptions:{input:{study:root+'/shield-brand-twenty.html',board:root+'/shield-brand-board.html'}}}});
