# Requer Python 3 e Pillow. Executar localmente ao adicionar fotos ao acervo.
from pathlib import Path
from PIL import Image, ImageOps
from concurrent.futures import ThreadPoolExecutor
import hashlib,json
root=Path(__file__).resolve().parents[1];dest=root/'assets/galerias';large_dest=dest/'ampliadas';large_dest.mkdir(parents=True,exist_ok=True)
folders=[('cultura-expo','CULTURA EXPO (fotos) 2026','Fotos'),('canta-palotina','Canta Palotina 2026 - parte 1','Parte 1'),('canta-palotina','Canta Palotina 2026 - parte 2','Parte 2'),('canta-palotina','Canta Palotina 2026 - parte 3','Parte 3'),('curso-biscuit','Curso biscuit 2026','Fotos'),('femuse','Femuse 2026 - parte 1','Parte 1'),('femuse','Femuse 2026 - parte 2','Parte 2'),('femuse','Femuse 2026 - parte 3','Parte 3'),('teatro','Teatro 2026 (fotos)','Fotos de 2026')]
# Miniatura para a grade e versão ampliada leve para o visualizador; o original fica só no link "Abrir foto original".
def photo(p):
 key=hashlib.sha256(p.read_bytes()).hexdigest()[:20];out=dest/(key+'.webp');large=large_dest/(key+'.webp')
 with Image.open(p) as im:
  im=ImageOps.exif_transpose(im).convert('RGB')
  if not large.exists():
   big=im.copy();big.thumbnail((1280,1280));big.save(large,"WEBP",quality=70,method=4)
  im.thumbnail((560,420));w,h=im.size
  if not out.exists():im.save(out,'WEBP',quality=76,method=4)
 return dict(src=p.relative_to(root).as_posix(),thumb='assets/galerias/'+out.name,large='assets/galerias/ampliadas/'+large.name,width=w,height=h,key=key)
def unique(photos):
 # Arquivos idênticos enviados duas vezes aparecem uma única vez na galeria.
 seen=set();result=[]
 for item in photos:
  if item['key'] in seen:continue
  seen.add(item['key']);result.append({k:v for k,v in item.items() if k!='key'})
 return result
galleries=[]
with ThreadPoolExecutor(max_workers=4) as pool:
 for slug,folder,label in folders:
  files=sorted(p for p in (root/'assets'/folder).iterdir() if p.suffix.lower() in ['.jpeg','.jpg','.png','.webp'])
  galleries.append(dict(id=slug,label=label,photos=unique(pool.map(photo,files)),videos=[p.relative_to(root).as_posix() for p in sorted((root/'assets'/folder).glob('*.mp4'))]))
p=root/'automation/config.json';config=json.loads(p.read_text());config['galleries']=galleries;p.write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n')
print('Fotos:',sum(len(g['photos']) for g in galleries),'Miniaturas MB:',round(sum(p.stat().st_size for p in dest.glob('*.webp'))/1048576,2),'Ampliadas MB:',round(sum(p.stat().st_size for p in large_dest.glob('*.webp'))/1048576,2))
