"""Convert an Overpass out-geom extract to compact game geometry. No dependencies."""
import collections
import json
import math
import os
import re

HERE = os.path.dirname(__file__)
SOURCE = json.load(open(os.path.join(HERE, 'midtown-osm.json')))
FULL = dict(south=40.735, west=-74.012, north=40.780, east=-73.958)
CORE = dict(south=40.740, west=-74.002, north=40.775, east=-73.966)


def coords(g):
    return [[round(p['lon'], 6), round(p['lat'], 6)] for p in g if p and 'lon' in p]


def clean(r):
    out = []
    for p in r:
        if not out or out[-1] != p:
            out.append(p)
    if len(out) > 2 and out[0] != out[-1]:
        out.append(out[0])
    return out


def area(r):
    return abs(sum(p[0]*q[1]-q[0]*p[1] for p, q in zip(r, r[1:]))) / 2


def inside(p, ring):
    result = False
    x, y = p
    for a, b in zip(ring, ring[1:]):
        if (a[1] > y) != (b[1] > y) and x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:
            result = not result
    return result


def join_rings(segments):
    pending = [x[:] for x in segments if len(x) > 1]
    rings = []
    while pending:
        r = pending.pop()
        while r[0] != r[-1]:
            for i, s in enumerate(pending):
                if r[-1] == s[0]:
                    r.extend(s[1:])
                elif r[-1] == s[-1]:
                    r.extend(s[-2::-1])
                elif r[0] == s[-1]:
                    r = s[:-1] + r
                elif r[0] == s[0]:
                    r = s[:0:-1] + r
                else:
                    continue
                pending.pop(i)
                break
            else:
                break
        if len(r) >= 4 and r[0] == r[-1]:
            rings.append(clean(r))
    return rings


def polygons(e):
    if e['type'] == 'way':
        r = clean(coords(e.get('geometry', [])))
        return [(r, [])] if len(r) >= 4 else []
    if e.get('tags',{}).get('type') != 'multipolygon':
        return []
    outers = join_rings([coords(m.get('geometry', [])) for m in e.get('members', []) if m.get('role') in ('outer', '') and m.get('type') == 'way'])
    inners = join_rings([coords(m.get('geometry', [])) for m in e.get('members', []) if m.get('role') == 'inner' and m.get('type') == 'way'])
    return [(r, [h for h in inners if inside(h[0], r)]) for r in outers]


def clip_ring(r, b):
    points = r[:-1] if r and r[0] == r[-1] else r[:]
    for axis, edge, lower in [(0,b['west'],True),(0,b['east'],False),(1,b['south'],True),(1,b['north'],False)]:
        result = []
        if not points:
            return []
        previous = points[-1]
        was_in = previous[axis] >= edge if lower else previous[axis] <= edge
        for current in points:
            now_in = current[axis] >= edge if lower else current[axis] <= edge
            if was_in != now_in:
                f = (edge-previous[axis])/(current[axis]-previous[axis])
                result.append([round(previous[j]+f*(current[j]-previous[j]),6) for j in (0,1)])
            if now_in:
                result.append(current)
            previous, was_in = current, now_in
        points = result
    result = clean(points)
    return result if len(result) >= 4 and area(result) > 1e-12 else []


def clip_line(points, b):
    lines, current = [], []
    for a, z in zip(points, points[1:]):
        dx, dy = z[0]-a[0], z[1]-a[1]
        lo, hi, accepted = 0, 1, True
        for p, q in [(-dx,a[0]-b['west']),(dx,b['east']-a[0]),(-dy,a[1]-b['south']),(dy,b['north']-a[1])]:
            if p == 0:
                if q < 0:
                    accepted = False
                    break
            elif p < 0:
                lo = max(lo, q/p)
            else:
                hi = min(hi, q/p)
        if not accepted or lo > hi:
            if len(current) > 1:
                lines.append(current)
            current = []
            continue
        p0 = [round(a[0]+lo*dx,6),round(a[1]+lo*dy,6)]
        p1 = [round(a[0]+hi*dx,6),round(a[1]+hi*dy,6)]
        if p0 == p1:
            continue
        if current and current[-1] != p0:
            lines.append(current)
            current = []
        if not current:
            current.append(p0)
        current.append(p1)
    if len(current) > 1:
        lines.append(current)
    return lines


def number(value, default=None):
    if value is None:
        return default
    m = re.search(r'-?\d+(?:\.\d+)?', str(value))
    return float(m.group()) if m else default


def metres(value, default=None):
    n = number(value, default)
    if n is None:
        return default
    return round(n*0.3048 if re.search(r"ft|feet|'", str(value)) else n, 2)


def centre(r):
    # Area centroid, using a nearby origin to avoid precision loss in lon/lat.
    ox,oy=r[0]
    points=[[p[0]-ox,p[1]-oy] for p in r]
    cross=[p[0]*q[1]-q[0]*p[1] for p,q in zip(points,points[1:])]
    a=sum(cross)
    if abs(a)<1e-18:
        return [sum(p[k] for p in r[:-1])/(len(r)-1) for k in (0,1)]
    return [ox+sum((p[0]+q[0])*c for p,q,c in zip(points,points[1:],cross))/(3*a),oy+sum((p[1]+q[1])*c for p,q,c in zip(points,points[1:],cross))/(3*a)]


def convert(bounds, filename):
    out = dict(bounds=bounds, metadata=dict(source='OpenStreetMap',attribution='© OpenStreetMap contributors',license='ODbL-1.0',licenseUrl='https://www.openstreetmap.org/copyright',osmTimestamp=SOURCE.get('osm3s',{}).get('timestamp_osm_base'),coordinateOrder='longitude, latitude',heightUnits='metres',heightFallback='building:levels × 3.3; otherwise 18m (estimated)',origin=[-73.9855,40.758]),buildings=[],roads=[],parks=[],water=[],coastlines=[])
    for e in SOURCE['elements']:
        t = e.get('tags',{})
        ident = ('w' if e['type']=='way' else 'r')+str(e['id'])
        if t.get('highway') and e['type']=='way':
            if t.get('indoor')=='yes' or t.get('location')=='underground' or number(t.get('layer'),0)<0 or t.get('tunnel') not in (None,'no','building_passage'):
                continue
            for points in clip_line(coords(e.get('geometry',[])),bounds):
                out['roads'].append(dict(id=ident,name=t.get('name',''),kind=t['highway'],points=points,lanes=number(t.get('lanes')),oneway=t.get('oneway','no'),width=metres(t.get('width'))))
        if t.get('natural')=='coastline' and e['type']=='way':
            for points in clip_line(coords(e.get('geometry',[])),bounds):
                out['coastlines'].append(dict(id=ident,points=points))
        is_part = t.get('building:part') not in (None,'no')
        is_building = t.get('building') not in (None,'no') or is_part
        category = 'buildings' if is_building else 'parks' if t.get('leisure')=='park' else 'water' if t.get('natural')=='water' else None
        if not category:
            continue
        if category=='buildings' and (t.get('location')=='underground' or number(t.get('layer'),0)<0 or t.get('building:part')=='roof' and number(t.get('height'),0)<=0):
            continue
        for pi,(outer,holes) in enumerate(polygons(e)):
            ring = clip_ring(outer,bounds)
            if not ring:
                continue
            hs = [h for h in (clip_ring(h,bounds) for h in holes) if h]
            item = dict(id=ident if pi==0 else ident+'-'+str(pi),name=t.get('name',''),ring=ring,holes=hs)
            if category=='buildings':
                height = metres(t.get('height'))
                levels = number(t.get('building:levels'))
                height_source = 'height' if height is not None else 'levels' if levels is not None else 'estimated'
                height = height if height is not None else round(levels*3.3,2) if levels is not None else 18
                minimum = metres(t.get('min_height'))
                minimum = minimum if minimum is not None else number(t.get('building:min_level'),0)*3.3
                item.update(height=round(max(1,height,minimum+1),2),minHeight=round(max(0,minimum),2),kind=t.get('building',t.get('building:part','yes')),isPart=is_part,hasParts=False,suppressOutline=False,heightSource=height_source)
                if levels is not None:
                    item['levels']=levels
                for source,key in [('roof:shape','roofShape'),('roof:height','roofHeight'),('building:colour','color'),('building:material','material'),('addr:street','street')]:
                    if source in t:
                        item[key]=t[source]
            out[category].append(item)
    # Collapse exact coincident volumes before matching parts to outlines.
    unique={}
    duplicate_count=0
    for b in out['buildings']:
        signature=(b['height'],b['minHeight'],tuple(sorted(map(tuple,b['ring'][:-1]))),tuple(sorted(tuple(sorted(map(tuple,h[:-1]))) for h in b['holes'])))
        if signature in unique:
            duplicate_count+=1
            old=unique[signature]
            if not old['name'] and b['name']:
                old['name']=b['name']
        else:
            unique[signature]=b
    out['buildings']=list(unique.values())
    out['metadata']['deduplicatedVolumes']=duplicate_count
    # Associate mapped parts with containing footprints using a small spatial grid.
    outlines = [b for b in out['buildings'] if not b['isPart']]
    grid = collections.defaultdict(list)
    cell = 0.001
    for b in outlines:
        xs,ys = zip(*b['ring'])
        for x in range(math.floor(min(xs)/cell),math.floor(max(xs)/cell)+1):
            for y in range(math.floor(min(ys)/cell),math.floor(max(ys)/cell)+1):
                grid[x,y].append(b)
    children=collections.defaultdict(list)
    for p in out['buildings']:
        if not p['isPart']:
            continue
        c=centre(p['ring'])
        candidates=[b for b in grid[math.floor(c[0]/cell),math.floor(c[1]/cell)] if inside(c,b['ring']) and not any(inside(c,h) for h in b['holes'])]
        if candidates:
            b=min(candidates,key=lambda x:area(x['ring']))
            b['hasParts']=True
            p['parentId']=b['id']
            children[b['id']].append(p)
    # A roof detail alone does not replace its parent footprint (e.g. Flatiron).
    # Suppress only outlines whose mapped parts cover most of the outline.
    for b in outlines:
        ps=children[b['id']]
        if not ps:
            continue
        xs,ys=zip(*b['ring'])
        x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
        total=covered=0
        for i in range(11):
            for j in range(11):
                q=[x0+(i+0.5)*(x1-x0)/11,y0+(j+0.5)*(y1-y0)/11]
                if not inside(q,b['ring']) or any(inside(q,h) for h in b['holes']):
                    continue
                total+=1
                covered+=any(inside(q,p['ring']) and not any(inside(q,h) for h in p['holes']) for p in ps)
        b['partCoverage']=round(covered/total,3) if total else 0
        b['suppressOutline']=b['partCoverage']>=0.75 and any(p['minHeight']<1 for p in ps)
        b['maxPartHeight']=max(p['height'] for p in ps)
    out['metadata']['counts']={k:len(out[k]) for k in ['buildings','roads','parks','water','coastlines']}
    out['metadata']['buildingHeightSources']=dict(collections.Counter(b['heightSource'] for b in out['buildings']))
    out['metadata']['outlinesWithParts']=sum(b['hasParts'] for b in out['buildings'])
    out['metadata']['suppressedOutlines']=sum(b['suppressOutline'] for b in out['buildings'])
    dest=os.path.join(HERE,filename)
    with open(dest,'w') as f:
        json.dump(out,f,separators=(',',':'),ensure_ascii=False)
    print(filename,os.path.getsize(dest),out['metadata'])
    return out


if __name__=='__main__':
    full=convert(FULL,'midtown-full.json')
    core=convert(CORE,'midtown-core.json')
    targets=['Empire State Building','Chrysler Building','Flatiron Building','Grand Central Terminal','30 Rockefeller Plaza','Madison Square Garden','Central Park Tower','Bryant Park','Central Park','One Times Square']
    landmarks=[]
    for name in targets:
        matches=[x for x in full['buildings']+full['parks'] if x['name']==name]
        if matches:
            item=max(matches,key=lambda x:area(x['ring']))
            item=dict(name=name,osmId=item['id'],coordinates=[round(x,6) for x in centre(item['ring'])],height=max(item.get('height',0),item.get('maxPartHeight',0)) or None,mappedParts=item.get('hasParts'))
            landmarks.append(item)
    with open(os.path.join(HERE,'landmarks.json'),'w') as f:
        json.dump(landmarks,f,indent=2)
    print('Landmarks',landmarks)
