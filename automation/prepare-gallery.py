# Requer Python 3 e Pillow. Executar localmente ao adicionar fotos ao acervo.
from pathlib import Path
from PIL import Image, ImageOps
from concurrent.futures import ThreadPoolExecutor
import hashlib,json
root=Path(__file__).resolve().parents[1];dest=root/'assets/galerias'
folders=[('cultura-expo','CULTURA EXPO (fotos) 2026','Fotos'),('canta-palotina','Canta Palotina 2026 - parte 1','Parte 1'),('canta-palotina','Canta Palotina 2026 - parte 2','Parte 2'),('canta-palotina','Canta Palotina 2026 - parte 3','Parte 3'),('curso-biscuit','Curso biscuit 2026','Fotos'),('femuse','Femuse 2026 - parte 1','Parte 1'),('femuse','Femuse 2026 - parte 2','Parte 2'),('femuse','Femuse 2026 - parte 3','Parte 3'),('teatro','Teatro 2026 (fotos)','Fotos de 2026')]
def photo(p):
 key=hashlib.sha256(p.read_bytes()).hexdigest()[:20];out=dest/(key+'.webp')
 with Image.open(p) as im:
  im=ImageOps.exif_transpose(im).convert('RGB');im.thumbnail((560,420));w,h=im.size
  if not out.exists():im.save(out,'WEBP',quality=76,method=4)
 return dict(src=p.relative_to(root).as_posix(),thumb='assets/galerias/'+out.name,width=w,height=h)
galleries=[]
with ThreadPoolExecutor(max_workers=4) as pool:
 for slug,folder,label in folders:
  files=sorted(p for p in (root/'assets'/folder).iterdir() if p.suffix.lower() in ['.jpeg','.jpg','.png','.webp'])
  galleries.append(dict(id=slug,label=label,photos=list(pool.map(photo,files))))
p=root/'automation/config.json';config=json.loads(p.read_text());config['galleries']=galleries;p.write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n')
print('Fotos:',sum(len(g['photos']) for g in galleries),'Miniaturas MB:',round(sum(p.stat().st_size for p in dest.iterdir())/1048576,2))
