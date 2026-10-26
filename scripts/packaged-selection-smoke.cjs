const { _electron: electron } = require(
  process.env.PLAYWRIGHT_PATH ||
    "C:/Users/10559/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const fs = require("node:fs/promises");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const assert = require("node:assert/strict");
(async () => {
  const dir = path.resolve(".test-data/route-selection-packaged");
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir("artifacts", { recursive: true });
  const image = path.join(dir, "cover.png");
  execFileSync(
    require("ffmpeg-static"),
    [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=0xa0b18c:s=1200x800",
      "-frames:v",
      "1",
      "-y",
      image,
    ],
    { windowsHide: true },
  );
  const asset = (id) => ({
    id,
    path: image,
    name: "封面.png",
    type: "image",
    time: 1,
  });
  const place = (id, name, media = [], coverAsset) => ({
    id,
    name,
    parentId: "root",
    children: [],
    media,
    map: null,
    pins: [],
    coverAsset,
  });
  const project = {
    version: 1,
    id: "static-pin",
    name: "封面标点测试",
    rootId: "root",
    nodes: {
      root: {
        ...place("root", "旅行"),
        parentId: null,
        children: ["static", "playable", "hidden"],
        map: asset("map"),
        pins: [
          { nodeId: "static", x: 0.3, y: 0.5 },
          { nodeId: "playable", x: 0.7, y: 0.5 },
          { nodeId: "hidden", x: 0.5, y: 0.25 },
        ],
      },
      static: place("static", "仅展示封面", [], asset("independent")),
      playable: place("playable", "正常素材入口", [asset("photo")]),
      hidden: place("hidden", "隐藏空地点"),
    },
  };
  project.nodes.root.routes=[
 {id:'arc',points:[{x:.25,y:.65},{x:.5,y:.65},{x:.75,y:.65}],transport:'plane',duration:2},
 {id:'old-line',points:[{x:.3,y:.3},{x:.7,y:.3}],transport:'car',duration:1},
 {id:'spare',points:[{x:.3,y:.18},{x:.7,y:.18}],transport:'jeep',duration:2}
];
  const file = path.join(dir, "editor-test.travel");
  await fs.writeFile(file, JSON.stringify(project));
  const env = {
    ...process.env,
    TRAVEL_SMOKE: "1",
    TRAVEL_USER_DATA: path.join(dir, "userData"),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.TRAVEL_DEV_URL;
  const app = await electron.launch({
    executablePath: process.env.TRAVEL_TEST_EXE || require("electron"),
    args: process.env.TRAVEL_TEST_EXE ? [] : [path.resolve(".")],
    env,
  });
  try {
    const page = await app.firstWindow();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
    }, file);
    await page.getByRole("button", { name: "打开项目", exact: true }).click();


    await page.getByRole('button',{name:/地图与标点/}).click();await page.locator('.map-editor .map-image').evaluate(img=>img.decode());
    await page.getByRole('button',{name:'放大编辑',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:/地图编辑/}),arc=dialog.locator('[data-route="arc"]');
    await page.waitForFunction(()=>{const canvas=document.querySelector('.expanded-map-editor'),sheet=canvas?.querySelector('.map-sheet'),img=canvas?.querySelector('.map-image');return img && Math.abs(parseFloat(sheet.style.width)-Math.min(canvas.clientWidth/img.naturalWidth,canvas.clientHeight/img.naturalHeight)*img.naturalWidth)<1;});
    const initial=await arc.locator('[data-route-line]').getAttribute('d');
    const p=await arc.locator('[data-route-segment="0"]').evaluate(path=>{const p=path.getPointAtLength(path.getTotalLength()/2),s=new DOMPoint(p.x,p.y).matrixTransform(path.getScreenCTM());return{x:s.x,y:s.y};});
    await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x,p.y-25,{steps:5});await page.mouse.up();
    assert.equal(await arc.locator('[data-route-line]').getAttribute('d'),initial);assert.equal(await arc.locator('[data-route-point]').count(),3);
    await dialog.getByRole('button',{name:'地点与标点',exact:true}).click();await dialog.getByRole('button',{name:'路线与动画',exact:true}).click();
    const endpoint=await arc.locator('[data-route-point="0"]').boundingBox();
    await page.mouse.move(endpoint.x+endpoint.width/2,endpoint.y+endpoint.height/2);await page.mouse.down();await page.mouse.move(endpoint.x+endpoint.width/2+25,endpoint.y+endpoint.height/2-15,{steps:5});await page.mouse.up();
    await page.waitForTimeout(800);
    let saved=JSON.parse(await fs.readFile(file,'utf8'));assert(saved.nodes.root.routes[0].points[0].x>.25);
    await dialog.getByRole('button',{name:'路线与动画',exact:true}).click();
    const input=dialog.getByLabel('第1步时长');await input.fill('2.5');await input.press('Backspace');assert.equal(await dialog.locator('[data-route]').count(),3);
    await dialog.getByRole('button',{name:'选择第1步路线',exact:true}).click();await page.keyboard.press('Delete');assert.equal(await dialog.locator('[data-route="arc"]').count(),0);
    const from=await dialog.getByRole('button',{name:'拖动第2步路线排序',exact:true}).boundingBox(),to=await dialog.getByRole('button',{name:'拖动第1步路线排序',exact:true}).boundingBox();
    await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(from.x+from.width/2,from.y+from.height/2-15,{steps:3});await page.mouse.move(to.x+to.width/2,to.y+to.height/2-5,{steps:8});await page.waitForTimeout(150);await page.mouse.up();
    await page.waitForTimeout(800);saved=JSON.parse(await fs.readFile(file,'utf8'));assert.deepEqual(saved.nodes.root.routes.map(r=>r.id),['spare','old-line']);
    await dialog.getByRole('button',{name:/完成编辑/}).click();await page.getByRole('button',{name:'开始演示',exact:true}).click();await page.locator('.presentation').getByRole('button',{name:'下一步',exact:true}).click();await page.locator('.presentation [data-route="spare"]').waitFor();
    assert.equal(await page.locator('.presentation [data-route-point]').count(),0);assert.deepEqual(errors,[]);
    console.log('Packaged selection passed: first-click guard, endpoint drag and save, input-safe Delete, pointer sorting and presentation order.');
  } finally { await app.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
