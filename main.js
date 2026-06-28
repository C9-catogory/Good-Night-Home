import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const SAVE_KEY = "good-night-home-v10-progressive-room";

const CHAPTERS = [
  {id:1,key:"lamp",title:"点灯房",theme:"我在这里",skill:"空间锚点",goal:"点亮床头灯，拾起第一枚记忆星尘。",knowledge:"当世界太大时，先找一个锚点：一盏灯、一个床边、一次呼吸。"},
  {id:2,key:"entry",title:"玄关之门",theme:"明天的入口",skill:"物品地址法",goal:"把钥匙放进月光托盘。",knowledge:"记忆不是硬撑。高风险物品需要固定地址，让空间替你记住。"},
  {id:3,key:"bedside",title:"床头恢复站",theme:"身体可以休息",skill:"五感降载",goal:"把水杯和耳塞放到床头恢复区。",knowledge:"低能量时需要伸手可及的恢复工具。身体安全感先于道理。"},
  {id:4,key:"desk",title:"书桌归档台",theme:"未完成先放下",skill:"工作记忆外化",goal:"把待办本放到书桌收件箱，写下一个未完成。",knowledge:"脑子不是仓库。把未完成放进外部容器，才有空间睡觉。"},
  {id:5,key:"emotion",title:"情绪云房",theme:"感受获得名字",skill:"情绪命名与扩展",goal:"选择情绪、下层担心和需要，把情绪云放进容器。",knowledge:"情绪不是命令，而是信息。命名以后，它会从整片雾变成一朵云。"},
  {id:6,key:"parts",title:"毯子角",theme:"内在小队初见",skill:"部分安放",goal:"遇见小小云，并给它一句允许休息的话。",knowledge:"脆弱的部分不是敌人。它可能只是太早学会了躲起来。"},
  {id:7,key:"boundary",title:"边界门",theme:"什么可以进来",skill:"温柔边界",goal:"在门牌上写下一句边界句。",knowledge:"温柔不是无限让步。边界是让关系可以继续存在的门框。"},
  {id:8,key:"stargate",title:"星湾",theme:"带着小家出发",skill:"价值小行动",goal:"选择一个明天小行动，生成星湾整合卡。",knowledge:"完整不是没有矛盾，而是可以带着矛盾继续生活。"}
];

const QUESTS = [
  {id:"lamp", text:"点亮第一盏灯"},
  {id:"memory", text:"记忆星尘进入月光盒"},
  {id:"key", text:"钥匙进入月光托盘"},
  {id:"bedside", text:"水杯和耳塞进入床头恢复区"},
  {id:"desk", text:"待办本进入书桌收件箱"},
  {id:"emotion", text:"情绪云被命名并安放"},
  {id:"parts", text:"小小云被看见"},
  {id:"boundary", text:"写下一句边界句"},
  {id:"stargate", text:"选择明天小行动"}
];

const ITEMS = {
  memory:{name:"记忆星尘", icon:"✦", home:"moonBox", chapter:1, why:"模糊记忆先进入容器，之后再慢慢解释。"},
  key:{name:"钥匙", icon:"🔑", home:"tray", chapter:2, why:"钥匙住在托盘，明天不用靠焦虑记住它。"},
  water:{name:"水杯", icon:"💧", home:"bedShelf", chapter:3, why:"水放在伸手可及处，身体不必半夜搜索。"},
  earplug:{name:"耳塞", icon:"🫧", home:"bedShelf", chapter:3, why:"声音守护工具放在床头，低能量时也能找到。"},
  notebook:{name:"待办本", icon:"📒", home:"inbox", chapter:4, why:"未完成先停进外部容器，脑子不用整夜保管。"}
};

const CONTAINER_ACCEPT = {
  moonBox:["memory"],
  tray:["key"],
  bedShelf:["water","earplug"],
  inbox:["notebook"]
};

let state = loadSave();
let scene, camera, renderer, controls, raycaster, mouse;
let hotspots = [];
let pickables = {};
let containers = {};
let labels = [];
let held = null;
let selectedHotspotIndex = -1;
let lights = {};
let unlockGroups = {};

function freshSave(){
  return {
    chapter:1,
    done:{},
    placed:{},
    lampLevel:0,
    notes:[],
    boundaryText:"",
    valueAction:"",
    emotion:null,
    emotionUnder:null,
    emotionNeed:null,
    cloudMet:false,
    dialogue:"欢迎回来。今晚的房间会一层一层亮起来，不急着通关。"
  };
}
function loadSave(){ try{return JSON.parse(localStorage.getItem(SAVE_KEY)) || freshSave()}catch(e){return freshSave()} }
function save(){ localStorage.setItem(SAVE_KEY, JSON.stringify(state)); updateUI(); }
function markDone(id){ state.done[id]=true; state.lampLevel = Math.max(state.lampLevel, completedCount()); save(); updateLighting(); updateVisibility(); }
function setDialogue(text){ state.dialogue=text; document.getElementById("dialogue").textContent=text; save(); }
function completedCount(){ return QUESTS.filter(q=>state.done[q.id]).length; }
function currentChapter(){ return CHAPTERS[state.chapter-1] || CHAPTERS[0]; }
function canUseChapter(ch){ return ch <= state.chapter; }

init();
animate();

function init(){
  const container = document.getElementById("three-container");
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x17142a);
  scene.fog = new THREE.Fog(0x17142a, 4.8, 10.5);

  camera = new THREE.PerspectiveCamera(48, container.clientWidth/container.clientHeight, 0.01, 50);
  camera.position.set(0, 1.35, 4.75);

  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.05, 0);
  controls.enableDamping = true;
  controls.dampingFactor = .08;
  controls.minDistance = 2.75;
  controls.maxDistance = 5.7;
  controls.minPolarAngle = Math.PI * .28;
  controls.maxPolarAngle = Math.PI * .57;
  controls.enablePan = false;
  controls.rotateSpeed = .42;
  controls.zoomSpeed = .55;

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  buildRoom();
  buildFurniture();
  buildLights();
  buildInteractives();
  updateLighting();
  updateVisibility();

  window.addEventListener("resize", onResize);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("click", onClick);
  window.addEventListener("keydown", e=>{
    if(e.key === "Tab"){ e.preventDefault(); cycleHotspot(); }
  });

  bindUI();
  updateUI();
  setDialogue(state.dialogue);
}

function mat(color, rough=0.85, metal=0){
  return new THREE.MeshStandardMaterial({color, roughness:rough, metalness:metal});
}
function softMat(color, opacity=.72){
  return new THREE.MeshStandardMaterial({color, transparent:true, opacity, roughness:.75});
}
function makeBox(name, size, pos, material, cast=true){
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...pos);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}
function makeGroup(ch){
  const g = new THREE.Group();
  g.userData.chapter = ch;
  scene.add(g);
  unlockGroups[ch] = unlockGroups[ch] || [];
  unlockGroups[ch].push(g);
  return g;
}

function buildRoom(){
  const W=4.2,D=3.2,H=2.6;
  makeBox("floor", [W,.06,D], [0,-.03,0], mat(0xf2dcc4));
  makeBox("back wall", [W,H,.06], [0,H/2,-D/2], mat(0xf7eadf), false);
  makeBox("left wall", [.06,H,D], [-W/2,H/2,0], mat(0xefe8fb), false);
  makeBox("right wall", [.06,H,D], [W/2,H/2,0], mat(0xe9f2f0), false);

  const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.0,.025,64), softMat(0xc7b0ef,.42));
  rug.rotation.x = Math.PI/2;
  rug.position.set(-.3,.025,.15);
  rug.receiveShadow = true;
  scene.add(rug);

  // window and moon
  makeBox("moon window", [1.05,.72,.04], [.35,1.55,-D/2+.04], mat(0x202b62), false);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(.12,32,16), new THREE.MeshBasicMaterial({color:0xffefbf}));
  moon.position.set(.65,1.68,-D/2+.085);
  scene.add(moon);

  // subtle door / boundary
  makeBox("soft boundary door", [.08,1.55,.9], [2.06,.78,.52], mat(0xe7c397));
  addLabel("真实房间 4.2m × 3.2m", [0,.08,1.44], "scale");
}

function buildFurniture(){
  // bed and nightstand
  makeBox("bed base", [1.75,.34,1.12], [-1.08,.17,-.75], mat(0xd8c8f2));
  makeBox("mattress", [1.7,.18,1.08], [-1.08,.43,-.75], mat(0xf7edf6));
  makeBox("pillow", [.72,.14,.35], [-1.35,.62,-1.12], mat(0xfff7ed));
  makeBox("nightstand", [.58,.62,.48], [-.08,.31,-1.08], mat(0xe4b986));
  const drawer = makeBox("drawer", [.5,.18,.34], [-.08,.36,-1.0], mat(0xf4d7a7));
  drawer.userData.drawer = true;
  containers.drawer = drawer;

  // desk
  makeBox("desk", [1.05,.12,.52], [1.05,.75,-.92], mat(0xe9bd84));
  makeBox("desk leg 1", [.08,.7,.08], [.62,.35,-.72], mat(0xd7a775));
  makeBox("desk leg 2", [.08,.7,.08], [1.48,.35,-.72], mat(0xd7a775));

  // entry shelf
  makeBox("entry shelf", [.8,.75,.36], [1.35,.375,.55], mat(0xe8c59a));

  // blanket corner
  const blanket = new THREE.Mesh(new THREE.SphereGeometry(.34,32,16), softMat(0xbfded0,.78));
  blanket.scale.set(1.35,.42,1);
  blanket.position.set(-1.45,.34,.62);
  blanket.castShadow = true; blanket.receiveShadow = true; blanket.name = "毯子角";
  scene.add(blanket);

  // soft arch for stargate
  const arch = makeBox("星湾门", [.12,1.4,.95], [0, .7, 1.43], softMat(0xc7b0ef,.45), false);
  arch.userData.chapter = 8;
  unlockGroups[8] = unlockGroups[8] || [];
  unlockGroups[8].push(arch);
}

function buildLights(){
  scene.add(new THREE.HemisphereLight(0xfff3d1, 0x3b3157, .72));
  const moon = new THREE.DirectionalLight(0xc9dcff, .75);
  moon.position.set(-2.5,3.8,3.2);
  moon.castShadow = true;
  scene.add(moon);

  lights.lamp = new THREE.PointLight(0xffd88c, .45, 4.2);
  lights.lamp.position.set(-.15,.95,-1.05);
  lights.lamp.castShadow = true;
  scene.add(lights.lamp);

  lights.entry = new THREE.PointLight(0xffe3a6, 0, 3.2);
  lights.entry.position.set(1.4,1.2,.55);
  scene.add(lights.entry);

  lights.bed = new THREE.PointLight(0xbfeaff, 0, 3.2);
  lights.bed.position.set(-1.1,1.15,-.65);
  scene.add(lights.bed);

  lights.desk = new THREE.PointLight(0xcbb4ff, 0, 3.0);
  lights.desk.position.set(1.05,1.2,-.92);
  scene.add(lights.desk);

  lights.emotion = new THREE.PointLight(0xf0aebe, 0, 3.0);
  lights.emotion.position.set(-1.45,1.15,.62);
  scene.add(lights.emotion);

  // dust stars
  const starGeo = new THREE.SphereGeometry(.012,8,8);
  for(let i=0;i<140;i++){
    const m = new THREE.MeshBasicMaterial({color:0xffedb7, transparent:true, opacity:THREE.MathUtils.randFloat(.25,.72)});
    const s = new THREE.Mesh(starGeo,m);
    s.position.set(THREE.MathUtils.randFloatSpread(3.5), THREE.MathUtils.randFloat(.62,2.25), THREE.MathUtils.randFloatSpread(2.65));
    s.userData.float = {baseY:s.position.y, speed:THREE.MathUtils.randFloat(.35,.9), phase:Math.random()*10};
    scene.add(s);
  }
}

function updateLighting(){
  const n = completedCount();
  lights.lamp.intensity = state.done.lamp ? 2.25 : .45;
  lights.entry.intensity = state.done.key ? 1.2 : (state.chapter >= 2 ? .45 : 0);
  lights.bed.intensity = state.done.bedside ? 1.25 : (state.chapter >= 3 ? .4 : 0);
  lights.desk.intensity = state.done.desk ? 1.1 : (state.chapter >= 4 ? .35 : 0);
  lights.emotion.intensity = (state.done.emotion || state.done.parts) ? 1.35 : (state.chapter >= 5 ? .45 : 0);
  scene.fog.near = 4.3 + n*.18;
  scene.fog.far = 8.4 + n*.28;
}

function updateVisibility(){
  Object.entries(unlockGroups).forEach(([ch,objs])=>{
    const visible = Number(ch) <= state.chapter;
    objs.forEach(o=>o.visible = visible);
  });
  Object.entries(pickables).forEach(([id,obj])=>{
    const item = ITEMS[id];
    obj.visible = item.chapter <= state.chapter && !state.placed[id] && held !== id;
  });
}

function buildInteractives(){
  makeHotspot("lamp", "床头灯｜点亮第一盏灯", [-.15,.82,-1.05], .12, 0xffd88c, ()=>{
    markDone("lamp");
    setDialogue("灯亮了。第一章不是整理，而是让身体知道：我在这里。");
    setSkill("空间锚点", "当世界太大时，先找一个锚点：一盏灯、一个床边、一次呼吸。");
    advanceIfReady(2);
  }, 1);

  makeHotspot("drawer", "床头抽屉｜打开容器", [-.08,.50,-.78], .12, 0xffefbf, ()=>{
    const drawer = containers.drawer;
    drawer.position.z = -.68;
    setDialogue("抽屉打开了。容器不是把东西藏起来，而是让它们能被再次找到。");
    setSkill("容器化", "抽屉、盒子、托盘都是外部工作记忆。它们替大脑承载细节。");
  }, 1);

  makeContainer("moonBox", "月光盒｜安放记忆星尘", [1.05,.88,-1.05], .16, 0xc7b0ef, 1);
  makeContainer("tray", "月光托盘｜安放钥匙", [1.35,.84,.45], .15, 0xffe3a6, 2);
  makeContainer("bedShelf", "床头恢复区｜水和耳塞", [-.48,.83,-1.08], .15, 0xbfeaff, 3);
  makeContainer("inbox", "书桌收件箱｜未完成", [1.04,.92,-.88], .15, 0xcbb4ff, 4);

  makePickable("memory", "记忆星尘", [.58,1.05,-.58], 0xffefbf);
  makePickable("key", "钥匙", [.92,.82,.18], 0xffd26f);
  makePickable("water", "水杯", [-.75,.86,-.98], 0x9bd7ff);
  makePickable("earplug", "耳塞", [-.62,.78,-.82], 0xe7f5ff);
  makePickable("notebook", "待办本", [1.45,.84,-.72], 0xc7b0ef);

  makeHotspot("emotionCloud", "情绪云｜命名并安放", [-1.45,.8,.62], .18, 0xf0aebe, ()=>{
    openEmotion();
  }, 5);

  makeHotspot("littleCloud", "小小云｜内在部分", [-1.62,.58,.62], .16, 0xcfeee0, ()=>{
    state.cloudMet = true;
    markDone("parts");
    setDialogue("你遇见了小小云。它不是麻烦，它只是很早就学会躲起来。");
    setSkill("部分安放", "脆弱的部分不需要被赶走。它可以先坐在毯子里，被看见，而不用解释全部过去。");
    openModal("🌧 小小云", `
      <p>小小云把毯子拉到鼻尖。它说：</p>
      <p><b>“我不是不想长大。我只是很久没有一个可以慢慢醒来的地方。”</b></p>
      <p>你可以给它一句话：今晚不用证明自己已经好了。你可以先休息。</p>
    `);
    advanceIfReady(7);
  }, 6);

  makeHotspot("boundaryDoor", "边界门｜写一句边界", [1.97,.92,.52], .17, 0xffe3a6, ()=>{
    openBoundary();
  }, 7);

  makeHotspot("stargate", "星湾｜明天小行动", [0,.86,1.36], .2, 0xc7b0ef, ()=>{
    openValueAction();
  }, 8);
}

function makeHotspot(id,name,pos,radius,color,action,chapter=1){
  const sphere = roundedGlow(pos,color,radius);
  sphere.name = name;
  sphere.userData = {id,name,action,hotspot:true,chapter};
  hotspots.push(sphere);
  addLabel(name, [pos[0],pos[1]+radius+.15,pos[2]], "hotspot", chapter);
  registerUnlock(sphere, chapter);
  return sphere;
}

function makeContainer(id,name,pos,radius,color,chapter=1){
  const mesh = roundedGlow(pos,color,radius);
  mesh.name = name;
  mesh.userData = {id,name,container:true,hotspot:true,chapter,action:()=>tryContainer(id)};
  hotspots.push(mesh);
  containers[id] = mesh;
  addLabel(name, [pos[0],pos[1]+radius+.15,pos[2]], "hotspot", chapter);
  registerUnlock(mesh, chapter);
}

function makePickable(id,name,pos,color){
  const item = ITEMS[id];
  const geo = id === "key" ? new THREE.TorusKnotGeometry(.07,.022,70,10) :
              id === "water" ? new THREE.CylinderGeometry(.055,.055,.16,24) :
              id === "earplug" ? new THREE.SphereGeometry(.055,24,12) :
              id === "notebook" ? new THREE.BoxGeometry(.18,.035,.13) :
              new THREE.OctahedronGeometry(.09,0);
  const material = new THREE.MeshStandardMaterial({color, emissive:color, emissiveIntensity:.34, roughness:.42});
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(...pos);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.userData = {id,name,pickable:true,hotspot:true,chapter:item.chapter,action:()=>pickItem(id)};
  scene.add(mesh);
  hotspots.push(mesh);
  pickables[id] = mesh;
  addLabel(name, [pos[0],pos[1]+.18,pos[2]], "hotspot", item.chapter);
  registerUnlock(mesh, item.chapter);
}

function registerUnlock(obj, chapter){
  unlockGroups[chapter] = unlockGroups[chapter] || [];
  unlockGroups[chapter].push(obj);
}

function roundedGlow(pos,color=0xffe7a2,size=.08){
  const geo = new THREE.SphereGeometry(size,24,16);
  const m = new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85});
  const s = new THREE.Mesh(geo,m);
  s.position.set(...pos);
  scene.add(s);
  const light = new THREE.PointLight(color,.55,1.6);
  light.position.set(...pos);
  scene.add(light);
  s.userData.linkedLight = light;
  return s;
}

function addLabel(text,pos,kind,chapter=1){
  const canvas=document.createElement("canvas");
  canvas.width=512; canvas.height=128;
  const ctx=canvas.getContext("2d");
  ctx.fillStyle="rgba(255,248,230,.82)";
  roundRect(ctx,8,18,496,82,32); ctx.fill();
  ctx.fillStyle="#4f4254";
  ctx.font="bold 32px -apple-system, BlinkMacSystemFont, 'Microsoft YaHei', Arial";
  ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(text,256,59);
  const tex=new THREE.CanvasTexture(canvas);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,opacity:.92}));
  sprite.scale.set(1.05,.26,1);
  sprite.position.set(...pos);
  sprite.userData.kind=kind;
  scene.add(sprite);
  labels.push(sprite);
  registerUnlock(sprite, chapter);
  return sprite;
}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}

function pickItem(id){
  const item = ITEMS[id];
  if(item.chapter > state.chapter){
    setDialogue("这个物品还没有准备好出现。先完成当前章节。");
    return;
  }
  if(held){
    setDialogue("你已经拿着 " + ITEMS[held].name + "。先找一个能让它休息的位置。");
    return;
  }
  held = id;
  pickables[id].visible = false;
  setDialogue("你拿起了 " + item.name + "。小理：先想它的功能，再找容器。");
  updateUI();
}

function tryContainer(id){
  if(!held){
    const name = containers[id]?.name || id;
    setDialogue(name + " 正在发光。它可以替你承载一部分细节。");
    setSkill("容器化", "容器不是逃避，而是给信息一个暂时的位置。");
    return;
  }
  const accepts = CONTAINER_ACCEPT[id] || [];
  const item = ITEMS[held];
  if(accepts.includes(held)){
    state.placed[held] = id;
    makePlacedIcon(item.icon, containers[id].position);
    setDialogue(item.icon + " " + item.name + " 被安放了。小理：" + item.why);
    setSkill(item.name + " 的安放", item.why);
    const justHeld = held;
    held = null;
    if(justHeld === "memory") markDone("memory"), advanceIfReady(2);
    if(justHeld === "key") markDone("key"), advanceIfReady(3);
    if(state.placed.water === "bedShelf" && state.placed.earplug === "bedShelf"){ markDone("bedside"); advanceIfReady(4); }
    if(justHeld === "notebook"){ markDone("desk"); advanceIfReady(5); }
    save();
  }else{
    setDialogue("这个容器不太合适。试试问：它明天在哪里最需要被找到？");
    pulse(containers[id]);
  }
  updateUI();
}

function makePlacedIcon(icon,pos){
  const canvas=document.createElement("canvas");
  canvas.width=128; canvas.height=128;
  const ctx=canvas.getContext("2d");
  ctx.font="72px serif"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(icon,64,66);
  const tex=new THREE.CanvasTexture(canvas);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
  sprite.scale.set(.28,.28,1);
  sprite.position.copy(pos); sprite.position.y += .18 + Math.random()*0.05; sprite.position.x += Math.random()*0.08 - .04;
  scene.add(sprite);
  return sprite;
}

function pulse(obj){
  const start=obj.scale.clone(); let t=0;
  const timer=setInterval(()=>{ t+=.15; const s=1+Math.sin(t*8)*.06; obj.scale.set(start.x*s,start.y*s,start.z*s); if(t>1){clearInterval(timer);obj.scale.copy(start);}},16);
}

function advanceIfReady(next){
  if(state.chapter < next){
    state.chapter = next;
    const ch = currentChapter();
    setDialogue(`下一盏灯亮了：${ch.title}。${ch.knowledge}`);
    save();
    updateLighting();
    updateVisibility();
  }
}

function openEmotion(){
  const emotions=["焦虑","委屈","愤怒","疲惫","麻木","害怕"];
  const under=["害怕找不到东西","害怕失控","需求没被看见","太累了还要撑","信息太多","需要安全"];
  const needs=["固定位置","一个容器","少一点选择","边界","休息","明天小行动"];
  openModal("☁️ 情绪云房", `
    <p>情绪不是命令，而是信息。先命名，再扩展，再转成支持。</p>
    <div class="choice-grid">
      ${emotions.map(e=>`<button data-emotion="${e}"><b>${e}</b><br><span>第一层命名</span></button>`).join("")}
    </div>
    <div class="choice-grid">
      ${under.map(e=>`<button data-under="${e}"><b>${e}</b><br><span>下面可能是什么</span></button>`).join("")}
    </div>
    <div class="choice-grid">
      ${needs.map(e=>`<button data-need="${e}"><b>${e}</b><br><span>转成支持</span></button>`).join("")}
    </div>
    <p><button id="save-emotion">安放这朵云</button></p>
  `);
  setTimeout(()=>{
    document.querySelectorAll("[data-emotion]").forEach(b=>b.onclick=()=>{state.emotion=b.dataset.emotion; b.style.outline="3px solid rgba(242,201,111,.55)";});
    document.querySelectorAll("[data-under]").forEach(b=>b.onclick=()=>{state.emotionUnder=b.dataset.under; b.style.outline="3px solid rgba(242,201,111,.55)";});
    document.querySelectorAll("[data-need]").forEach(b=>b.onclick=()=>{state.emotionNeed=b.dataset.need; b.style.outline="3px solid rgba(242,201,111,.55)";});
    document.getElementById("save-emotion").onclick=()=>{
      if(!state.emotion) state.emotion="模糊的云";
      markDone("emotion");
      closeModal();
      setDialogue(`情绪云被安放了：${state.emotion} → ${state.emotionUnder||"还在形成"} → 需要${state.emotionNeed||"一个容器"}。`);
      setSkill("情绪命名与扩展", "命名不是把情绪消灭，而是让它从整片雾变成可以被承载的一朵云。");
      advanceIfReady(6);
    };
  },0);
}

function openBoundary(){
  openModal("🚪 边界门", `
    <p>温柔不是无限让步。请写一句边界句，让门框出现。</p>
    <textarea id="boundary-input" style="width:100%;min-height:92px;border:1px solid rgba(118,88,128,.22);border-radius:16px;padding:10px" placeholder="例如：我可以晚一点回复；我需要先休息；我不需要解释全部。">${state.boundaryText||""}</textarea>
    <p><button id="save-boundary">保存边界句</button></p>
  `);
  setTimeout(()=>{
    document.getElementById("save-boundary").onclick=()=>{
      state.boundaryText=document.getElementById("boundary-input").value.trim() || "我可以先休息，晚一点再回应。";
      markDone("boundary");
      closeModal();
      setDialogue("边界门出现了。小理：边界不是把爱关掉，而是让关系有门框。");
      setSkill("温柔边界", "边界让“靠近”和“离开”都有清楚的位置。");
      advanceIfReady(8);
    };
  },0);
}

function openValueAction(){
  const values=["安稳","清楚","恢复","边界","创造","连接","勇气","温柔"];
  openModal("🌌 星湾｜明天小行动", `
    <p>完整不是没有矛盾，而是可以带着矛盾继续生活。请选择一个方向，并写一个很小的行动。</p>
    <div class="choice-grid">
      ${values.map(v=>`<button data-value="${v}"><b>${v}</b><br><span>价值方向</span></button>`).join("")}
    </div>
    <textarea id="action-input" style="width:100%;min-height:92px;border:1px solid rgba(118,88,128,.22);border-radius:16px;padding:10px;margin-top:10px" placeholder="例如：明天出门前只检查月光托盘一次。">${state.valueAction||""}</textarea>
    <p><button id="save-action">保存并生成星湾卡</button></p>
  `);
  let selected = "";
  setTimeout(()=>{
    document.querySelectorAll("[data-value]").forEach(b=>b.onclick=()=>{selected=b.dataset.value; b.style.outline="3px solid rgba(242,201,111,.55)";});
    document.getElementById("save-action").onclick=()=>{
      state.value = selected || "清楚";
      state.valueAction = document.getElementById("action-input").value.trim() || "明天只检查月光托盘一次。";
      markDone("stargate");
      closeModal();
      setDialogue("星湾亮起了。你不需要成为没有裂缝的人，也可以带着小家继续出发。");
      setSkill("价值小行动", "不是等恐惧消失才行动，而是在恐惧还在时，朝重要方向走一小步。");
      openCard();
    };
  },0);
}

function setSkill(title,text){
  document.getElementById("skill-card").innerHTML=`<b>${title}</b><span>${text}</span>`;
}

function updateUI(){
  const ch = currentChapter();
  document.getElementById("chapter-card").innerHTML = `<b>${ch.id}. ${ch.title}｜${ch.theme}</b><span><b>${ch.skill}</b>：${ch.goal}</span><span>${ch.knowledge}</span>`;
  const root=document.getElementById("quest-list"); root.innerHTML="";
  QUESTS.forEach((q,i)=>{
    const div=document.createElement("div");
    div.className="quest"+(state.done[q.id]?" done":"");
    div.innerHTML=`<b>${state.done[q.id]?"✓":i+1}</b><span>${q.text}</span>`;
    root.appendChild(div);
  });
  const done=completedCount();
  document.getElementById("quest-meter").style.width=(done/QUESTS.length*100)+"%";
  document.getElementById("inventory").textContent=held ? ITEMS[held].icon+" "+ITEMS[held].name : "空";
  document.getElementById("dialogue").textContent=state.dialogue;
  document.getElementById("light-stack").innerHTML = CHAPTERS.map(c=>`<div class="light-row ${c.id<=state.chapter?'on':''}"><b>${c.id<=state.chapter?'✦':'·'}</b><span>${c.title}</span></div>`).join("");
  if(!document.getElementById("skill-card").innerHTML.trim()){
    setSkill(ch.skill, ch.knowledge);
  }
}

function openCard(){
  markDone("stargate");
  openModal("🌙 晚安整合卡", `<pre>${makeCard()}</pre>`);
}

function makeCard(){
  const placed = Object.entries(state.placed).map(([id,home])=>`${ITEMS[id]?.icon||""} ${ITEMS[id]?.name||id} → ${home}`).join("\n") || "还没有物品被安放";
  const notes = (state.notes||[]).map(n=>`- ${n}`).join("\n") || "今晚没有输入文字，也没关系。";
  return `Good Night Home V10｜层层点灯晚安卡

当前章节：
${currentChapter().title}｜${currentChapter().theme}

已安放：
${placed}

情绪云：
${state.emotion||"未命名"} → ${state.emotionUnder||"未展开"} → 需要 ${state.emotionNeed||"未选择"}

边界句：
${state.boundaryText||"还没有写下边界句"}

明天小行动：
价值方向：${state.value||"未选择"}
行动：${state.valueAction||"还没有写下"}

今晚留下的话：
${notes}

晚安语：
我不需要今晚整理完整个人生。
我只需要点亮下一盏灯。
心里有一个房间，可以一层一层亮起来。`;
}

function onPointerMove(event){
  const rect=renderer.domElement.getBoundingClientRect();
  mouse.x=((event.clientX-rect.left)/rect.width)*2-1;
  mouse.y=-((event.clientY-rect.top)/rect.height)*2+1;
  const hit=getHit();
  const tooltip=document.getElementById("tooltip");
  if(hit){
    tooltip.style.display="block";
    tooltip.style.left=event.clientX+14+"px";
    tooltip.style.top=event.clientY+14+"px";
    tooltip.textContent=hit.object.name || hit.object.userData.name;
  }else tooltip.style.display="none";
}
function onClick(){ const hit=getHit(); if(hit && hit.object.userData.action) hit.object.userData.action(); }
function getHit(){
  raycaster.setFromCamera(mouse,camera);
  const visibleHotspots = hotspots.filter(o=>o.visible!==false);
  const hits=raycaster.intersectObjects(visibleHotspots,false);
  return hits.find(h=>h.object.visible!==false);
}
function cycleHotspot(){
  const visible = hotspots.filter(o=>o.visible!==false);
  if(!visible.length) return;
  selectedHotspotIndex=(selectedHotspotIndex+1)%visible.length;
  const h=visible[selectedHotspotIndex];
  controls.target.copy(h.position);
  setDialogue("你看向了：" + h.name);
}
function bindUI(){
  document.querySelectorAll(".collapse").forEach(btn=>btn.addEventListener("click",()=>document.getElementById(btn.dataset.target).classList.toggle("collapsed")));
  document.getElementById("btn-next").onclick=()=>{
    if(state.chapter<CHAPTERS.length){
      state.chapter++;
      updateVisibility(); updateLighting(); updateUI();
      setDialogue(`下一章：${currentChapter().title}。${currentChapter().knowledge}`);
    }
  };
  document.getElementById("btn-map").onclick=()=>openModal("心路地图", `<div class="chapter-grid">${CHAPTERS.map(c=>`<div class="chapter-node ${c.id<state.chapter?'done':''} ${c.id===state.chapter?'current':''}"><b>${c.id}. ${c.title}</b><span>${c.theme}</span><span>${c.skill}</span></div>`).join("")}</div>`);
  document.getElementById("btn-card").onclick=openCard;
  document.getElementById("btn-reset").onclick=()=>{if(confirm("重置本地进度吗？")){localStorage.removeItem(SAVE_KEY);location.reload();}};
  document.getElementById("btn-save-note").onclick=()=>{
    const t=document.getElementById("journal-input").value.trim();
    if(!t) return;
    state.notes=state.notes||[];
    state.notes.push(t);
    document.getElementById("journal-input").value="";
    save();
    setDialogue("这句话被放进今晚记录了。文字也是一种容器。");
  };
  document.getElementById("btn-journal").onclick=()=>openModal("今晚记录", `<pre>${(state.notes||[]).map((n,i)=>`${i+1}. ${n}`).join("\n")||"还没有记录。"}</pre>`);
  document.getElementById("modal-close").onclick=closeModal;
  document.getElementById("modal").onclick=e=>{if(e.target.id==="modal")closeModal();};
}
function openModal(title,html){document.getElementById("modal-title").textContent=title;document.getElementById("modal-body").innerHTML=html;document.getElementById("modal").classList.add("show");}
function closeModal(){document.getElementById("modal").classList.remove("show");}
function onResize(){
  const container=document.getElementById("three-container");
  camera.aspect=container.clientWidth/container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth,container.clientHeight);
}
function animate(time=0){
  requestAnimationFrame(animate);
  controls?.update();
  scene?.traverse(o=>{
    if(o.userData.float){
      o.position.y=o.userData.float.baseY+Math.sin(time*.001*o.userData.float.speed+o.userData.float.phase)*.035;
    }
    if(o.userData.hotspot && o.geometry?.type?.includes("Sphere")) o.rotation.y += .003;
  });
  renderer.render(scene,camera);
}
