import json,math,urllib.request,io
from PIL import Image
# Requires Pillow. Regenerates visual grades from OSM runway centrelines and Mapzen DEM.
import urllib.parse
query='[out:json];way[aeroway=runway](17.1,78.2,17.65,78.65);out geom;'
url='https://overpass-api.de/api/interpreter?'+urllib.parse.urlencode({'data':query})
ways=json.load(urllib.request.urlopen(url,timeout=60))['elements']; cache={}
def elevation(lon,lat):
 n=2**14; x=(lon+180)/360*n; y=(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n
 k=(int(x),int(y))
 if k not in cache:
  url=f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/14/{k[0]}/{k[1]}.png'
  cache[k]=Image.open(io.BytesIO(urllib.request.urlopen(url,timeout=30).read())).convert('RGB')
 r,g,b=cache[k].getpixel((min(255,int(x%1*256)),min(255,int(y%1*256))))
 return r*256+g+b/256-32768
out=[]
for w in ways:
 a,b=[[p['lon'],p['lat']] for p in [w['geometry'][0],w['geometry'][-1]]]
 samples=[elevation(a[0]+(b[0]-a[0])*i/20,a[1]+(b[1]-a[1])*i/20) for i in range(21)]
 mean=sum(samples)/21; slope=sum((i/20-.5)*(v-mean) for i,v in enumerate(samples))/sum((i/20-.5)**2 for i in range(21))
 length=math.hypot((b[0]-a[0])*106100,(b[1]-a[1])*111320)
 slope=max(-.01*length,min(.01*length,slope))
 out.append(dict(id=w['id'],name=w['tags'].get('name',w['tags'].get('ref','Runway')),a=a,b=b,start=round(mean-slope/2,3),end=round(mean+slope/2,3),halfWidth=max(50,float(w['tags'].get('width',60))/2+25)))
 print(w['id'],min(samples),max(samples),'fitted',out[-1]['start'],out[-1]['end'],flush=True)
# RGIA parallel runways share a single longitudinal plane, avoiding competing corrections.
r=[p for p in out if p['id'] in [55834635,55842437]]
x0=min(p['a'][0] for p in r); x1=max(p['b'][0] for p in r)
slope=sum((p['end']-p['start'])/(p['b'][0]-p['a'][0]) for p in r)/2
intercept=sum((p['start']+p['end'])/2-slope*(p['a'][0]+p['b'][0])/2 for p in r)/2
for p in r:p['start']=round(intercept+slope*p['a'][0],3);p['end']=round(intercept+slope*p['b'][0],3)
json.dump(out,open('src/data/runway-profiles.json','w'),indent=2)
