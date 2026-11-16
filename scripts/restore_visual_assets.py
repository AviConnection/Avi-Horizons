"""Fetch attributed educational imagery. Requires Pillow; not needed to play."""
from pathlib import Path
import concurrent.futures, urllib.request, urllib.parse, json, io, re, html
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'dist/assets/atlas';DEST.mkdir(exist_ok=True)
def get(u):return urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'AVI-Horizons-Educational/1.0'}),timeout=40).read()
ids={'earth':'GSFC_20171208_Archive_e001386','moon':'KSC-20240819-PH-JBS01_0009','jupiter':'PIA01258','europa':'PIA00294','saturn':'PIA05983','titan':'PIA06228','alpha':'GSFC_20171208_Archive_e000214','orion':'PIA04227','betelgeuse':'PIA16680','milky':'PIA10748','lmc':'iss071e418742','tarantula':'GSFC_20171208_Archive_e002020','andromeda':'GSFC_20171208_Archive_e000833','crab':'PIA03606','sagittarius':'0300607','m87':'PIA23122','quasar':'PIA16114','darkmatter':'GSFC_20171208_Archive_e001983','cmb':'PIA18916'}
pages={'mars':'https://science.nasa.gov/resource/mars-planet-globe/','venus':'https://science.nasa.gov/resource/computer-simulated-global-view-of-venus/','proxima':'https://science.nasa.gov/asset/hubble/proxima-centauri/','vy':'https://science.nasa.gov/asset/hubble/vy-cma/','neutron':'https://science.nasa.gov/asset/hubble/artists-impression-of-disk-around-a-neutron-star/','attractor':'https://science.nasa.gov/missions/hubble/hubble-focuses-on-the-great-attractor/','woh':'https://www.eso.org/public/images/eso2417a/','ton':'https://www.nasa.gov/universe/nasa-animation-sizes-up-the-universes-biggest-black-holes/','sirius':'https://science.nasa.gov/asset/hubble/the-dog-star-sirius-and-its-tiny-companion/'}
def fetch(k):
 try:
  if k in ids:
   q=json.loads(get('https://images-api.nasa.gov/search?'+urllib.parse.urlencode({'nasa_id':ids[k],'media_type':'image'})))['collection']['items'];item=next(x for x in q if x['data'][0]['nasa_id']==ids[k]);d=item['data'][0];u=item['links'][0]['href'];source='https://images.nasa.gov/details/'+ids[k];credit=d.get('secondary_creator',d.get('center','NASA'));description=d.get('description','')
  else:
   source=pages[k];s=get(source).decode();u=html.unescape(re.search(r'<meta[^>]+property=[\"\x27]og:image[\"\x27][^>]+content=[\"\x27]([^\"\x27]+)',s)[1]);credit='NASA / ESA · Créditos completos en la fuente';description=''
  im=Image.open(io.BytesIO(get(u))).convert('RGB');im.thumbnail((1280,960));im.save(DEST/(k+'.webp'),quality=86)
  print(k,'OK',flush=True);return k,dict(image='assets/atlas/'+k+'.webp',source=source,credit=credit,url=u,description=description)
 except Exception as e:print(k,str(e),flush=True);return k,dict(error=str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:assets=dict(pool.map(fetch,list(ids)+list(pages)))
u='https://lambda.gsfc.nasa.gov/product/cobe/cobe_images/physics_today.gif'
im=Image.open(io.BytesIO(get(u))).convert('RGB');im.thumbnail((1280,1200));im.save(DEST/'dipole.webp',quality=90)
assets['dipole']=dict(image='assets/atlas/dipole.webp',source='https://lambda.gsfc.nasa.gov/product/cobe/dmr_image.html',credit='NASA / COBE / LAMBDA',url=u)
(ROOT/'docs/visual-sources.json').write_text(json.dumps(assets,ensure_ascii=False,indent=2))
assert all('error' not in a for a in assets.values())
