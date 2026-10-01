export function cardStatus(card:HTMLElement):HTMLElement{
 let status=card.querySelector<HTMLElement>('.card-status');
 if(!status){status=document.createElement('div');status.className='card-status';card.append(status)}
 return status;
}
