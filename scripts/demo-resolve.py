# Resolves "@key" links of scripts/demo-data.json into Airtable record ids (keymap in scripts/demo-keymap.json).
import json, sys
FIELD = {'parties': {'game': 'fldlOoPOBV1f7C7VN', 'creator': 'fldhWCXLEEWEa5X9E'},
         'participations': {'party': 'fldwqgIYkOWuitIjx', 'player': 'fldcgjuCywGMzvZnZ'},
         'events': {'party': 'fldYX3NPtUQKjgtOB', 'player': 'fldUeaM60JMHwL7cr'}}
d = json.load(open('scripts/demo-data.json'))
km = json.load(open('scripts/demo-keymap.json'))
table, start, end = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
out = []
for r in d[table][start:end]:
    f = dict(r['fields'])
    for k, fid in FIELD[table].items():
        v = r.get(k)
        if v: f[fid] = [km[v[1:]] if v.startswith('@') else v]
    out.append({'fields': f})
print(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
