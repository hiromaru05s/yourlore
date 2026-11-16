import {installLoreCursor} from './ui/loreCursor';

const dispose = installLoreCursor();
import.meta.hot?.dispose(dispose);
