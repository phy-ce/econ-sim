"""Rebuild the 12 original building sprites; retain existing portrait artwork.
Usage: python scripts/buildings.py (requires Pillow).
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw

INK='#302e32'; EDGE='#53504b'; WALL='#d7bd91'; LIGHT='#f2ddb0'; SIDE='#9b8065'
RED='#aa5948'; ROOF='#c87a56'; DARK='#70463e'; GLASS='#4d7882'; SKY='#a5c5bd'

def make(kind):
    im=Image.new('RGBA',(64,64)); d=ImageDraw.Draw(im)
    def box(x,y,w,h,c): d.rectangle((x,y,x+w-1,y+h-1),fill=c)
    def poly(p,c,outline=None): d.polygon(p,fill=c,outline=outline)
    def line(p,c,w=1): d.line(p,fill=c,width=w)
    def window(x,y):
        box(x,y,6,9,INK); box(x+1,y+1,4,6,GLASS); box(x+1,y+1,2,3,SKY)
        box(x-1,y+8,8,1,LIGHT)
    def chimney(x,y,h):
        box(x,y,7,h,INK); box(x+1,y,3,h,RED); box(x+4,y,2,h,DARK)
        for yy in range(y+4,y+h,5): box(x+1,yy,3,1,ROOF)
        box(x-1,y,9,3,EDGE); box(x,y,6,1,'#c6b59b')
    def tree(x,y):
        box(x,y+10,2,12,'#71503d')
        for dy,ww in [(0,5),(5,8),(10,10)]:
            poly([(x,y+dy),(x-ww//2,y+dy+10),(x+ww//2+2,y+dy+10)],'#456552')
            line([(x,y+dy+2),(x-ww//2+1,y+dy+8)],'#8ca16b')
    poly([(3,51),(45,47),(62,54),(48,62),(5,59)],'#615a49')
    poly([(3,50),(45,46),(62,53),(48,59),(5,56)],'#a5a076')
    line([(6,57),(47,60),(59,55)],'#3f433b')
    if kind=='mine':
        poly([(6,50),(9,33),(22,19),(32,27),(43,16),(57,36),(60,51)],EDGE,INK)
        poly([(9,33),(22,19),(19,37),(7,48)],'#a0a29a')
        poly([(32,27),(43,16),(40,36),(29,43)],'#818c88')
        poly([(17,51),(17,36),(23,31),(33,34),(36,51)],INK)
        box(16,33,4,20,'#9d7550'); box(33,33,4,20,'#79543b'); box(15,32,23,4,'#c19865')
        for x in [20,30]: line([(x,48),(x-5,59)],'#bbc0b5',2)
        for y in [52,56,59]: line([(13,y),(31,y-1)],'#574537')
        box(38,43,15,8,INK); box(39,44,13,5,GLASS)
        for x in [40,49]: box(x,51,3,3,INK)
        poly([(39,43),(42,39),(46,40),(49,37),(53,43)],'#bdab83')
    elif kind=='locomotive':
        for x in range(5,59,7): line([(x,55),(x+4,60)],'#68513e',2)
        line([(4,55),(59,55)],'#c3bda9'); line([(7,60),(62,60)],'#858d8a')
        box(10,34,31,16,INK); box(12,35,29,10,'#4b706a'); box(12,35,27,2,'#91a38b')
        box(38,26,16,24,INK); box(40,28,12,16,RED); box(41,29,9,8,INK); box(42,30,7,5,SKY)
        box(36,24,20,3,EDGE); box(16,24,6,12,INK); box(14,23,10,3,EDGE)
        box(8,47,49,4,DARK); box(7,43,4,4,'#e7c778')
        for x in [16,29,45]:
            d.ellipse((x-5,47,x+5,57),fill=INK); d.ellipse((x-3,49,x+3,55),fill='#969c91'); box(x,50,1,4,EDGE)
        line([(16,52),(45,52)],'#d7c9ac',2)
    else:
        industrial=kind in ['factory','fuelworks','textile','smelter','fab']
        if industrial: chimney(43,9,33)
        if kind=='farm': tree(54,24)
        if kind=='lumber': tree(8,14); tree(53,22)
        poly([(12,29),(40,29),(40,53),(12,53)],WALL,INK)
        poly([(40,29),(53,23),(53,47),(40,53)],SIDE,INK)
        box(13,31,26,2,LIGHT); box(13,51,27,2,'#9c8467')
        if industrial:
            poly([(9,29),(18,19),(25,23),(33,14),(41,20),(53,18),(55,24),(40,31)],EDGE,INK)
            line([(11,28),(19,21),(25,25),(34,17),(41,23),(52,21)],'#a4afa4')
        else:
            poly([(8,30),(25,14),(42,28),(40,32)],ROOF,INK)
            poly([(25,14),(38,9),(56,23),(42,28)],DARK,INK)
            line([(10,29),(25,16),(39,28)],'#edaa74')
            for yy in [23,27]: line([(18-(yy-23),yy),(31+(yy-23),yy)],'#a35b46')
        for x in [16,30]: window(x,36)
        poly([(45,34),(49,32),(49,40),(45,42)],GLASS,INK)
        line([(46,34),(48,33),(48,36)],SKY)
        box(24,42,6,11,INK); box(25,43,4,9,'#795a42'); box(28,47,1,1,'#d8b672')
        poly([(23,53),(31,53),(34,55),(23,56)],'#c7bb9b')
        if kind=='farm':
            for y in [55,58]:
                line([(4,y),(19,y+1)],'#70593b',2)
                for x in [5,9,13,17]: line([(x,y),(x,y-4)],'#e3be65'); box(x-1,y-4,3,2,'#e7cb7c')
        if kind=='lumber':
            for x,y in [(40,53),(47,51),(45,56)]:
                box(x,y,9,4,'#70513b'); d.ellipse((x-2,y,x+2,y+4),fill='#d9b27c'); box(x,y+2,1,1,'#826344')
        if kind in ['fuelworks','smelter']:
            box(16,37,20,15,INK); box(18,39,16,11,DARK); box(21,43,10,7,'#d67c45'); box(24,45,5,5,'#f5d583')
            box(14,51,24,2,EDGE)
        if kind=='textile':
            for x in [15,24,33]:
                poly([(x,26),(x+6,17),(x+6,27)],GLASS,INK)
                line([(x+2,24),(x+5,20)],SKY)
            for x,c in [(15,'#c57967'),(21,'#d9c897'),(27,'#7b9c9a')]: box(x,45,5,7,c); box(x,45,5,1,LIGHT)
        if kind=='fuelworks':
            for x,y in [(43,39),(51,43)]:
                box(x,y,8,13,EDGE); box(x+1,y,3,12,'#8eaaa1'); box(x+4,y,3,12,'#627f79')
                d.ellipse((x,y-2,x+7,y+2),fill='#bdc8ad',outline=EDGE)
                box(x,y+8,8,1,INK)
        if kind=='smelter':
            chimney(7,15,32)
            for x,y in [(42,53),(48,51),(48,55)]:
                poly([(x,y),(x+6,y),(x+8,y+2),(x+1,y+2)],'#bcc4b9',EDGE)
        if kind=='workshop':
            box(8,47,14,3,'#6e4e37'); box(10,50,2,5,DARK); box(19,50,2,5,DARK)
            poly([(11,42),(20,42),(18,45),(14,45),(14,47),(11,47)],'#737f7b')
        if kind=='fab':
            box(20,34,14,5,INK); box(21,35,12,3,'#81aa9e'); box(26,35,2,3,LIGHT)
        if kind=='school':
            box(26,16,9,13,WALL); poly([(24,16),(30,9),(37,16)],'#456c64',INK)
            d.ellipse((28,18,33,23),fill=LIGHT); line([(30,19),(30,21),(32,21)],INK)
            line([(30,9),(30,3)],INK); poly([(31,3),(40,5),(31,7)],RED)
        if kind=='builder':
            box(49,5,3,48,'#c7a05c'); line([(15,7),(58,7)],'#dbb971',3)
            line([(16,6),(50,2),(57,6)],INK); line([(19,9),(19,24)],INK)
            box(15,24,9,8,'#b78e5b'); line([(15,24),(23,31)],'#6b513a')
            for y in [35,45]: line([(7,y),(42,y)],'#7c6447',2)
            for x in [8,40]: box(x,32,2,23,'#b99866')
        if kind=='factory':
            box(5,48,9,7,'#b18a56'); box(6,49,7,1,'#e2c18a'); line([(9,48),(9,54)],'#725337')
    return im

def layers(im):
    out={}
    for y in range(64):
        x=0
        while x<64:
            c=im.getpixel((x,y)); start=x; x+=1
            if not c[3]: continue
            while x<64 and im.getpixel((x,y))==c: x+=1
            color='#%02x%02x%02x'%c[:3]; w=x-start
            out.setdefault(color,[]).append(f'M{start} {y}h{w}v1h-{w}z')
    return [{'fill':c,'d':''.join(p)} for c,p in out.items()]

def run(source,target,preview):
    data=json.loads(Path(source).read_text(encoding='utf-8')); pics=[]
    for s in data:
        if s['id'] in ['peasant','laborer','skilled','expert','capitalist','aristocrat']: continue
        im=make(s['id']); s['layers']=layers(im); pics.append((s['id'],im))
    Path(target).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    sheet=Image.new('RGB',(768,600),'#eee5d3'); draw=ImageDraw.Draw(sheet)
    for i,(name,im) in enumerate(pics):
        x=(i%4)*192; y=(i//4)*200
        sheet.paste(im.resize((160,160),Image.Resampling.NEAREST),(x+16,y+8),im.resize((160,160),Image.Resampling.NEAREST))
        draw.text((x+16,y+175),name,fill=INK)
    sheet.save(preview)

if __name__=='__main__':
    root=Path(__file__).resolve().parents[1]
    target=root/'packages/client/src/sprites64.json'
    run(target,target,root/'building-preview.png')
