import {artUrl} from './cardArt';
import {attachCardEffect} from './cardFinish';

/** The canvas and the untrimmed illustration share the same rectangle. */
export function finishArtPreview(cardId:string,effect='default'):HTMLElement {
  const preview=document.createElement('span');
  preview.className='deck-finish-art';
  preview.dataset.cardId=cardId;
  const surface=document.createElement('span');
  surface.className='card-art';
  const image=document.createElement('img');
  image.alt='';
  image.onload=()=>preview.style.setProperty('--art-ratio',String(image.naturalWidth/image.naturalHeight));
  image.src=artUrl.full(cardId);
  surface.append(image);
  preview.append(surface);
  attachCardEffect(preview,'finish-preview-'+cardId,effect);
  return preview;
}
