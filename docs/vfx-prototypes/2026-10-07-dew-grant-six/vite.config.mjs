import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../client',import.meta.url));
export default defineConfig({root,build:{outDir:'/tmp/lore-dew-grant-six-build',emptyOutDir:true,copyPublicDir:false,rollupOptions:{input:{study:root+'/dew-grant-six.html',board:root+'/dew-grant-board.html'}}}});
