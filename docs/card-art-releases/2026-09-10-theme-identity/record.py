import sys,pathlib,hashlib,json,struct,shutil
r=pathlib.Path(__file__).resolve().parent
id,source=sys.argv[1:3];s=pathlib.Path(source);b=s.read_bytes();assert b[:8]==b'\x89PNG\r\n\x1a\n';w,h=struct.unpack('>II',b[16:24]);out=r/'images'/f'{id}.png'
assert not out.exists() or out.read_bytes()==b
shutil.copy2(s,out)
a={'id':id,'file':f'images/{id}.png','source':source,'width':w,'height':h,'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'status':'review_pending'}
t=r/'results'/f'{id}.json';t.write_text(json.dumps(a,ensure_ascii=False,indent=2)+'\n');print(json.dumps(a))
