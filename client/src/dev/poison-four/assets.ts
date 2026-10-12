import flaskURL from './assets/flask.png';
import toxinURL from './assets/toxin.png';
import capURL from './assets/rust-cap.png';import slugURL from './assets/rust-slug.png';
export const sprites={cap:new Image(),slug:new Image(),toxin:new Image(),flask:new Image()};
sprites.flask.src=flaskURL;sprites.toxin.src=toxinURL;sprites.cap.src=capURL;sprites.slug.src=slugURL;
export const readySprites=Promise.all(Object.values(sprites).map(x=>x.decode()));
