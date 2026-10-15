/** Hidden HOME animation work can wait; resume before the approved reveal starts. */
export const homeIsCovered=()=>!!document.querySelector('.screen-loader')&&!document.querySelector('.home-entrance-stage');
