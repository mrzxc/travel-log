#!/usr/bin/env python3
"""Render confirmed map layouts from local WGS84 geometry or registered images."""
import argparse
import base64
import html
import json
import math
import re
import time
import uuid
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def require(condition, message):
    if not condition:
        raise ValueError(message)


def number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def write_json(file, value):
    file.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def geometries(obj):
    kind = obj.get("type")
    if kind == "FeatureCollection":
        for feature in obj["features"]:
            yield from geometries(feature)
    elif kind == "Feature":
        if obj.get("geometry"):
            yield from geometries(obj["geometry"])
    elif kind == "GeometryCollection":
        for geom in obj["geometries"]:
            yield from geometries(geom)
    elif kind in ("Polygon", "MultiPolygon", "LineString", "MultiLineString"):
        yield obj


def load_font(spec):
    candidates = [spec.get("font", ""), "C:/Windows/Fonts/msyh.ttc",
                  "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
                  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
    for name in candidates:
        if name and Path(name).is_file():
            return str(Path(name).resolve())
    raise ValueError("No usable font found; set spec.font to a font supporting the label language")


def validate(spec, base):
    require(isinstance(spec.get("name"), str) and spec["name"].strip(), "Missing trip name")
    places = spec.get("places", [])
    nodes = {}
    for place in places:
        ident = place.get("id", "")
        require(isinstance(ident, str) and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,63}", ident), "Unsafe place id")
        require(ident not in nodes, "Duplicate place id: " + ident)
        require(isinstance(place.get("name"), str) and place["name"].strip(), "Missing place name")
        nodes[ident] = dict(id=ident, name=place["name"], parentId=place.get("parentId"),
                            children=[], media=[], map=None, pins=[])
    root = spec.get("rootId")
    require(root in nodes and nodes[root]["parentId"] is None, "Invalid rootId")
    for node in nodes.values():
        parent = node["parentId"]
        if node["id"] != root:
            require(parent in nodes, "Missing parent for " + node["id"])
            nodes[parent]["children"].append(node["id"])
    seen = set()

    def visit(ident):
        require(ident not in seen, "Cycle or duplicate child")
        seen.add(ident)
        for child in nodes[ident]["children"]:
            visit(child)
    visit(root)
    require(len(seen) == len(nodes), "Unreachable places or cycle")
    maps = spec.get("maps", [])
    require(isinstance(maps, list) and maps, "No maps specified")
    owners = set()
    for layer in maps:
        owner = layer.get("ownerId")
        require(owner in nodes and owner not in owners, "Invalid or duplicate map owner")
        owners.add(owner)
        require(bool(layer.get("geojson")) != bool(layer.get("baseImage")), "Provide geojson OR baseImage")
        require(isinstance(layer.get("source"), str) and layer["source"].strip(), "Map source required")
        for field in ("geojson", "baseImage"):
            if layer.get(field):
                file = (base / layer[field]).resolve()
                require(file.is_file(), "Missing input: " + str(file))
                layer[field] = str(file)
        pins = layer.get("pinIds", [])
        require(isinstance(pins, list) and len(pins) == len(set(pins)), "Duplicate map pin")
        for target in pins:
            require(target in nodes and target != owner, "Invalid pin target")
            parent = nodes[target]["parentId"]
            while parent is not None and parent != owner:
                parent = nodes[parent]["parentId"]
            require(parent == owner, "Pin must point to a descendant: " + target)
        require(all(ident in pins for ident in layer.get("route", [])), "Route references non-pin place")
    return nodes


def render_geo(layer, places, palette, font_path):
    bounds = layer.get("bounds", [])
    require(len(bounds) == 4 and all(number(v) for v in bounds), "Invalid bounds")
    west, south, east, north = bounds
    require(-180 <= west < east <= 180 and east - west <= 180, "Split antimeridian/worldwide maps or use a geospatial renderer")
    require(-80 <= south < north <= 80, "Unsupported latitude range")
    w, h = layer.get("size", [1920, 1080])
    require(all(isinstance(v, int) and not isinstance(v, bool) for v in (w, h)) and 640 <= w <= 7680 and 360 <= h <= 4320, "Invalid image size")
    pad = min(w, h) * .065
    cosine = math.cos(math.radians((south + north) / 2))
    scale = min((w - 2 * pad) / ((east - west) * cosine), (h - 2 * pad) / (north - south))
    left = (w - (east - west) * cosine * scale) / 2
    top = (h - (north - south) * scale) / 2

    def point(lon, lat):
        require(number(lon) and number(lat) and -180 <= lon <= 180 and -90 <= lat <= 90, "Invalid WGS84 coordinate")
        return left + (lon - west) * cosine * scale, top + (north - lat) * scale

    image = Image.new("RGB", (w, h), palette["water"])
    draw = ImageDraw.Draw(image)
    shapes = []
    geometry = list(geometries(json.loads(Path(layer["geojson"]).read_text(encoding="utf-8-sig"))))
    require(geometry, "No supported geometry in GeoJSON")
    stroke = max(1, round(w / 1600))
    for geo in geometry:
        kind, coords = geo["type"], geo["coordinates"]
        if kind in ("Polygon", "MultiPolygon"):
            for rings in ([coords] if kind == "Polygon" else coords):
                paths = []
                for index, ring in enumerate(rings):
                    require(len(ring) >= 3, "Invalid polygon ring")
                    pixels = [point(c[0], c[1]) for c in ring]
                    draw.polygon(pixels, fill=palette["land"] if index == 0 else palette["water"])
                    draw.line(pixels + [pixels[0]], fill=palette["border"], width=stroke)
                    paths.append("M" + " L".join(f"{x:.3f},{y:.3f}" for x, y in pixels) + " Z")
                shapes.append(f'<path d="{" ".join(paths)}" fill="{palette["land"]}" fill-rule="evenodd" stroke="{palette["border"]}" stroke-width="{stroke}"/>')
        else:
            for line in ([coords] if kind == "LineString" else coords):
                pixels = [point(c[0], c[1]) for c in line]
                if len(pixels) < 2:
                    continue
                draw.line(pixels, fill=palette["border"], width=stroke)
                pts = " ".join(f"{x:.3f},{y:.3f}" for x, y in pixels)
                shapes.append(f'<polyline points="{pts}" fill="none" stroke="{palette["border"]}" stroke-width="{stroke}"/>')
    font_size = max(15, round(w / 80))
    font = ImageFont.truetype(font_path, font_size)
    for label in layer.get("contextLabels", []):
        require(west <= label["lon"] <= east and south <= label["lat"] <= north, "Context label outside bounds")
        x, y = point(label["lon"], label["lat"])
        draw.text((x, y), label["name"], font=font, fill=palette["text"], anchor="mm")
        shapes.append(f'<text x="{x:.3f}" y="{y:.3f}" text-anchor="middle" dominant-baseline="central" font-family="Microsoft YaHei,Noto Sans CJK SC,sans-serif" font-size="{font_size}" fill="{palette["text"]}">{html.escape(label["name"])}</text>')
    positions = {}
    for ident in layer.get("pinIds", []):
        p = places[ident]
        lon, lat = p.get("lon"), p.get("lat")
        require(number(lon) and number(lat), "Missing coordinate: " + ident)
        require(west <= lon <= east and south <= lat <= north, "Pin outside map bounds: " + ident)
        require(p.get("source"), "Coordinate source required: " + ident)
        x, y = point(lon, lat)
        positions[ident] = [x / w, y / h]
    return image, shapes, positions


def render_image(layer):
    with Image.open(layer["baseImage"]) as original:
        image = original.convert("RGB")
    require(image.width >= 640 and image.height >= 360, "Existing map is too small")
    positions = {}
    for ident in layer.get("pinIds", []):
        xy = layer.get("pinPositions", {}).get(ident)
        require(isinstance(xy, list) and len(xy) == 2 and all(number(v) and 0 <= v <= 1 for v in xy), "Missing/invalid image registration: " + ident)
        positions[ident] = xy
    # Embed a PNG so the SVG is self-contained regardless of original image format.
    import io
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    shapes = [f'<image href="data:image/png;base64,{encoded}" width="{image.width}" height="{image.height}"/>']
    return image, shapes, positions


def build(spec_file, output, project=False, static=False):
    spec_file, output = Path(spec_file).resolve(), Path(output).resolve()
    spec = json.loads(spec_file.read_text(encoding="utf-8-sig"))
    nodes = validate(spec, spec_file.parent)
    require(not output.exists() or (output.is_dir() and not any(output.iterdir())), "Output directory must be new or empty")
    palette = dict(water="#edf1e9", land="#cddbbd", border="#91a47b", text="#4a6040", accent="#315e46")
    palette.update(spec.get("palette", {}))
    require(all(re.fullmatch(r"#[0-9a-fA-F]{6}", v) for v in palette.values()), "Use #RRGGBB palette colors")
    if spec.get("font"):
        spec["font"] = str((spec_file.parent / spec["font"]).resolve())
    font_path = load_font(spec)
    places = {p["id"]: p for p in spec["places"]}
    # Finish all layout validation before writing artifacts.
    rendered = []
    for layer in spec["maps"]:
        image, shapes, positions = render_geo(layer, places, palette, font_path) if layer.get("geojson") else render_image(layer)
        rendered.append((layer, image, shapes, positions))
    output.mkdir(parents=True, exist_ok=True)
    manifest = []
    map_owners = {m["ownerId"] for m in spec["maps"]}
    now = round(time.time() * 1000)
    for layer, image, shapes, positions in rendered:
        owner = layer["ownerId"]
        png, svg = output / f"{owner}.png", output / f"{owner}.svg"
        w, h = image.size
        source = layer["source"]
        # Credit appears on both outputs and never implies route accuracy.
        size = max(11, round(w / 135))
        ImageDraw.Draw(image).text((18, h - 18), source, font=ImageFont.truetype(font_path, size), fill=palette["text"], anchor="ls")
        shapes.append(f'<text x="18" y="{h-18}" font-family="Microsoft YaHei,Noto Sans CJK SC,sans-serif" font-size="{size}" fill="{palette["text"]}">{html.escape(source)}</text>')
        image.save(png)
        svg.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs><clipPath id="canvas"><rect width="{w}" height="{h}"/></clipPath></defs><rect width="{w}" height="{h}" fill="{palette["water"]}"/><g clip-path="url(#canvas)">{"".join(shapes)}</g></svg>', encoding="utf-8")
        pins = [dict(nodeId=ident, x=xy[0], y=xy[1]) for ident, xy in positions.items()]
        nodes[owner]["map"] = dict(id=str(uuid.uuid4()), path=str(png), name=png.name, type="image", time=now)
        nodes[owner]["pins"] = pins
        hidden = [ident for ident in positions if ident not in map_owners]
        effective = set(positions) - set(hidden)
        occluded = []
        for ident in effective:
            parent = nodes[ident]["parentId"]
            while parent and parent != owner:
                if parent in effective:
                    occluded.append(ident)
                    break
                parent = nodes[parent]["parentId"]
        entry = dict(ownerId=owner, png=str(png), svg=str(svg), size=[w, h], pins=pins,
                     source=source, coordinateSources={ident:places[ident].get("source", "user image registration") for ident in positions},
                     hiddenUntilMediaImported=hidden, occludedByAncestor=sorted(occluded))
        if static:
            preview = image.copy()
            draw = ImageDraw.Draw(preview)
            route = layer.get("route", [])
            if len(route) > 1:
                draw.line([(positions[i][0] * w, positions[i][1] * h) for i in route], fill=palette["accent"], width=max(2, w // 500))
                draw.text((18, h-45), "顺序示意连线，非实际道路", font=ImageFont.truetype(font_path, size), fill=palette["text"])
            label_font = ImageFont.truetype(font_path, max(16, w // 85))
            for index, (ident, xy) in enumerate(positions.items(), 1):
                x, y = xy[0] * w, xy[1] * h
                radius = max(6, w / 240)
                draw.ellipse((x-radius, y-radius, x+radius, y+radius), fill=palette["accent"], outline="white", width=2)
                visits = [str(i + 1) for i, stop in enumerate(route) if stop == ident]
                prefix = "/".join(visits) if visits else str(index)
                text = f"{prefix}. {places[ident]['name']}"
                box = draw.textbbox((0, 0), text, font=label_font)
                tx = min(max(8, x + radius + 7), max(8, w - (box[2] - box[0]) - 8))
                ty = min(max(8, y - 12), h - 60)
                draw.text((tx, ty), text, font=label_font, fill=palette["text"], stroke_width=3, stroke_fill=palette["water"])
            file = output / f"{owner}-static.png"
            preview.save(file)
            entry["static"] = str(file)
        manifest.append(entry)
    write_json(output / "map-spec.json", spec)
    write_json(output / "hierarchy.json", dict(name=spec["name"], rootId=spec["rootId"], nodes=nodes))
    write_json(output / "map-manifest.json", manifest)
    if project:
        write_json(output / "journey.travel", dict(version=1, id=str(uuid.uuid4()), name=spec["name"], rootId=spec["rootId"], nodes=nodes))
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("spec")
    parser.add_argument("--out", required=True)
    parser.add_argument("--project", action="store_true")
    parser.add_argument("--static", action="store_true")
    args = parser.parse_args()
    try:
        result = build(args.spec, args.out, project=args.project, static=args.static)
    except (ValueError, OSError, KeyError, TypeError) as exc:
        parser.exit(1, f"Map generation failed: {exc}\n")
    print(json.dumps(dict(output=str(Path(args.out).resolve()), maps=len(result)), ensure_ascii=False))


if __name__ == "__main__":
    main()
