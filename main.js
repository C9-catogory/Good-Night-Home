const SAVE_KEY = "good-night-home-v8-dream-save";

const QUESTS = [
  { id:"lamp", text:"点亮内心小屋" },
  { id:"mote", text:"收集一个记忆碎片" },
  { id:"key", text:"钥匙回到月光托盘" },
  { id:"part", text:"听见小小云" },
  { id:"stop", text:"完成一次温柔暂停" },
  { id:"card", text:"生成晚安回顾卡" }
];

const ITEMS = {
  memory: { name:"记忆碎片", icon:"✦", home:"archive", why:"先把模糊的东西放进月光档案，不急着解释全部。" },
  key: { name:"钥匙", icon:"🔑", home:"tray", why:"钥匙住在月光托盘，明天不用靠焦虑记住它。" }
};

const CONTAINERS = {
  lamp: { name:"小灯", x:132, y:120, r:52, type:"lamp", skill:"空间锚点：先看见一盏灯。记忆和安全感从锚点开始。" },
  archive: { name:"月光档案盒", x:720, y:168, r:64, accepts:["memory"], skill:"打标签：模糊的感受先进入容器，之后再慢慢整理。" },
  tray: { name:"月光托盘", x:720, y:348, r:62, accepts:["key"], skill:"物品地址：钥匙不是要硬记，它住在托盘。" },
  cloud: { name:"毯子角", x:220, y:440, r:70, type:"part", skill:"部分安放：脆弱的部分不需要被赶走，它可以先坐在毯子里。" },
  stop: { name:"温柔暂停门", x:480, y:510, r:62, type:"stop", skill:"STOP：停止 → 后退 → 观察 → 选择一个最小动作。" }
};

const CHAPTERS = [
  ["01","开灯","看见锚点"],["02","玄关之门","物品地址"],["03","床头恢复站","睡前降载"],["04","书桌归档台","外化未完成"],
  ["05","衣柜与身体","舒适标签"],["06","晚安巡房","固定路线"],["07","情绪云","命名感受"],["08","守门员","保护性部分"],
  ["09","火花行动者","最小行动"],["10","小小云","受伤部分安放"],["11","批评广播","去融合"],["12","情绪容器","涵容"],
  ["13","门口边界","边界门"],["14","信箱","评价过滤"],["15","客厅距离","关系距离"],["16","镜子间","自我叙事"],
  ["17","窗户","视角转换"],["18","小桥","价值方向"],["19","储物间","低频归档"],["20","阁楼旧脚本","旧脚本更新"],
  ["21","花园","感受流动"],["22","地图室","价值罗盘"],["23","大门","带着家出发"],["24","星湾","完整自体叙事"]
];

function freshSave(){
  return {
    inventory:null,
    placed:{},
    done:{},
    dialogue:"灯已经开了。今晚先不用变好，只要走进这座小家。",
    partMet:false,
    stopDone:false,
    card:false,
    dream:true
  };
}
function loadSave(){ try{return JSON.parse(localStorage.getItem(SAVE_KEY)) || freshSave()}catch(e){return freshSave()} }
let save = loadSave();
function persist(){ localStorage.setItem(SAVE_KEY, JSON.stringify(save)); updateUI(); }
function markDone(id){ save.done[id]=true; persist(); }
function setDialogue(text){ save.dialogue=text; document.getElementById("dialogue").textContent=text; }
function updateUI(){
  const root = document.getElementById("quest-list");
  root.innerHTML = "";
  QUESTS.forEach((q,i)=>{
    const div = document.createElement("div");
    div.className = "quest" + (save.done[q.id] ? " done" : "");
    div.innerHTML = `<b>${save.done[q.id] ? "✓" : i+1}</b><span>${q.text}</span>`;
    root.appendChild(div);
  });
  const doneCount = QUESTS.filter(q=>save.done[q.id]).length;
  document.getElementById("quest-meter").style.width = (doneCount / QUESTS.length * 100) + "%";
  document.getElementById("inventory").textContent = save.inventory ? ITEMS[save.inventory].icon + " " + ITEMS[save.inventory].name : "空";
  document.getElementById("dialogue").textContent = save.dialogue;
}

class DreamScene extends Phaser.Scene{
  constructor(){ super("DreamScene"); }
  create(){
    this.cameras.main.setBackgroundColor("#17142a");
    this.createDreamHome();
    this.createObjects();
    this.createPlayer();
    this.createInput();
    this.refreshVisuals();
    this.nearText = this.add.text(480, 606, "", {fontSize:"18px", color:"#fff8df", backgroundColor:"rgba(24,20,42,.62)", padding:{x:14,y:8}}).setOrigin(.5);
    updateUI();
  }
  createDreamHome(){
    const g = this.add.graphics();
    // soft aurora background
    g.fillStyle(0x201a38, 1); g.fillRoundedRect(28, 28, 904, 560, 34);
    g.fillStyle(0x5c4a7b, .38); g.fillEllipse(470, 210, 720, 260);
    g.fillStyle(0x2e5a62, .28); g.fillEllipse(580, 420, 620, 260);
    g.fillStyle(0xffe5a8, .10); g.fillEllipse(250, 190, 380, 210);

    // rooms as warm islands
    this.island(g, 108, 86, 250, 160, 0xf4d7e8, "小房间");
    this.island(g, 610, 92, 250, 160, 0xe5dcff, "月光档案");
    this.island(g, 622, 300, 250, 160, 0xffe8b4, "玄关托盘");
    this.island(g, 105, 350, 270, 170, 0xdff3e5, "毯子角");
    this.island(g, 390, 420, 210, 120, 0xf4d0d0, "暂停门");

    // luminous path
    g.lineStyle(8, 0xffe7a2, .22);
    g.beginPath();
    g.moveTo(235,160); g.lineTo(720,170); g.lineTo(725,348); g.lineTo(240,430); g.lineTo(480,505);
    g.strokePath();

    // stars
    for(let i=0;i<80;i++){
      const x = Phaser.Math.Between(50,910);
      const y = Phaser.Math.Between(45,570);
      const a = Phaser.Math.FloatBetween(.2,.8);
      g.fillStyle(0xffedb7, a); g.fillCircle(x,y,Phaser.Math.FloatBetween(1,2.2));
    }

    this.add.text(480, 56, "梦里的家不是任务清单，是可以回来休息的心路地图", {fontSize:"20px", color:"#fff6df", fontStyle:"bold"}).setOrigin(.5);
  }
  island(g,x,y,w,h,color,label){
    g.fillStyle(color,.92); g.fillRoundedRect(x,y,w,h,30);
    g.lineStyle(3,0xffffff,.52); g.strokeRoundedRect(x,y,w,h,30);
    this.add.text(x+18,y+16,label,{fontSize:"20px", color:"#4f4254", fontStyle:"bold"});
  }
  createObjects(){
    this.containers = {};
    Object.entries(CONTAINERS).forEach(([id,c])=>{
      const circle = this.add.circle(c.x,c.y,c.r,c.type==="stop"?0xf4d0d0:0xfff8e8,.58).setStrokeStyle(3,0xffffff,.68).setInteractive({useHandCursor:true});
      const label = this.add.text(c.x,c.y,c.name,{fontSize:"16px", color:"#4f4254", fontStyle:"bold", align:"center"}).setOrigin(.5);
      this.containers[id]={circle,label,data:c};
      circle.on("pointerdown",()=>this.tryContainer(id));
      this.tweens.add({targets:circle, alpha:{from:.48,to:.72}, duration:2200, yoyo:true, repeat:-1, ease:"Sine.easeInOut"});
    });

    const itemPositions = { memory:[360,210], key:[510,340] };
    this.items = {};
    Object.entries(ITEMS).forEach(([id,it])=>{
      const [x,y]=itemPositions[id];
      const t = this.add.text(x,y,it.icon+"\n"+it.name,{fontSize:"25px", color:"#fff8df", align:"center", backgroundColor:"rgba(255,255,255,.14)", padding:{x:12,y:9}}).setOrigin(.5).setInteractive({useHandCursor:true});
      t.on("pointerdown",()=>this.pickItem(id));
      this.items[id]=t;
      this.tweens.add({targets:t, y:y-8, duration:1800, yoyo:true, repeat:-1, ease:"Sine.easeInOut"});
    });
  }
  createPlayer(){
    this.player = this.add.circle(170, 210, 19, 0xfff0b8, 1).setStrokeStyle(3,0xffffff,.92);
    this.playerIcon = this.add.text(170,210,"🐱",{fontSize:"25px"}).setOrigin(.5);
    this.light = this.add.circle(170,210,70,0xffe7a2,.10);
  }
  createInput(){
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,E,SPACE");
  }
  update(){
    const speed=3.05; let dx=0,dy=0;
    if(this.cursors.left.isDown||this.keys.A.isDown||mobileKeys.left) dx-=speed;
    if(this.cursors.right.isDown||this.keys.D.isDown||mobileKeys.right) dx+=speed;
    if(this.cursors.up.isDown||this.keys.W.isDown||mobileKeys.up) dy-=speed;
    if(this.cursors.down.isDown||this.keys.S.isDown||mobileKeys.down) dy+=speed;
    this.player.x=Phaser.Math.Clamp(this.player.x+dx,48,912);
    this.player.y=Phaser.Math.Clamp(this.player.y+dy,48,570);
    this.playerIcon.x=this.player.x; this.playerIcon.y=this.player.y;
    this.light.x=this.player.x; this.light.y=this.player.y;

    this.nearTarget=this.findNearest();
    this.nearText.setText(this.nearTarget ? "靠近：" + this.nearTarget.label + "｜按 E / 空格互动" : "");
    if(Phaser.Input.Keyboard.JustDown(this.keys.E)||Phaser.Input.Keyboard.JustDown(this.keys.SPACE)||mobileKeys.interactTap){
      mobileKeys.interactTap=false; this.interact();
    }
  }
  findNearest(){
    let best=null; const px=this.player.x,py=this.player.y;
    Object.entries(this.items).forEach(([id,t])=>{
      if(save.placed[id]) return;
      const d=Phaser.Math.Distance.Between(px,py,t.x,t.y);
      if(d<75 && (!best||d<best.d)) best={type:"item", id, d, label:ITEMS[id].name};
    });
    Object.entries(this.containers).forEach(([id,o])=>{
      const d=Phaser.Math.Distance.Between(px,py,o.data.x,o.data.y);
      if(d<o.data.r+45 && (!best||d<best.d)) best={type:"container", id, d, label:o.data.name};
    });
    return best;
  }
  interact(){
    if(!this.nearTarget){ setDialogue("小理：先靠近一个发光的角落。这里没有必须完成的速度。"); return; }
    if(this.nearTarget.type==="item") this.pickItem(this.nearTarget.id);
    if(this.nearTarget.type==="container") this.tryContainer(this.nearTarget.id);
  }
  pickItem(id){
    if(save.inventory){ setDialogue("你已经拿着 " + ITEMS[save.inventory].name + "。先找一个能让它休息的位置。"); return; }
    save.inventory=id; persist();
    this.items[id].setAlpha(.28);
    setDialogue("你拿起了 " + ITEMS[id].name + "。先不用解释它，只要找一个容器。");
  }
  tryContainer(id){
    const c=CONTAINERS[id];
    if(id==="lamp"){
      markDone("lamp");
      setDialogue("灯亮了。小理：你回到了一个可以慢慢整理的地方。");
      document.getElementById("skill-card").innerHTML = `<b>空间锚点</b><span>${c.skill}</span>`;
      return;
    }
    if(id==="cloud"){
      save.partMet=true; markDone("part");
      document.getElementById("inner-card").innerHTML = `<b>🌧 小小云</b><span>它不想再被催促。它需要一句话：你可以先躲进毯子里，明天再出来。</span>`;
      setDialogue("你遇见了小小云。它不是麻烦，它是一个很累的部分。");
      return;
    }
    if(id==="stop"){
      openStopModal();
      return;
    }
    if(!save.inventory){
      setDialogue("这是 " + c.name + "。小理：" + c.skill);
      document.getElementById("skill-card").innerHTML = `<b>${c.name}</b><span>${c.skill}</span>`;
      return;
    }
    const itemId=save.inventory;
    if(c.accepts && c.accepts.includes(itemId)){
      save.placed[itemId]=id; save.inventory=null;
      if(itemId==="memory") markDone("mote");
      if(itemId==="key") markDone("key");
      setDialogue(ITEMS[itemId].icon + " " + ITEMS[itemId].name + " 被安放了。小理：" + ITEMS[itemId].why);
      document.getElementById("skill-card").innerHTML = `<b>${ITEMS[itemId].name} 的安放</b><span>${ITEMS[itemId].why}</span>`;
      this.refreshVisuals();
    }else{
      setDialogue("小理：这个位置也许太拥挤。试试让它去更温柔、更贴近功能的地方。");
      this.tweens.add({targets:this.containers[id].circle, x:this.containers[id].circle.x+6, yoyo:true, duration:70, repeat:2});
    }
    persist();
  }
  refreshVisuals(){
    Object.entries(this.items||{}).forEach(([id,t])=>{ t.setVisible(!save.placed[id]); t.setAlpha(1); });
    Object.entries(this.containers||{}).forEach(([id,o])=>{
      const here=Object.entries(save.placed).filter(([item,home])=>home===id);
      if(here.length){
        o.circle.setFillStyle(0xdff4e5,.72);
        o.label.setText(o.data.name+"\n"+here.map(([item])=>ITEMS[item].icon).join(" "));
      }
    });
  }
}

function openStopModal(){
  showModal("温柔暂停门", `
    <p>这里不是惩罚，也不是考试。只是当你想立刻解决全部事情时，先让身体知道：可以慢一点。</p>
    <ul>
      <li><b>S 停止：</b>手先停下。</li>
      <li><b>T 后退：</b>离问题远一点点。</li>
      <li><b>O 观察：</b>我现在是急、怕、累、麻木，还是想逃？</li>
      <li><b>P 选择：</b>只做一个最小动作。</li>
    </ul>
    <p><button id="save-stop" class="modal-action">我完成了一次暂停</button></p>
  `);
  setTimeout(()=>{
    document.getElementById("save-stop")?.addEventListener("click",()=>{
      markDone("stop");
      closeModal();
      setDialogue("小理：你已经停下来了。不是所有门都要今晚打开。");
    });
  },0);
}

function makeCard(){
  return `Good Night Home｜今晚的内心角落

今天我不是来完成全部任务。
我是回来点一盏灯。

已安放：
${save.placed.memory ? "✦ 记忆碎片 → 月光档案盒" : "✦ 记忆碎片还在路上"}
${save.placed.key ? "🔑 钥匙 → 月光托盘" : "🔑 钥匙还在路上"}

遇见的部分：
${save.partMet ? "🌧 小小云：它很累，需要被包裹，而不是被催促。" : "还没有遇见。"}

学到的动作：
- 空间锚点：先看见一盏灯。
- 打标签：模糊感受先进入容器。
- 物品地址：东西有家，明天不用靠焦虑记住。
- 温柔暂停：停止、后退、观察、选择最小动作。

晚安语：
我可以带着矛盾休息。
我不需要今晚成为完整的人。
我只需要记得：心里有一个可以回来的家。`;
}

function updateUI(){
  const list=document.getElementById("quest-list"); list.innerHTML="";
  QUESTS.forEach((q,i)=>{
    const div=document.createElement("div");
    div.className="quest"+(save.done[q.id]?" done":"");
    div.innerHTML=`<b>${save.done[q.id]?"✓":i+1}</b><span>${q.text}</span>`;
    list.appendChild(div);
  });
  const doneCount=QUESTS.filter(q=>save.done[q.id]).length;
  document.getElementById("quest-meter").style.width=(doneCount/QUESTS.length*100)+"%";
  document.getElementById("inventory").textContent=save.inventory ? ITEMS[save.inventory].icon+" "+ITEMS[save.inventory].name : "空";
  document.getElementById("dialogue").textContent=save.dialogue;
}
function persist(){ localStorage.setItem(SAVE_KEY, JSON.stringify(save)); updateUI(); }
function markDone(id){ save.done[id]=true; persist(); }
function setDialogue(text){ save.dialogue=text; document.getElementById("dialogue").textContent=text; persist(); }

const mobileKeys={up:false,down:false,left:false,right:false,interactTap:false};
const config={type:Phaser.AUTO,parent:"game-container",width:960,height:640,backgroundColor:"#17142a",scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[DreamScene]};

window.addEventListener("load",()=>{
  window.game=new Phaser.Game(config);
  bindUI(); updateUI();
  if(save.dream) document.body.classList.add("daydream");
});

function bindUI(){
  document.querySelectorAll(".collapse").forEach(btn=>btn.addEventListener("click",()=>document.getElementById(btn.dataset.target).classList.toggle("collapsed")));
  document.querySelectorAll(".mobile-controls [data-key]").forEach(btn=>{
    const key=btn.dataset.key;
    if(key==="interact"){btn.addEventListener("click",()=>mobileKeys.interactTap=true);return;}
    btn.addEventListener("pointerdown",()=>mobileKeys[key]=true);
    btn.addEventListener("pointerup",()=>mobileKeys[key]=false);
    btn.addEventListener("pointerleave",()=>mobileKeys[key]=false);
    btn.addEventListener("touchend",()=>mobileKeys[key]=false);
  });
  document.getElementById("btn-dream").addEventListener("click",()=>{
    document.body.classList.toggle("daydream");
    save.dream=document.body.classList.contains("daydream");
    persist();
  });
  document.getElementById("btn-map").addEventListener("click",()=>{
    showModal("24章心路地图", `<div class="chapter-grid">${
      CHAPTERS.map(c=>`<div class="chapter-node"><b>${c[0]} ${c[1]}</b><span>${c[2]}</span></div>`).join("")
    }</div>`);
  });
  document.getElementById("btn-card").addEventListener("click",()=>{
    markDone("card");
    showModal("晚安回顾卡", `<pre>${makeCard()}</pre>`);
  });
  document.getElementById("btn-reset").addEventListener("click",()=>{
    if(confirm("重置本地进度吗？")){
      localStorage.removeItem(SAVE_KEY);
      location.reload();
    }
  });
  document.getElementById("modal-close").addEventListener("click",closeModal);
  document.getElementById("modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});
}
function showModal(title,html){
  document.getElementById("modal-title").textContent=title;
  document.getElementById("modal-body").innerHTML=html;
  document.getElementById("modal").classList.add("show");
}
function closeModal(){document.getElementById("modal").classList.remove("show");}
