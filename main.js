import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const SAVE_KEY = "good-night-home-v9-psychological-room";

const ROOM = {
  width: 4.2,
  depth: 3.2,
  height: 2.6,
  eyeHeight: 1.35
};

const QUESTS = [
  { id:"lamp", text:"点亮床头灯，让身体知道这里安全" },
  { id:"drawer", text:"打开床头抽屉" },
  { id:"memory", text:"把记忆碎片放入月光盒" },
  { id:"key", text:"把钥匙放入月光托盘" },
  { id:"cloud", text:"遇见小小云" },
  { id:"pause", text:"完成温柔暂停" },
  { id:"card", text:"生成晚安整合卡" }
];

const ITEMS = {
  memory: { name:"记忆碎片", icon:"✦", home:"moonBox", why:"模糊的记忆先进入容器，之后再慢慢解释。" },
  key: { name:"钥匙", icon:"🔑", home:"tray", why:"钥匙住在托盘，明天不用靠焦虑记住它。" }
};

let state = loadSave();
let scene, camera, renderer, controls, raycaster, mouse;
let hotspots = [];
let pickables = {};
let containers = {};
let labels = [];
let held = null;
let selectedHotspotIndex = -1;
let scaleVisible = false;

function freshSave(){
  return {
    done:{},
    placed:{},
    drawerOpen:false,
    lampOn:false,
    cloudMet:false,
    pauseDone:false,
    dialogue:"欢迎回到梦里的房间。这里不是任务现场，是一个可以整理感受、随时发呆、慢慢睡着的地方。"
  };
}
function loadSave(){
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || freshSave(); }
  catch(e){ return freshSave(); }
}
function save(){ localStorage.setItem(SAVE_KEY, JSON.stringify(state)); updateUI(); }
function markDone(id){ state.done[id] = true; save(); }
function setDialogue(text){ state.dialogue = text; document.getElementById("dialogue").textContent = text; save(); }
function updateUI(){
  const root = document.getElementById("quest-list");
  root.innerHTML = "";
  QUESTS.forEach((q,i)=>{
    const div = document.createElement("div");
    div.className = "quest" + (state.done[q.id] ? " done" : "");
    div.innerHTML = `<b>${state.done[q.id] ? "✓" : i+1}</b><span>${q.text}</span>`;
    root.appendChild(div);
  });
  const done = QUESTS.filter(q=>state.done[q.id]).length;
  document.getElementById("quest-meter").style.width = (done / QUESTS.length * 100) + "%";
  document.getElementById("inventory").textContent = held ? ITEMS[held].icon + " " + ITEMS[held].name : "空";
  document.getElementById("dialogue").textContent = state.dialogue;
}

init();
animate();

function init(){
  const container = document.getElementById("three-container");
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x17142a);
  scene.fog = new THREE.Fog(0x17142a, 4.5, 9.5);

  camera = new THREE.PerspectiveCamera(48, container.clientWidth/container.clientHeight, 0.01, 50);
  camera.position.set(0, ROOM.eyeHeight, 4.5);

  renderer = new THREE.WebGLRenderer({antialias:true, alpha:false});
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.05, 0);
  controls.enableDamping = true;
  controls.dampingFactor = .08;
  controls.minDistance = 2.7;
  controls.maxDistance = 5.4;
  controls.minPolarAngle = Math.PI * .28;
  controls.maxPolarAngle = Math.PI * .56;
  controls.enablePan = false;
  controls.rotateSpeed = .42;
  controls.zoomSpeed = .55;

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  buildRoom();
  buildFurniture();
  buildInteractives();
  buildLights();

  window.addEventListener("resize", onResize);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("click", onClick);
  window.addEventListener("keydown", e=>{
    if(e.key === "Tab"){
      e.preventDefault();
      cycleHotspot();
    }
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
function roundedGlow(pos, color=0xffe7a2, size=.08){
  const geo = new THREE.SphereGeometry(size, 24, 16);
  const m = new THREE.MeshBasicMaterial({color, transparent:true, opacity:.85});
  const s = new THREE.Mesh(geo, m);
  s.position.set(...pos);
  scene.add(s);
  const light = new THREE.PointLight(color, .55, 1.6);
  light.position.set(...pos);
  scene.add(light);
  return s;
}

function buildRoom(){
  // real-scaled room in meters: width x depth x height
  const floor = makeBox("floor", [ROOM.width, .06, ROOM.depth], [0, -.03, 0], mat(0xf2dcc4));
  const backWall = makeBox("back wall", [ROOM.width, ROOM.height, .06], [0, ROOM.height/2, -ROOM.depth/2], mat(0xf7eadf), false);
  const leftWall = makeBox("left wall", [.06, ROOM.height, ROOM.depth], [-ROOM.width/2, ROOM.height/2, 0], mat(0xefe8fb), false);
  const rightWall = makeBox("right wall", [.06, ROOM.height, ROOM.depth], [ROOM.width/2, ROOM.height/2, 0], mat(0xe9f2f0), false);

  // rug / safety radius
  const rug = new THREE.Mesh(new THREE.CylinderGeometry(.95, .95, .025, 64), softMat(0xc7b0ef, .45));
  rug.rotation.x = Math.PI/2;
  rug.position.set(-.3, .025, .1);
  rug.receiveShadow = true;
  scene.add(rug);

  // window
  const win = makeBox("moon window", [1.05,.72,.04], [.35,1.55,-ROOM.depth/2+.04], mat(0x202b62), false);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(.12, 32, 16), new THREE.MeshBasicMaterial({color:0xffefbf}));
  moon.position.set(.65,1.68,-ROOM.depth/2+.085);
  scene.add(moon);

  addLabel("4.2m × 3.2m 真实房间", [0, .08, 1.42], "scale");
  addLabel("床边恢复半径：伸手可及", [-.8, .1, .32], "scale");
  addLabel("玄关边界：出发 / 回来", [1.35, .1, -.55], "scale");
}

function buildFurniture(){
  // bed
  makeBox("bed base", [1.75,.34,1.12], [-1.08,.17,-.75], mat(0xd8c8f2));
  makeBox("mattress", [1.7,.18,1.08], [-1.08,.43,-.75], mat(0xf7edf6));
  makeBox("pillow", [.72,.14,.35], [-1.35,.62,-1.12], mat(0xfff7ed));

  // nightstand body and drawer
  makeBox("nightstand", [.58,.62,.48], [-.08,.31,-1.08], mat(0xe4b986));
  const drawerZ = state.drawerOpen ? -.68 : -1.0;
  const drawer = makeBox("drawer", [.5,.18,.34], [-.08,.36,drawerZ], mat(0xf4d7a7));
  drawer.userData.drawer = true;
  containers.drawer = drawer;

  // desk / archive area
  makeBox("desk", [1.05,.12,.52], [1.05,.75,-.92], mat(0xe9bd84));
  makeBox("desk leg 1", [.08,.7,.08], [.62,.35,-.72], mat(0xd7a775));
  makeBox("desk leg 2", [.08,.7,.08], [1.48,.35,-.72], mat(0xd7a775));

  // entry shelf / tray table
  makeBox("entry shelf", [.8,.75,.36], [1.35,.375,.55], mat(0xe8c59a));
  makeBox("soft chair", [.72,.36,.62], [-1.45,.18,.7], mat(0xbfe3cd));
  makeBox("chair back", [.72,.72,.12], [-1.45,.55,.98], mat(0xa8d7ba));

  // blanket cloud corner
  const blanket = new THREE.Mesh(new THREE.SphereGeometry(.34, 32, 16), softMat(0xbfded0, .78));
  blanket.scale.set(1.35,.42,1);
  blanket.position.set(-1.45,.34,.62);
  blanket.castShadow = true;
  blanket.receiveShadow = true;
  blanket.name = "blanket corner";
  scene.add(blanket);
}

function buildLights(){
  const ambient = new THREE.HemisphereLight(0xfff3d1, 0x3b3157, .92);
  scene.add(ambient);

  const moon = new THREE.DirectionalLight(0xc9dcff, .9);
  moon.position.set(-2.5, 3.8, 3.2);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024,1024);
  scene.add(moon);

  const lampIntensity = state.lampOn ? 2.2 : .6;
  const lamp = new THREE.PointLight(0xffd88c, lampIntensity, 4.2);
  lamp.position.set(-.15, .95, -1.05);
  lamp.castShadow = true;
  lamp.name = "bedside warm lamp";
  scene.add(lamp);
  window.__lamp = lamp;

  // tiny stars / dust
  const starGeo = new THREE.SphereGeometry(.012, 8, 8);
  const starMat = new THREE.MeshBasicMaterial({color:0xffedb7, transparent:true, opacity:.75});
  for(let i=0;i<90;i++){
    const s = new THREE.Mesh(starGeo, starMat.clone());
    s.position.set(
      THREE.MathUtils.randFloatSpread(ROOM.width*.85),
      THREE.MathUtils.randFloat(.7,2.35),
      THREE.MathUtils.randFloatSpread(ROOM.depth*.78)
    );
    s.userData.float = {baseY:s.position.y, speed:THREE.MathUtils.randFloat(.35,.9), phase:Math.random()*10};
    scene.add(s);
  }
}

function buildInteractives(){
  // lamp hotspot
  makeHotspot("lamp", "床头灯｜点亮锚点", [-.15,.82,-1.05], .12, 0xffd88c, ()=>{
    state.lampOn = true;
    markDone("lamp");
    if(window.__lamp) window.__lamp.intensity = 2.2;
    setDialogue("灯亮了。真实房间的第一件事不是整理，而是让身体知道：这里足够安全。");
    setSkill("空间锚点", "先看见一盏灯、一个床头、一个可坐下的角落。安全感从可定位的锚点开始。");
  });

  // drawer
  makeHotspot("drawer", "床头抽屉｜打开", [-.08,.50,-.78], .12, 0xffefbf, ()=>{
    state.drawerOpen = true;
    markDone("drawer");
    const drawer = containers.drawer;
    if(drawer){
      drawer.position.z = -.68;
    }
    setDialogue("抽屉打开了。小理：容器不是把东西藏起来，而是让它们有一个能被再次找到的位置。");
    setSkill("容器化", "抽屉、盒子、托盘都是外部记忆。它们替工作记忆承载细节。");
    save();
  });

  // moon archive container
  makeContainer("moonBox", "月光盒｜安放模糊记忆", [1.05, .88, -1.05], .16, 0xc7b0ef, ["memory"], ()=>{
    setSkill("打标签", "模糊感受先进入容器：我看见它，但不需要今晚解释全部。");
  });

  // entry tray
  makeContainer("tray", "月光托盘｜安放钥匙", [1.35, .84, .45], .15, 0xffe3a6, ["key"], ()=>{
    setSkill("物品地址法", "钥匙住在托盘。不是“我必须记住”，而是“空间替我保管”。");
  });

  // pickable memory shard
  makePickable("memory", "记忆碎片", [.58, 1.05, -.58], 0xffefbf);
  makePickable("key", "钥匙", [.92, .82, .18], 0xffd26f);

  // little cloud
  makeHotspot("cloud", "小小云｜内在角落", [-1.45,.58,.62], .18, 0xcfeee0, ()=>{
    state.cloudMet = true;
    markDone("cloud");
    setDialogue("你遇见了小小云。它不是麻烦，它是一个很累、很早就学会躲起来的部分。");
    document.getElementById("skill-card").innerHTML = `<b>部分安放</b><span>小小云不需要被赶走。它可以先坐在毯子里，被看见，而不用解释全部过去。</span>`;
    openModal("🌧 小小云", `
      <p>小小云把毯子拉到鼻尖。它说：</p>
      <p><b>“我不是不想长大。我只是很久没有一个可以慢慢醒来的地方。”</b></p>
      <p>你可以给它一句话：</p>
      <ul>
        <li>你可以先躲进毯子里。</li>
        <li>今晚不用证明自己已经好了。</li>
        <li>明天我们再一起打开一扇门。</li>
      </ul>
    `);
    save();
  });

  // pause door
  makeHotspot("pause", "温柔暂停门", [.12,.84,1.15], .17, 0xf0aebe, ()=>{
    openPause();
  });
}

function makeHotspot(id, name, pos, radius, color, action){
  const sphere = roundedGlow(pos, color, radius);
  sphere.name = name;
  sphere.userData = { id, name, action, hotspot:true };
  hotspots.push(sphere);
  addLabel(name, [pos[0], pos[1]+radius+.16, pos[2]], "hotspot");
  return sphere;
}

function makePickable(id, name, pos, color){
  const geo = id === "key" ? new THREE.TorusKnotGeometry(.07,.022,70,10) : new THREE.OctahedronGeometry(.09,0);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color, emissive:color, emissiveIntensity:.38, roughness:.42}));
  mesh.position.set(...pos);
  mesh.castShadow = true;
  mesh.name = name;
  mesh.userData = {
    id, name, pickable:true, hotspot:true,
    action:()=>pickItem(id)
  };
  scene.add(mesh);
  hotspots.push(mesh);
  addLabel(name, [pos[0],pos[1]+.18,pos[2]], "hotspot");
  pickables[id]=mesh;
}

function makeContainer(id, name, pos, radius, color, accepts, onEmptyClick){
  const mesh = roundedGlow(pos, color, radius);
  mesh.name = name;
  mesh.userData = {
    id, name, container:true, accepts, hotspot:true,
    action:()=>tryContainer(id, onEmptyClick)
  };
  hotspots.push(mesh);
  addLabel(name, [pos[0], pos[1]+radius+.16, pos[2]], "hotspot");
  containers[id]=mesh;
}

function addLabel(text, pos, kind){
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = kind === "scale" ? "rgba(255,250,242,.80)" : "rgba(255,248,230,.82)";
  roundRect(ctx, 8, 18, 496, 82, 32);
  ctx.fill();
  ctx.fillStyle = "#4f4254";
  ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, 'Microsoft YaHei', Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 59);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({map:tex, transparent:true, opacity: kind === "scale" ? 0 : .95});
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.05,.26,1);
  sprite.position.set(...pos);
  sprite.userData.kind = kind;
  scene.add(sprite);
  labels.push(sprite);
  return sprite;
}
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

function pickItem(id){
  if(held){
    setDialogue("你已经拿着 " + ITEMS[held].name + "。先找一个能让它休息的位置。");
    return;
  }
  held = id;
  if(pickables[id]) pickables[id].visible = false;
  setDialogue("你拿起了 " + ITEMS[id].name + "。先不用解释它，只要找一个容器。");
  updateUI();
}

function tryContainer(id, onEmptyClick){
  if(!held){
    onEmptyClick?.();
    setDialogue(containers[id].name + " 正在发光。它像是在说：我可以承载一部分混乱。");
    return;
  }
  const item = ITEMS[held];
  const target = containers[id];
  if(target.userData.accepts.includes(held)){
    state.placed[held] = id;
    const placedIcon = makePlacedIcon(item.icon, target.position);
    placedIcon.position.y += .18;
    setDialogue(item.icon + " " + item.name + " 被安放了。小理：" + item.why);
    setSkill(item.name + " 的安放", item.why);
    if(held === "memory") markDone("memory");
    if(held === "key") markDone("key");
    held = null;
    save();
  }else{
    setDialogue("这个容器有点不合适。试试问：它的功能是什么？它明天在哪里最需要被找到？");
    pulse(target);
  }
  updateUI();
}

function makePlacedIcon(icon, pos){
  const canvas = document.createElement("canvas");
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.font = "72px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(icon, 64, 66);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true}));
  sprite.scale.set(.28,.28,1);
  sprite.position.copy(pos);
  scene.add(sprite);
  return sprite;
}

function pulse(obj){
  const start = obj.scale.clone();
  let t = 0;
  const timer = setInterval(()=>{
    t += .15;
    const s = 1 + Math.sin(t*8)*.06;
    obj.scale.set(start.x*s,start.y*s,start.z*s);
    if(t>1){
      clearInterval(timer);
      obj.scale.copy(start);
    }
  },16);
}

function setSkill(title, text){
  document.getElementById("skill-card").innerHTML = `<b>${title}</b><span>${text}</span>`;
}

function openPause(){
  openModal("温柔暂停门", `
    <p>当你想立刻整理全部、解释全部、修好全部时，先在门口停一下。</p>
    <ul>
      <li><b>S 停止：</b>手先停下。</li>
      <li><b>T 后退：</b>离问题远一点点。</li>
      <li><b>O 观察：</b>我现在是急、怕、累、麻木，还是想逃？</li>
      <li><b>P 选择：</b>只做一个最小动作。</li>
    </ul>
    <p><button id="save-pause" class="modal-action">我完成了一次暂停</button></p>
  `);
  setTimeout(()=>{
    document.getElementById("save-pause")?.addEventListener("click",()=>{
      state.pauseDone = true;
      markDone("pause");
      closeModal();
      setDialogue("你已经停下来了。不是所有门都要今晚打开。");
    });
  },0);
}

function onPointerMove(event){
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  const hit = getHit();
  const tooltip = document.getElementById("tooltip");
  if(hit){
    tooltip.style.display = "block";
    tooltip.style.left = event.clientX + 14 + "px";
    tooltip.style.top = event.clientY + 14 + "px";
    tooltip.textContent = hit.object.name || hit.object.userData.name;
  }else{
    tooltip.style.display = "none";
  }
}

function onClick(){
  const hit = getHit();
  if(hit && hit.object.userData.action){
    hit.object.userData.action();
  }
}

function getHit(){
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(hotspots, false);
  return hits.find(h=>h.object.visible !== false);
}

function cycleHotspot(){
  selectedHotspotIndex = (selectedHotspotIndex + 1) % hotspots.length;
  const h = hotspots[selectedHotspotIndex];
  if(h){
    controls.target.copy(h.position);
    setDialogue("你看向了：" + h.name);
  }
}

function toggleScale(){
  scaleVisible = !scaleVisible;
  labels.forEach(l=>{
    if(l.userData.kind === "scale") l.material.opacity = scaleVisible ? .88 : 0;
  });
  if(scaleVisible){
    openModal("心理尺度说明", `
      <div class="scale-overlay-list">
        <div><b>真实房间</b><br>4.2m × 3.2m × 2.6m。不是无限大的抽象世界，而是身体能理解的房间。</div>
        <div><b>伸手可及半径</b><br>床头、月光盒、托盘都在低能量状态下可以靠近的位置。</div>
        <div><b>边界距离</b><br>玄关不是杂物区，而是“我从这里出发，也从这里回来”的边界。</div>
        <div><b>容器尺度</b><br>抽屉、托盘、盒子是外部工作记忆，用来承载细节。</div>
      </div>
    `);
  }
}

function makeCard(){
  return `Good Night Home V9｜真实房间心理尺度晚安卡

房间尺度：
4.2m × 3.2m × 2.6m。
这是一个身体可以理解的小房间，不是需要征服的世界。

今晚已完成：
${state.done.lamp ? "✓ 床头灯已点亮：我在这里。" : "□ 床头灯还没有点亮"}
${state.done.drawer ? "✓ 抽屉已打开：容器可以承载细节。" : "□ 抽屉还没有打开"}
${state.done.memory ? "✓ 记忆碎片 → 月光盒：模糊感受被放进容器。" : "□ 记忆碎片还在路上"}
${state.done.key ? "✓ 钥匙 → 月光托盘：明天不用靠焦虑记住它。" : "□ 钥匙还在路上"}
${state.done.cloud ? "✓ 遇见小小云：疲惫的部分可以先休息。" : "□ 小小云还没有被看见"}
${state.done.pause ? "✓ 温柔暂停：不是所有门都要今晚打开。" : "□ 暂停门还没有经过"}

晚安语：
我可以带着矛盾休息。
我不需要今晚成为完整的人。
我只需要记得：心里有一个可以回来的房间。`;
}

function bindUI(){
  document.querySelectorAll(".collapse").forEach(btn=>{
    btn.addEventListener("click",()=>document.getElementById(btn.dataset.target).classList.toggle("collapsed"));
  });
  document.getElementById("btn-scale").addEventListener("click", toggleScale);
  document.getElementById("btn-card").addEventListener("click", ()=>{
    markDone("card");
    openModal("晚安整合卡", `<pre>${makeCard()}</pre>`);
  });
  document.getElementById("btn-reset").addEventListener("click", ()=>{
    if(confirm("重置本地进度吗？")){
      localStorage.removeItem(SAVE_KEY);
      location.reload();
    }
  });
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal").addEventListener("click", e=>{ if(e.target.id === "modal") closeModal(); });
}

function openModal(title, html){
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").innerHTML = html;
  document.getElementById("modal").classList.add("show");
}
function closeModal(){ document.getElementById("modal").classList.remove("show"); }

function onResize(){
  const container = document.getElementById("three-container");
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate(time=0){
  requestAnimationFrame(animate);
  controls?.update();
  scene?.traverse(o=>{
    if(o.userData.float){
      o.position.y = o.userData.float.baseY + Math.sin(time*.001*o.userData.float.speed + o.userData.float.phase)*.035;
    }
    if(o.userData.hotspot && o.geometry?.type?.includes("Sphere")){
      o.rotation.y += .003;
    }
  });
  renderer.render(scene, camera);
}
