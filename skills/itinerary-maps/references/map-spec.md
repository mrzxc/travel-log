# 确定性地图生成器

`scripts/build_maps.py` 使用 Python 标准库和 Pillow。SVG 可编辑，PNG 是应用可导入底图。脚本不联网；坐标、真实 WGS84 GeoJSON 或已有底图由技能从行程和可靠来源准备。

没有现成地理数据时，先获取合适底图，而不是要求用户一定提供。国家/区域总览可参考 [Natural Earth 数据说明](https://www.naturalearthdata.com/about/) 与[维护者的国家 GeoJSON](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson)，其[使用条款](https://www.naturalearthdata.com/about/terms-of-use/)声明数据为公有领域。下载所需数据到本次输出的依赖目录，检查实际内容、尺度和坐标系，并记录版本/来源；不要把全球粗边界放大冒充城市街道图。城市/景点图应选足够精细的实际底图或用户提供地图，并按配准方式定位。

```bash
python <skill>/scripts/build_maps.py map-spec.json --out output/trip-maps-v1
```

输出目录须不存在或为空。默认输出图片和清单；`--project` 额外生成 `journey.travel`；`--static` 额外输出带入口名称/顺序及可选直线示意路线的 PNG，底图保持干净。脚本采用局部等距圆柱布局，适合区域总览，不支持街道渲染、道路规划或跨日期变更线裁切。

## 规格

```json
{
  "name":"欧洲旅行","rootId":"trip",
  "places":[
    {"id":"trip","name":"欧洲旅行","parentId":null},
    {"id":"italy","name":"意大利","parentId":"trip"},
    {"id":"rome","name":"罗马","parentId":"italy","lon":12.4964,"lat":41.9028,"source":"实际核实的坐标来源"},
    {"id":"venice","name":"威尼斯","parentId":"italy","lon":12.3155,"lat":45.4408,"source":"实际核实的坐标来源"}
  ],
  "maps":[{
    "ownerId":"trip","bounds":[5,36,20,49],"size":[1920,1080],
    "geojson":"geography/europe.geojson","source":"实际底图出处及署名",
    "pinIds":["rome","venice"],
    "contextLabels":[{"name":"意大利","lon":12,"lat":43}],
    "route":["rome","venice"]
  }]
}
```

- `places` 列表同一父节点下的顺序决定 children。回访记录在行程说明，不自动重复分类节点。
- `bounds` 为 `[west,south,east,north]`，WGS84，west < east，跨度不超过 180°，纬度在 `[-80,80]`。
- `geojson` 与 `baseImage` 二选一，路径相对规格文件。支持 Polygon/MultiPolygon/LineString/MultiLineString/GeometryCollection 及 Feature(Collection)。只有坐标而无地理底图会被拒绝。
- `baseImage` 为已有地图图片；每个入口必须在 `pinPositions` 提供手工定位/配准得到的 `[x,y]`，保留原图尺寸，忽略 size。脚本不会假定截图使用等距投影。
- `pinIds` 是本图唯一后代入口；GeoJSON 模式从经纬度算归一化坐标，目标必须在 bounds 内，不会静默夹到边缘。
- `contextLabels` 为背景地理文字，不重复交互入口名称，仅 GeoJSON 模式支持。
- `route` 仅在 `--static` 绘制确认过的示意连接，可重复地点表示回访；静态图会标明非实际道路。真实道路须另提供真实路线几何并用适合工具绘制。
- `font` 可设支持中文的字体文件；Windows 默认尝试微软雅黑，其他系统尝试 Noto CJK/DejaVu。出现方框字先配置字体。
- `palette` 可覆盖 `water/land/border/text/accent` 十六进制颜色；size 默认 1920×1080，可在 640×360 到 7680×4320 范围设定。

已有底图规格：

```json
{"ownerId":"trip","baseImage":"maps/source.png","source":"用户提供地图","pinIds":["rome"],"pinPositions":{"rome":[0.43,0.62]}}
```

## 输出

- `hierarchy.json`：分类树和地图路径。
- `map-manifest.json`：文件、尺寸、入口坐标、来源、因无素材隐藏的入口，以及被祖先标点遮住的入口。
- `map-spec.json`：依赖路径绝对化后的输入快照，仍引用原始边界/底图，不打包它们。
- 每图 `<ownerId>.png`、`<ownerId>.svg`；已有底图 SVG 内嵌原图。
- 可选 `<ownerId>-static.png`、`journey.travel`。项目引用输出 PNG 绝对路径，不引用技能目录。

实际打开图片核查南北、坐标、裁切、标签、路线和层级。空项目的隐藏入口是应用机制，不用假素材规避。局部投影不能用于要求测绘精度的场景。
