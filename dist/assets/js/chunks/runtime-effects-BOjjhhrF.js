(function(){var f=[{id:"classic",name:"Classic Horror",icon:"🩸",tier:"none",anims:["anim-ghost-float","anim-zombie-lurch","anim-demon-slam","anim-blood-rise","anim-crypt-door","anim-spider-drop","anim-fog-reveal","anim-heartbeat-in","anim-glitch-snap","anim-shadow-creep","anim-whisper-fade","anim-chains-drag","anim-mirror-crack","anim-vampire-dash","anim-grave-dig","anim-possessed-shake","anim-banshee-scream","anim-warp-reality","anim-flicker-in","anim-darkness-consume","anim-haunted-sway","anim-ectoplasm","anim-tombstone","anim-bat-swarm","anim-cursed-reveal"]},{id:"death",name:"Death & Decay",icon:"💀",tier:"lite",anims:["anim-skull-roll","anim-corpse-rise","anim-coffin-lid","anim-bone-shatter","anim-decay-spread","anim-rot-fade","anim-worm-crawl","anim-grave-push","anim-death-rattle","anim-skeleton-assemble","anim-plague-cloud","anim-morgue-slab","anim-zombie-arm","anim-crypt-creak","anim-necrotic-pulse","anim-embalm","anim-catacombs","anim-reaper","anim-blood-drip-in","anim-bat-swarm"]},{id:"occult",name:"Occult",icon:"🔮",tier:"pro",anims:["anim-pentagram-spin","anim-exorcism-twist","anim-ritual-circle","anim-rune-glow","anim-ouija-slide","anim-hex-curse","anim-cauldron-bubble","anim-witch-hex","anim-demonic-summon","anim-cursed-scroll","anim-spirit-orb","anim-altar-rise","anim-voodoo","anim-dark-incantation","anim-moon-phase","anim-grimoire","anim-blood-sigil","anim-coven","anim-crystal-ball","anim-eclipse-reveal"]},{id:"psych",name:"Psychological",icon:"👁️",tier:"pro",anims:["anim-eye-open","anim-nightmare-warp","anim-phantom-phase","anim-dread-pulse","anim-soul-rip","anim-paranoia","anim-hallucination","anim-insomnia","anim-vertigo","anim-memory-flash","anim-dissociate","anim-anxiety-tremor","anim-deja-vu","anim-sleep-paralysis","anim-mind-fracture","anim-shadow-self","anim-time-lapse","anim-psychic-blast","anim-paranormal-static","anim-unreality"]},{id:"infernal",name:"Infernal",icon:"🔥",tier:"max",anims:["anim-hell-portal","anim-inferno-burst","anim-lava-flow","anim-brimstone","anim-demon-wings","anim-hellfire-rain","anim-abyss-maw","anim-poltergeist-toss","anim-claw-scratch","anim-volcanic-erupt","anim-damnation","anim-chaos-surge","anim-soul-drain","anim-infernal-chains","anim-ash-scatter","anim-dark-ascend","anim-wrath-smash","anim-torment","anim-sinister-vortex","anim-perdition"]},{id:"elemental",name:"Elemental Fury",icon:"⚡",tier:"lite",anims:["anim-fire-blast","anim-ice-shatter","anim-thunder-strike","anim-tornado-spin","anim-earthquake-rumble","anim-flood-surge","anim-meteor-impact","anim-frost-bite","anim-volcanic-ash","anim-lightning-chain","anim-magma-rise","anim-blizzard-whip","anim-acid-splash","anim-sandstorm-blur","anim-crystal-grow","anim-tsu-wave","anim-static-discharge","anim-ember-float","anim-glacial-slide","anim-storm-surge"]},{id:"dimensional",name:"Dimensional Rift",icon:"🌀",tier:"pro",anims:["anim-portal-open","anim-dimension-tear","anim-time-warp","anim-void-collapse","anim-gravity-well","anim-space-fold","anim-quantum-flicker","anim-rifter-slice","anim-cosmic-pulse","anim-nebula-drift","anim-black-hole-spin","anim-reality-glitch","anim-starburst-in","anim-mirror-dim","anim-phase-shift","anim-dark-matter","anim-wormhole-stretch","anim-entropy-decay","anim-antimatter-pop","anim-tesseract-fold"]},{id:"abomination",name:"Abomination",icon:"🧬",tier:"max",anims:["anim-tentacle-grab","anim-flesh-melt","anim-horror-crawl","anim-skin-peel","anim-eye-stalk","anim-mutant-pulse","anim-spore-cloud","anim-parasite-squirm","anim-blob-absorb","anim-hive-mind","anim-venom-drip","anim-coco-split","anim-alien-birth","anim-web-trap","anim-toxic-ooze","anim-metamorph","anim-swarm-rise","anim-chitin","anim-necro-bloom","anim-predator"]},{id:"cinematic",name:"Cinematic Horror",icon:"🎬",tier:"pro",anims:["anim-film-burn","anim-jump-scare","anim-dolly-zoom","anim-vhs-distort","anim-slow-reveal","anim-dutch-angle","anim-negative-flash","anim-cine-scope","anim-hitchcock","anim-grindhouse","anim-found-footage","anim-retro-horror","anim-silent-film","anim-projector","anim-noir-shadow","anim-zoom-enhance","anim-film-grain","anim-drama-pan","anim-splatter-in","anim-title-card"]},{id:"mythic",name:"Mythic Beasts",icon:"🐉",tier:"max",anims:["anim-dragon-breath","anim-kraken-rise","anim-werewolf-lunge","anim-phoenix-rise","anim-medusa-gaze","anim-hydra-strike","anim-cerberus-charge","anim-banshee-wail","anim-leprechaun-pop","anim-siren-call","anim-minotaur-smash","anim-griffin-soar","anim-golem-assemble","anim-vampire-cloak","anim-gargoyle-wake","anim-chimera-flux","anim-djinn-smoke","anim-naga-coil","anim-reaper-sweep","anim-troll-smash"]},{id:"survival",name:"Survival Horror",icon:"🔦",tier:"lite",anims:["anim-flashlight-reveal","anim-door-slam","anim-board-up","anim-heart-monitor","anim-ammo-check","anim-radio-crackle","anim-barricade","anim-emergency-light","anim-lock-pick","anim-hide-in-closet","anim-item-pickup","anim-footstep-dread","anim-sirens-wail","anim-stair-creak","anim-safe-room","anim-typewriter-reveal","anim-gas-leak","anim-blood-smear","anim-puzzle-solve","anim-escape-panic"]},{id:"undead",name:"Undead Rising",icon:"🧟",tier:"lite",anims:["anim-zombie-burst","anim-lich-emerge","anim-mummy-unravel","anim-skeleton-march","anim-ghoul-lunge","anim-revenant-phase","anim-undead-horde","anim-necro-raise","anim-death-knight","anim-corpse-explode","anim-bone-cage","anim-soul-harvest","anim-graveyard-shift","anim-tombstone-fall","anim-death-fog","anim-wraith-wail","anim-phantom-chains","anim-decay-bloom","anim-rot-wave","anim-crypt-slam"]},{id:"cataclysm",name:"Cataclysm",icon:"🌋",tier:"pro",anims:["anim-seismic-rupture","anim-tidal-crash","anim-volcanic-rain","anim-sinkhole-drop","anim-avalanche-rush","anim-tornado-tear","anim-meteor-shower","anim-fissure-crack","anim-tsunami-surge","anim-wildfire-spread","anim-landslide-rumble","anim-whirlpool-spin","anim-hailstone-barrage","anim-earthquake-split","anim-dust-devil","anim-flood-rush","anim-lightning-storm","anim-solar-flare","anim-comet-strike","anim-pyroclasm"]},{id:"machine",name:"Corrupted Machine",icon:"⚙️",tier:"max",anims:["anim-gear-crunch","anim-circuit-fry","anim-piston-slam","anim-static-overload","anim-wire-whip","anim-servo-glitch","anim-rust-spread","anim-power-surge","anim-motor-grind","anim-hydraulic-press","anim-arc-welder","anim-malfunction","anim-overclock","anim-data-bleed","anim-memory-dump","anim-core-meltdown","anim-assembly-fail","anim-defrag-scatter","anim-kernel-panic","anim-reboot-flash"]},{id:"asylum",name:"Asylum",icon:"🏚️",tier:"pro",anims:["anim-padded-bounce","anim-strobe-flash","anim-corridor-stretch","anim-cell-slam","anim-straight-jacket","anim-patient-twitch","anim-gurney-roll","anim-flatline","anim-sedation-blur","anim-isolation-shrink","anim-lobotomy-slice","anim-ward-flicker","anim-intercom-crackle","anim-catatonic-freeze","anim-manic-shake","anim-electroshock","anim-mirror-shatter","anim-drip-count","anim-scalpel-cut","anim-asylum-door"]},{id:"deepocean",name:"Deep Ocean",icon:"🦑",tier:"lite",anims:["anim-depth-pressure","anim-biolum-pulse","anim-kelp-sway","anim-bubble-rise","anim-trench-descent","anim-angler-lure","anim-kraken-grab","anim-coral-grow","anim-current-drift","anim-submarine-creak","anim-sonar-ping","anim-pressure-crush","anim-barnacle-crust","anim-anchor-drop","anim-shipwreck-reveal","anim-abyss-gaze","anim-deep-pulse","anim-riptide-pull","anim-pearl-gleam","anim-leviathan-shadow"]}],c=["fx-red-puff","fx-red-flash","fx-blood-mist","fx-ghost-trail","fx-shadow-burst","fx-cursed-glow","fx-ember-rise","fx-static-burst","fx-shadow-veil","fx-dark-ripple"],P=[".game-card",".section-header",".hero-title",".hero-subtitle",".hero-cta",".featured-game",".daily-card",".pricing-card",".testimonial-card",".lb-board",".ach-card",".hero-desc",".scroll-animate",".faq-item",".tier-lore-card",".comparison-section",".filter-btn",".billing-toggle-wrap",".comparison-title"],I={none:0,lite:1,pro:2,max:3},E={none:"Free",lite:"Survivor",pro:"Hunter",max:"Elder God"},h=b(),T=[],F=6,A=!1;function w(){return localStorage.getItem("sgai-sub-tier")||"none"}function u(l){var n=I[w()]||0,s=I[l.tier]||0;return n>=s}function b(){try{var l=JSON.parse(localStorage.getItem("sgai-anim-prefs"));if(l&&l.enabledPacks)return l}catch{}return{enabledPacks:["classic"],speed:1}}function m(){localStorage.setItem("sgai-anim-prefs",JSON.stringify(h))}function L(){var l=[];f.forEach(function(s){u(s)&&h.enabledPacks.indexOf(s.id)>=0&&(l=l.concat(s.anims))}),l.length===0&&(l=f[0].anims.slice());var n=[];return l.forEach(function(s){n.indexOf(s)<0&&n.push(s)}),n}function v(l){var n,s=0;do n=l[Math.floor(Math.random()*l.length)],s++;while(T.indexOf(n)!==-1&&s<15);return T.push(n),T.length>F&&T.shift(),n}var G=0,$=0,N=new IntersectionObserver(function(l,n){var s=performance.now();s-$>300&&(G=0),$=s,l.forEach(function(g){if(g.isIntersecting){var y=g.target,q=L(),o=v(q),p=c[Math.floor(Math.random()*c.length)],r=G*60;G++;var e=.55+Math.random()*.3,d=e/(h.speed||1);y.style.willChange="transform, opacity, filter",y.style.animationDelay=r+"ms",y.style.animationDuration=d.toFixed(2)+"s",y.style.animationTimingFunction="cubic-bezier(0.22, 1, 0.36, 1)",y.classList.remove("scroll-anim-init"),y.classList.add(o),y.classList.add(p),y.classList.add("scroll-anim");var i=r+d*1e3+100;setTimeout(function(){y.style.willChange="auto"},i),n.unobserve(y)}})},{threshold:.08,rootMargin:"0px 0px -30px 0px"});function H(){for(var l=document.querySelectorAll(P.join(", ")),n=0;n<l.length;n++){var s=l[n];!s.classList.contains("scroll-anim-init")&&!s.classList.contains("scroll-anim")&&(s.classList.add("scroll-anim-init"),N.observe(s))}}var _=new MutationObserver(function(l){for(var n=!1,s=0;s<l.length;s++)if(l[s].addedNodes.length>0){n=!0;break}n&&setTimeout(H,100)});function z(){var l=document.querySelector(".customizer-btns");if(!(!l&&(l=document.querySelector(".nav-inner"),!l))){var n=document.createElement("div");n.className="anim-pref-btn-wrap";var s=document.createElement("button");s.className="anim-pref-btn",s.title="Animation Styles",s.textContent="💀",n.appendChild(s);var g=document.createElement("div");g.className="anim-pref-dropdown",g.id="anim-pref-dropdown";var y=w(),q=I[y]||0,o=0,p=0;f.forEach(function(e){p+=e.anims.length,u(e)&&(o+=e.anims.length)});var r='<div class="anim-pref-header"><span>💀 Animation Styles</span><button class="anim-pref-close" id="anim-pref-close">✕</button></div>';r+='<div class="anim-pref-section"><div class="anim-pref-section-title">Animation Packs ('+o+"/"+p+" unlocked)</div>",f.forEach(function(e){var d=u(e),i=h.enabledPacks.indexOf(e.id)>=0,k=d?"":'<span class="anim-pack-lock">🔒 Requires '+E[e.tier]+"</span>",M=d&&i?"on":"";r+='<div class="anim-pack-item'+(d?"":" locked")+'" data-pack="'+e.id+'"><div class="anim-pack-icon">'+e.icon+'</div><div class="anim-pack-info"><div class="anim-pack-name">'+e.name+" "+k+'</div><div class="anim-pack-count">'+e.anims.length+' animations</div></div><div class="anim-pack-toggle '+M+'"></div></div>'}),r+="</div>",r+='<div class="anim-pref-section"><div class="anim-pref-section-title">Animation Speed</div>',r+='<div class="anim-speed-wrap">',r+='<span class="anim-speed-label">Slow</span>',r+='<input type="range" class="anim-speed-slider" id="anim-speed-slider" min="0.3" max="2" step="0.1" value="'+(h.speed||1)+'">',r+='<span class="anim-speed-label">Fast</span>',r+="</div></div>",r+='<div class="anim-pref-section">',r+='<button class="anim-preview-btn" id="anim-preview-btn">✨ Preview Random Animation</button>',r+="</div>",q<3&&(r+='<div class="anim-upgrade-hint">🔓 <a href="/subscription.html">Upgrade</a> to unlock '+(p-o)+" more animations!</div>"),g.innerHTML=r,n.appendChild(g),l.appendChild(n),s.addEventListener("click",function(e){e.stopPropagation(),A=!A,g.classList.toggle("open",A)}),document.getElementById("anim-pref-close").addEventListener("click",function(e){e.stopPropagation(),A=!1,g.classList.remove("open")}),document.addEventListener("click",function(e){e.target.closest(".anim-pref-btn-wrap")||(A=!1,g.classList.remove("open"))}),g.querySelectorAll(".anim-pack-item").forEach(function(e){e.addEventListener("click",function(){var d=e.dataset.pack,i=f.find(function(j){return j.id===d});if(!(!i||!u(i))){var k=h.enabledPacks.indexOf(d);if(k>=0){if(h.enabledPacks.length<=1)return;h.enabledPacks.splice(k,1)}else h.enabledPacks.push(d);m();var M=e.querySelector(".anim-pack-toggle");M.classList.toggle("on",h.enabledPacks.indexOf(d)>=0)}})}),document.getElementById("anim-speed-slider").addEventListener("input",function(e){h.speed=parseFloat(e.target.value),m()}),document.getElementById("anim-preview-btn").addEventListener("click",function(){var e=document.querySelector(".hero-title")||document.querySelector(".section-header")||document.querySelector(".game-card");if(e){var d=e.className.split(" ");d.forEach(function(K){(K.indexOf("anim-")===0||K.indexOf("fx-")===0)&&e.classList.remove(K)}),e.classList.remove("scroll-anim"),e.offsetWidth;var i=L(),k=i[Math.floor(Math.random()*i.length)],M=c[Math.floor(Math.random()*c.length)],j=(.7+Math.random()*.8)/(h.speed||1);e.style.animationDuration=j.toFixed(2)+"s",e.classList.add(k),e.classList.add(M),e.classList.add("scroll-anim")}})}}function C(){w(),localStorage.getItem("sgai-anim-prefs")||(h.enabledPacks=[],f.forEach(function(l){u(l)&&h.enabledPacks.push(l.id)}),m()),H(),_.observe(document.body,{childList:!0,subtree:!0}),z()}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",C):C()})();const ge=Object.freeze(Object.defineProperty({__proto__:null},Symbol.toStringTag,{value:"Module"}));(function(){const f={MINIMAL:{label:"Minimal",particles:!1,fog:!1,grain:!1,trails:!1,dust:!1,cobwebs:!1,pixelRatio:.5,shadowMap:!1,drawDistance:40,maxLights:2,postProcess:!1,antialias:!1},LOW:{label:"Low",particles:!1,fog:!1,grain:!1,trails:!1,dust:!1,cobwebs:!1,pixelRatio:.75,shadowMap:!1,drawDistance:60,maxLights:3,postProcess:!1,antialias:!1},MEDIUM:{label:"Medium",particles:!0,fog:!1,grain:!1,trails:!1,dust:!0,cobwebs:!0,pixelRatio:1,shadowMap:!0,drawDistance:100,maxLights:5,postProcess:!1,antialias:!0},HIGH:{label:"High",particles:!0,fog:!0,grain:!0,trails:!0,dust:!0,cobwebs:!0,pixelRatio:1,shadowMap:!0,drawDistance:200,maxLights:8,postProcess:!0,antialias:!0},ULTRA:{label:"Ultra",particles:!0,fog:!0,grain:!0,trails:!0,dust:!0,cobwebs:!0,pixelRatio:Math.min(window.devicePixelRatio||1,2),shadowMap:!0,drawDistance:500,maxLights:16,postProcess:!0,antialias:!0}},c={LOW_END:{maxTier:"LOW",defaultTier:"MINIMAL",pixelRatioCap:1,targetFps:30},MID_RANGE:{maxTier:"MEDIUM",defaultTier:"LOW",pixelRatioCap:1.5,targetFps:45},HIGH_END:{maxTier:"HIGH",defaultTier:"MEDIUM",pixelRatioCap:2,targetFps:60},DESKTOP:{maxTier:"ULTRA",defaultTier:"HIGH",pixelRatioCap:2,targetFps:60}},P={"backrooms-pacman":{base:"HIGH",mobile:"MEDIUM"},"the-elevator":{base:"HIGH",mobile:"LOW"},"graveyard-shift":{base:"HIGH",mobile:"LOW"},"web-of-terror":{base:"HIGH",mobile:"LOW"},"haunted-asylum":{base:"HIGH",mobile:"LOW"},"freddys-nightmare":{base:"HIGH",mobile:"MEDIUM"},"the-abyss":{base:"HIGH",mobile:"LOW"},"cursed-sands":{base:"HIGH",mobile:"LOW"},"cursed-depths":{base:"HIGH",mobile:"MEDIUM"},"nightmare-run":{base:"ULTRA",mobile:"MEDIUM"},"yeti-run":{base:"ULTRA",mobile:"MEDIUM"},"blood-tetris":{base:"ULTRA",mobile:"HIGH"},"shadow-crawler":{base:"ULTRA",mobile:"HIGH"},dollhouse:{base:"ULTRA",mobile:"HIGH"},seance:{base:"ULTRA",mobile:"HIGH"},"ritual-circle":{base:"ULTRA",mobile:"HIGH"},"zombie-horde":{base:"ULTRA",mobile:"HIGH"},"total-zombies-medieval":{base:"HIGH",mobile:"MEDIUM"}},I=60,E=28,h=50,T=1200,F=5e3,A=200,w=["MINIMAL","LOW","MEDIUM","HIGH","ULTRA"],u=/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||"ontouchstart"in window&&window.innerWidth<1024;let b=u?"MID_RANGE":"DESKTOP",m="HIGH",L="ULTRA",v=[],G=performance.now(),$=0,N=60,H=0,_=0,z=!1,C=null,l=null,n=null,s=!1,g=-1,y=0,q=1,o=!0,p=null,r=null,e=null,d=null;function i(){try{var t=document.createElement("canvas");t.width=256,t.height=256;var a=t.getContext("webgl2")||t.getContext("webgl");if(!a){g=20;return}var x=a.getExtension("WEBGL_debug_renderer_info"),D=x?a.getParameter(x.UNMASKED_RENDERER_WEBGL):"";console.log("[AdaptiveQuality] GPU: "+D);for(var O=performance.now(),B=new Float32Array(3e3),S=0;S<3e3;S++)B[S]=Math.random()*2-1;var X=a.createBuffer();a.bindBuffer(a.ARRAY_BUFFER,X),a.bufferData(a.ARRAY_BUFFER,B,a.STATIC_DRAW);var U=a.createShader(a.VERTEX_SHADER);a.shaderSource(U,"attribute vec3 p;void main(){gl_Position=vec4(p,1.0);gl_PointSize=1.0;}"),a.compileShader(U);var W=a.createShader(a.FRAGMENT_SHADER);a.shaderSource(W,"precision mediump float;void main(){gl_FragColor=vec4(1.0);}"),a.compileShader(W);var R=a.createProgram();a.attachShader(R,U),a.attachShader(R,W),a.linkProgram(R),a.useProgram(R);var V=a.getAttribLocation(R,"p");a.enableVertexAttribArray(V),a.vertexAttribPointer(V,3,a.FLOAT,!1,0,0);for(var J=0;J<50;J++)a.drawArrays(a.TRIANGLES,0,1e3);a.finish();var Y=performance.now()-O;a.deleteBuffer(X),a.deleteProgram(R),a.deleteShader(U),a.deleteShader(W),t.remove(),g=Math.max(0,Math.min(100,Math.round(100-Y))),g<30?b="LOW_END":g<60?b="MID_RANGE":u?b="HIGH_END":b="DESKTOP",console.log("[AdaptiveQuality] GPU score: "+g+", profile: "+b)}catch(Z){g=u?30:70,console.warn("[AdaptiveQuality] GPU benchmark failed:",Z)}}function k(){navigator.getBattery&&navigator.getBattery().then(function(t){q=t.level,o=t.charging,t.addEventListener("levelchange",function(){q=t.level,M()}),t.addEventListener("chargingchange",function(){o=t.charging,M()}),M()}).catch(function(){})}function M(){!o&&q<.15&&w.indexOf(m)>1&&(Q("LOW"),console.log("[AdaptiveQuality] Low battery ("+Math.round(q*100)+"%) — scaled to LOW"))}function j(){performance.memory&&(y=Math.round(performance.memory.usedJSHeapSize/1048576),y>A&&w.indexOf(m)>1&&(re(),console.log("[AdaptiveQuality] Memory warning ("+y+"MB) — scaling down")))}function K(){var t=window.location.pathname.toLowerCase();for(var a in P)if(t.indexOf(a)!==-1){p=a;return}}function ee(){i(),K(),k();var t=c[b];L=t.maxTier,p&&P[p]?m=u?P[p].mobile:P[p].base:m=t.defaultTier,w.indexOf(m)>w.indexOf(L)&&(m=L),s=window.matchMedia("(prefers-reduced-motion: reduce)").matches,window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change",function(a){s=a.matches,s?(Q("MINIMAL"),se()):(Q(t.defaultTier),fe())}),s&&(Q("MINIMAL"),se()),ue(),ie(),document.addEventListener("keydown",function(a){a.ctrlKey&&a.shiftKey&&a.key==="D"&&(a.preventDefault(),ae())}),setInterval(j,1e4),console.log("[AdaptiveQuality v2] Init — tier: "+m+", profile: "+b+", gpu: "+g+", game: "+(p||"unknown"))}function ie(){$++;var t=performance.now(),a=t-G;a>=1e3&&(N=Math.round($*1e3/a),$=0,G=t,v.push(N),v.length>I&&v.shift(),ce(t),te()),requestAnimationFrame(ie)}function ne(){return v.length===0?60:v.reduce(function(t,a){return t+a},0)/v.length}function le(){return v.length===0?60:Math.min.apply(null,v)}function ce(t){if(!s){var a=ne(),x=u?E-4:E,D=u?h+5:h;if(a<x){H||(H=t),_=0;var O=u?T*.7:T;t-H>O&&(re(),H=0)}else a>D?(_||(_=t),H=0,t-_>F&&(de(),_=0)):(H=0,_=0)}}function re(){var t=w.indexOf(m);t>0&&(Q(w[t-1]),console.log("[AdaptiveQuality] Scaled down → "+m))}function de(){var t=w.indexOf(m),a=w.indexOf(L);t<a&&(Q(w[t+1]),console.log("[AdaptiveQuality] Scaled up → "+m))}function Q(t){if(f[t]){m=t;var a=f[t];if(me(a),oe(a),typeof QualityFX!="undefined"&&QualityFX.setPerformanceMode){var x={MINIMAL:"minimal",LOW:"minimal",MEDIUM:"reduced",HIGH:"full",ULTRA:"full"};QualityFX.setPerformanceMode(x[t]||"full")}}}function me(t){var a=document.getElementById("cursor-trail");a&&(a.style.display=t.trails?"":"none");var x=document.getElementById("ambient-dust");x&&(x.style.display=t.dust?"":"none");var D=document.getElementById("particles");D&&(D.style.display=t.particles?"":"none");var O=document.getElementById("quality-fx-canvas");O&&(O.style.opacity=t.grain?"1":"0.3");var B=document.getElementById("cinematic-overlay-canvas");if(B&&(B.style.display=t.fog?"":"none"),t.label==="Minimal"){var S=document.querySelector(".mobile-controls-container");S&&(S.style.opacity="0.5")}}function oe(t){if(r)try{var a=Math.min(t.pixelRatio,window.devicePixelRatio||1);r.setPixelRatio(a),r.shadowMap&&(r.shadowMap.enabled=t.shadowMap,t.shadowMap&&(r.shadowMap.type=t.label==="Ultra"?typeof THREE!="undefined"?THREE.PCFSoftShadowMap:2:typeof THREE!="undefined"?THREE.BasicShadowMap:0)),d&&d.far!==t.drawDistance&&(d.far=t.drawDistance,d.updateProjectionMatrix()),e&&e.fog&&t.fog&&(e.fog.far=t.drawDistance)}catch(x){console.warn("[AdaptiveQuality] Three.js optimization error:",x)}}function pe(t,a,x){r=t,e=a,d=x,oe(f[m])}function se(){if(!document.getElementById("aq-reduced-motion")){var t=document.createElement("style");t.id="aq-reduced-motion",t.textContent="*, *::before, *::after {  animation-duration: 0.01ms !important;  animation-iteration-count: 1 !important;  transition-duration: 0.01ms !important;}",document.head.appendChild(t)}}function fe(){var t=document.getElementById("aq-reduced-motion");t&&t.remove()}function ue(){C=document.createElement("div"),C.id="aq-debug",C.style.cssText='position:fixed;bottom:60px;right:12px;z-index:100000;width:300px;padding:12px;background:rgba(10,10,20,0.94);border:1px solid rgba(255,255,255,0.1);border-radius:10px;backdrop-filter:blur(12px);font-family:"Courier New",monospace;font-size:0.68rem;color:rgba(255,255,255,0.7);display:none;pointer-events:auto;max-height:80vh;overflow-y:auto;',C.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">  <span style="font-weight:bold;color:#ff4444;letter-spacing:1px;">⚡ PERFORMANCE v2</span>  <button id="aq-close" style="background:none;border:none;color:#888;cursor:pointer;font-size:1rem;">×</button></div><canvas id="aq-fps-graph" width="276" height="60" style="width:100%;height:60px;border-radius:4px;background:rgba(0,0,0,0.3);margin-bottom:8px;"></canvas><div id="aq-stats" style="line-height:1.7;">  <div>FPS: <span id="aq-fps" style="color:#4ade80;">--</span> <span style="color:#555;">|</span> Min: <span id="aq-min" style="color:#fbbf24;">--</span></div>  <div>Avg FPS: <span id="aq-avg" style="color:#60a5fa;">--</span></div>  <div>Quality: <span id="aq-tier" style="color:#fbbf24;">--</span> <span style="color:#555;">|</span> Max: <span id="aq-max" style="color:#888;">--</span></div>  <div>Device: <span id="aq-device" style="color:#c084fc;">--</span></div>  <div>GPU Score: <span id="aq-gpu" style="color:#38bdf8;">--</span></div>  <div>Memory: <span id="aq-mem" style="color:#fb923c;">--</span></div>  <div>Battery: <span id="aq-batt" style="color:#4ade80;">--</span></div>  <div>Pixel Ratio: <span id="aq-pr" style="color:#e879f9;">--</span></div>  <div>Effects: <span id="aq-effects" style="color:#c084fc;">--</span></div>  <div>Game: <span id="aq-game" style="color:#94a3b8;">--</span></div>  <div>Reduced Motion: <span id="aq-rm" style="color:#f87171;">--</span></div></div><div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap;">  <button class="aq-btn" data-tier="MINIMAL">Min</button>  <button class="aq-btn" data-tier="LOW">Low</button>  <button class="aq-btn" data-tier="MEDIUM">Med</button>  <button class="aq-btn" data-tier="HIGH">High</button>  <button class="aq-btn" data-tier="ULTRA">Ultra</button></div>',document.body.appendChild(C);var t=document.createElement("style");t.textContent=".aq-btn{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.6);padding:3px 8px;border-radius:4px;cursor:pointer;font-size:0.62rem;font-family:inherit;transition:all 0.2s;-webkit-tap-highlight-color:transparent;}.aq-btn:hover{background:rgba(255,255,255,0.15);color:#fff;}.aq-btn.active{background:rgba(204,17,34,0.3);border-color:rgba(204,17,34,0.5);color:#ff6666;}",document.head.appendChild(t),C.querySelectorAll(".aq-btn").forEach(function(a){a.addEventListener("click",function(){Q(this.dataset.tier),te()})}),C.querySelector("#aq-close").addEventListener("click",ae),l=document.getElementById("aq-fps-graph"),n=l.getContext("2d")}function ae(){z=!z,C.style.display=z?"block":"none",z&&te()}function te(){if(z){var t=document.getElementById("aq-fps"),a=document.getElementById("aq-min"),x=document.getElementById("aq-avg"),D=document.getElementById("aq-tier"),O=document.getElementById("aq-max"),B=document.getElementById("aq-device"),S=document.getElementById("aq-gpu"),X=document.getElementById("aq-mem"),U=document.getElementById("aq-batt"),W=document.getElementById("aq-pr"),R=document.getElementById("aq-effects"),V=document.getElementById("aq-game"),J=document.getElementById("aq-rm");t&&(t.textContent=N,t.style.color=N>=50?"#4ade80":N>=30?"#fbbf24":"#f87171"),a&&(a.textContent=le()),x&&(x.textContent=ne().toFixed(1)),D&&(D.textContent=m),O&&(O.textContent=L),B&&(B.textContent=b+(u?" (mobile)":" (desktop)")),S&&(S.textContent=g>=0?g+"/100":"N/A"),X&&(X.textContent=y?y+" MB":"N/A"),U&&(U.textContent=q<1?Math.round(q*100)+"%"+(o?" ⚡":""):"N/A"),W&&(W.textContent=r?r.getPixelRatio().toFixed(2):(window.devicePixelRatio||1).toFixed(2)),V&&(V.textContent=p||"unknown"),J&&(J.textContent=s?"ON":"OFF");var Y=0;document.getElementById("cursor-trail")&&document.getElementById("cursor-trail").style.display!=="none"&&Y++,document.getElementById("ambient-dust")&&document.getElementById("ambient-dust").style.display!=="none"&&Y++,document.getElementById("particles")&&document.getElementById("particles").style.display!=="none"&&Y++,document.getElementById("quality-fx-canvas")&&Y++,document.getElementById("cinematic-overlay-canvas")&&document.getElementById("cinematic-overlay-canvas").style.display!=="none"&&Y++,R&&(R.textContent=Y+" active"),C.querySelectorAll(".aq-btn").forEach(function(Z){Z.classList.toggle("active",Z.dataset.tier===m)}),he()}}function he(){if(!(!n||v.length<2)){var t=l.width,a=l.height;n.clearRect(0,0,t,a),n.strokeStyle="rgba(255,255,255,0.05)",n.lineWidth=.5;for(var x=0;x<a;x+=15)n.beginPath(),n.moveTo(0,x),n.lineTo(t,x),n.stroke();var D=a-30/120*a;n.strokeStyle="rgba(248,113,113,0.3)",n.setLineDash([4,4]),n.beginPath(),n.moveTo(0,D),n.lineTo(t,D),n.stroke(),n.setLineDash([]);var O=a-60/120*a;n.strokeStyle="rgba(74,222,128,0.3)",n.setLineDash([4,4]),n.beginPath(),n.moveTo(0,O),n.lineTo(t,O),n.stroke(),n.setLineDash([]);var B=t/(I-1);n.beginPath(),n.strokeStyle="#4ade80",n.lineWidth=1.5;for(var S=0;S<v.length;S++){var X=S*B,U=a-Math.min(v[S],120)/120*a;S===0?n.moveTo(X,U):n.lineTo(X,U)}n.stroke();var W=(v.length-1)*B;n.lineTo(W,a),n.lineTo(0,a),n.closePath();var R=n.createLinearGradient(0,0,0,a);R.addColorStop(0,"rgba(74,222,128,0.15)"),R.addColorStop(1,"rgba(74,222,128,0)"),n.fillStyle=R,n.fill()}}return document.readyState==="loading"?document.addEventListener("DOMContentLoaded",ee):ee(),{init:ee,getTier:function(){return m},getConfig:function(){return f[m]},setTier:Q,toggleDebug:ae,registerThreeJs:pe,getDeviceProfile:function(){return b},getGpuScore:function(){return g},getMemoryMB:function(){return y},isMobile:u,TIERS:f,TIER_ORDER:w}})();const be=Object.freeze(Object.defineProperty({__proto__:null},Symbol.toStringTag,{value:"Module"}));(function(){let f=null,c=null,P=0;const I=["fade","blood-wipe","glitch","dissolve","slash","static","spiral","shatter"];function E(){h(),T(),w(),A(),F(),window.addEventListener("scroll",F,{passive:!0}),console.log("[PageTransitions] Initialized with "+I.length+" transition styles")}function h(){f=document.createElement("div"),f.id="page-transition",f.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;pointer-events:none;opacity:0;transition:none;",document.body.appendChild(f);const u=document.createElement("style");u.textContent=`
            /* === Transition Animations === */
            @keyframes ptFade { 0%{opacity:0} 40%{opacity:1} 100%{opacity:1} }
            @keyframes ptBloodWipe { 0%{transform:translateX(-100%)} 100%{transform:translateX(0)} }
            @keyframes ptGlitch {
                0%{opacity:0} 10%{opacity:1} 15%{opacity:0} 20%{opacity:1}
                25%{opacity:0} 35%{opacity:1} 40%{opacity:0.8;transform:translate(3px,-2px)}
                50%{opacity:1;transform:translate(-2px,1px)} 60%{opacity:1}
                100%{opacity:1}
            }
            @keyframes ptDissolve {
                0%{backdrop-filter:blur(0);opacity:0} 50%{backdrop-filter:blur(20px);opacity:0.7}
                100%{backdrop-filter:blur(40px);opacity:1}
            }
            @keyframes ptSlash {
                0%{clip-path:polygon(0 0,0 0,0 100%,0 100%)} 
                100%{clip-path:polygon(0 0,100% 0,100% 100%,0 100%)}
            }
            @keyframes ptStatic {
                0%{opacity:0;background-size:3px 3px} 30%{opacity:0.8} 60%{opacity:0.4;background-size:2px 2px}
                80%{opacity:0.9} 100%{opacity:1;background-size:4px 4px}
            }
            @keyframes ptSpiral {
                0%{transform:scale(0) rotate(0deg);opacity:0;border-radius:50%}
                60%{opacity:1;border-radius:30%}
                100%{transform:scale(2) rotate(180deg);opacity:1;border-radius:0}
            }
            @keyframes ptShatter {
                0%{opacity:0;filter:blur(0)} 20%{opacity:0.5;filter:blur(2px)}
                40%{opacity:0.3;filter:blur(0)} 60%{opacity:0.8;filter:blur(4px)}
                80%{opacity:0.6;filter:blur(1px)} 100%{opacity:1;filter:blur(0)}
            }

            #page-transition.pt-fade { background:#000; animation:ptFade 0.5s ease forwards; }
            #page-transition.pt-blood-wipe {
                background:linear-gradient(90deg,#1a0000,#330000 40%,#880000 80%,#cc0000);
                animation:ptBloodWipe 0.5s ease-out forwards;
            }
            #page-transition.pt-glitch {
                background:#0a0a0f;
                animation:ptGlitch 0.5s steps(4) forwards;
            }
            #page-transition.pt-dissolve {
                background:rgba(0,0,0,0.95);
                animation:ptDissolve 0.5s ease forwards;
            }
            #page-transition.pt-slash {
                background:linear-gradient(135deg,#000,#1a0000);
                animation:ptSlash 0.4s ease-out forwards;
            }
            #page-transition.pt-static {
                background-image:url("data:image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='1' fill='%23222'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23111'/%3E%3C/svg%3E");
                background-color:#000;
                animation:ptStatic 0.5s steps(3) forwards;
            }
            #page-transition.pt-spiral {
                background:radial-gradient(circle,#330000,#000);
                animation:ptSpiral 0.5s ease-in forwards;
            }
            #page-transition.pt-shatter {
                background:linear-gradient(45deg,#0a0a0f 25%,#1a0000 50%,#0a0a0f 75%);
                animation:ptShatter 0.5s ease forwards;
            }

            /* === Scroll Progress Bar === */
            #scroll-progress {
                position:fixed;
                top:0;
                left:0;
                height:3px;
                width:0%;
                background:linear-gradient(90deg,var(--accent-red,#cc1122),#ff4444,var(--accent-red,#cc1122));
                z-index:10001;
                transition:width 0.1s linear;
                box-shadow:0 0 8px var(--accent-red-glow, rgba(204,17,34,0.5));
                border-radius:0 2px 2px 0;
            }

            /* === Animated Nav Links === */
            .nav-links a {
                position:relative;
                overflow:hidden;
            }
            .nav-links a::before {
                content:'';
                position:absolute;
                bottom:2px;
                left:0;
                width:0;
                height:2px;
                background:linear-gradient(90deg,transparent,var(--accent-red,#cc1122),transparent);
                transition:width 0.35s cubic-bezier(0.25,0.8,0.25,1);
                box-shadow:0 0 6px var(--accent-red-glow, rgba(204,17,34,0.4));
                border-radius:1px;
            }
            .nav-links a:hover::before {
                width:100%;
            }
            .nav-links a:hover {
                text-shadow:0 0 10px var(--accent-red-glow, rgba(204,17,34,0.4));
            }
        `,document.head.appendChild(u)}function T(){c=document.createElement("div"),c.id="scroll-progress",document.body.appendChild(c)}function F(){if(!c)return;const u=window.scrollY||document.documentElement.scrollTop,b=document.documentElement.scrollHeight-window.innerHeight,m=b>0?u/b*100:0;c.style.width=m+"%"}function A(){document.querySelectorAll(".nav-links a").forEach(m=>{m.addEventListener("click",function(L){const v=document.createElement("span");v.style.cssText=`
                    position:absolute;top:50%;left:50%;
                    width:0;height:0;border-radius:50%;
                    background:var(--accent-red-glow, rgba(204,17,34,0.3));
                    transform:translate(-50%,-50%);
                    animation:navRipple 0.4s ease-out forwards;
                    pointer-events:none;
                `,m.appendChild(v),setTimeout(()=>v.remove(),500)})});const b=document.createElement("style");b.textContent=`
            @keyframes navRipple {
                0% { width:0; height:0; opacity:1; }
                100% { width:120px; height:120px; opacity:0; }
            }
        `,document.head.appendChild(b)}function w(){document.addEventListener("click",function(u){const b=u.target.closest("a[href]");if(!b)return;const m=b.getAttribute("href");if(!m||m.startsWith("#")||m.startsWith("http")||m.startsWith("javascript:")||b.target==="_blank")return;u.preventDefault(),P=Math.floor(Math.random()*I.length);const L=I[P];f.className="",f.style.opacity="",f.style.pointerEvents="all",f.offsetWidth,f.classList.add("pt-"+L),setTimeout(function(){window.location.href=m},450)})}return document.readyState==="loading"?document.addEventListener("DOMContentLoaded",E):E(),{init:E,STYLES:I}})();const ve=Object.freeze(Object.defineProperty({__proto__:null},Symbol.toStringTag,{value:"Module"}));(function(){let f=null,c=null,P=0,I=0;const E=[];let h=null,T="",F=0,A=0,w=!0;const u="ontouchstart"in window&&!("onmousedown"in window||window.innerWidth>=1024),b={blood:{cursor:{fill:"%23cc1122",stroke:"%23660000"},pointer:{fill:"%23ff4444",stroke:"%23880000"},crosshair:{stroke:"%23cc1122",dot:"%23cc1122"},trail:{hues:[0,350],sat:80,lit:40,glow:[0,90,30],behavior:"drip"}},toxic:{cursor:{fill:"%2333ff33",stroke:"%23006600"},pointer:{fill:"%2344ff88",stroke:"%23008833"},crosshair:{stroke:"%2333ff33",dot:"%2333ff33"},trail:{hues:[120,140],sat:80,lit:45,glow:[130,90,35],behavior:"fizz"}},frost:{cursor:{fill:"%2366ccff",stroke:"%23003366"},pointer:{fill:"%2388ddff",stroke:"%23005588"},crosshair:{stroke:"%2366ccff",dot:"%2366ccff"},trail:{hues:[195,210],sat:70,lit:60,glow:[200,80,50],behavior:"sparkle"}},cursed:{cursor:{fill:"%23ffaa00",stroke:"%23664400"},pointer:{fill:"%23ffcc33",stroke:"%23886600"},crosshair:{stroke:"%23ffaa00",dot:"%23ffaa00"},trail:{hues:[35,50],sat:90,lit:50,glow:[40,90,40],behavior:"float"}},void:{cursor:{fill:"%238833cc",stroke:"%23330066"},pointer:{fill:"%23aa55ee",stroke:"%23550088"},crosshair:{stroke:"%238833cc",dot:"%238833cc"},trail:{hues:[270,290],sat:70,lit:45,glow:[280,80,35],behavior:"orbit"}},fire:{cursor:{fill:"%23ff6600",stroke:"%23882200"},pointer:{fill:"%23ff8833",stroke:"%23aa4400"},crosshair:{stroke:"%23ff6600",dot:"%23ff6600"},trail:{hues:[15,40],sat:95,lit:50,glow:[25,95,40],behavior:"rise"}},cyber:{cursor:{fill:"%2300ffcc",stroke:"%23006644"},pointer:{fill:"%23ff00aa",stroke:"%23660044"},crosshair:{stroke:"%2300ffcc",dot:"%23ff00aa"},trail:{hues:[170,310],sat:100,lit:55,glow:[170,100,45],behavior:"glitch"}},ocean:{cursor:{fill:"%230088cc",stroke:"%23003355"},pointer:{fill:"%2333aadd",stroke:"%23005577"},crosshair:{stroke:"%230088cc",dot:"%230088cc"},trail:{hues:[200,220],sat:65,lit:45,glow:[210,70,35],behavior:"bubble"}},witch:{cursor:{fill:"%23aa44ff",stroke:"%23440088"},pointer:{fill:"%2366ff66",stroke:"%23008800"},crosshair:{stroke:"%23aa44ff",dot:"%2366ff66"},trail:{hues:[280,130],sat:80,lit:50,glow:[280,85,40],behavior:"spiral"}},jungle:{cursor:{fill:"%2344cc44",stroke:"%23115511"},pointer:{fill:"%2366ee66",stroke:"%23228822"},crosshair:{stroke:"%2344cc44",dot:"%2344cc44"},trail:{hues:[100,130],sat:60,lit:40,glow:[110,65,30],behavior:"leaf"}},electric:{cursor:{fill:"%23ffdd00",stroke:"%23665500"},pointer:{fill:"%23ffee44",stroke:"%23887700"},crosshair:{stroke:"%23ffdd00",dot:"%23ffdd00"},trail:{hues:[50,60],sat:100,lit:55,glow:[55,100,45],behavior:"zap"}},necrotic:{cursor:{fill:"%23bbaa88",stroke:"%23443322"},pointer:{fill:"%23ccbb99",stroke:"%23554433"},crosshair:{stroke:"%23bbaa88",dot:"%23bbaa88"},trail:{hues:[40,30],sat:25,lit:55,glow:[35,30,40],behavior:"ash"}},crimson:{cursor:{fill:"%23ee0022",stroke:"%23550008"},pointer:{fill:"%23ff3344",stroke:"%23770011"},crosshair:{stroke:"%23ee0022",dot:"%23ee0022"},trail:{hues:[350,5],sat:90,lit:35,glow:[355,95,25],behavior:"drip"}},silent:{cursor:{fill:"%23999999",stroke:"%23333333"},pointer:{fill:"%23bbbbbb",stroke:"%23555555"},crosshair:{stroke:"%23999999",dot:"%23999999"},trail:{hues:[0,0],sat:0,lit:60,glow:[0,0,40],behavior:"ash"}}},m={default:"blood",crimson:"crimson",eclipse:"crimson","blood-valentine":"crimson",slasher:"crimson",toxic:"toxic",biohazard:"toxic",sewer:"toxic",ghost:"frost","frozen-december":"frost",blizzard:"frost",cursed:"cursed","ancient-scroll":"cursed","autumn-dread":"cursed",void:"void",shadowrealm:"void","the-ring":"void",hellfire:"fire",fireball:"fire",inferno:"fire","upside-down":"void",carnival:"witch","cyberpunk-horror":"cyber",tsunami:"ocean","deep-sea":"ocean",witchcraft:"witch","gothic-cathedral":"witch",jungle:"jungle","alien-hive":"jungle",thunderstorm:"electric","summer-plague":"electric",necrotic:"necrotic","silent-asylum":"silent"};function L(){const o=localStorage.getItem("sg_theme")||"default";return b[m[o]||"blood"]}function v(){return localStorage.getItem("sg_theme")||"default"}function G(){T=v(),N(),_(),C(),n(),s(),setInterval($,500),console.log("[MicroInteractions] All micro-interactions initialized (theme-aware)")}function $(){const o=v();o!==T&&(T=o,H())}function N(){h=document.createElement("style"),h.id="theme-cursor-style",document.head.appendChild(h),H()}function H(){const o=L(),p=o.cursor,r=o.pointer,e=o.crosshair;h.textContent=`
            body {
                cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M4 2l6 6-3.5 3.5L13 18l-2 2-6.5-6.5L1 17V2h3z' fill='${p.fill}' stroke='${p.stroke}' stroke-width='0.5'/%3E%3C/svg%3E") 4 2, auto;
            }
            a, button, [role='button'], .game-card, .nav-links a, input[type='submit'],
            .pricing-card, .cust-btn, .cust-item, .filter-btn, .faq-item {
                cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='28' viewBox='0 0 24 28'%3E%3Cpath d='M8 1v13l3-3 3 6 2-1-3-6h5L8 1z' fill='${r.fill}' stroke='${r.stroke}' stroke-width='0.5'/%3E%3C/svg%3E") 8 1, pointer;
            }
            .game-container, #game-canvas {
                cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='8' fill='none' stroke='${e.stroke}' stroke-width='1'/%3E%3Cline x1='12' y1='2' x2='12' y2='8' stroke='${e.stroke}' stroke-width='1'/%3E%3Cline x1='12' y1='16' x2='12' y2='22' stroke='${e.stroke}' stroke-width='1'/%3E%3Cline x1='2' y1='12' x2='8' y2='12' stroke='${e.stroke}' stroke-width='1'/%3E%3Cline x1='16' y1='12' x2='22' y2='12' stroke='${e.stroke}' stroke-width='1'/%3E%3Ccircle cx='12' cy='12' r='2' fill='${e.dot}'/%3E%3C/svg%3E") 12 12, crosshair;
            }
        `}function _(){if(u)return;f=document.createElement("canvas"),f.id="cursor-trail",f.style.cssText="position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9998;will-change:transform;",document.body.appendChild(f),c=f.getContext("2d");function o(){F=window.innerWidth,A=window.innerHeight,f.width=F,f.height=A}o(),window.addEventListener("resize",o),document.addEventListener("visibilitychange",function(){w=!document.hidden,w&&requestAnimationFrame(z)}),document.addEventListener("mousemove",function(p){if(P=p.clientX,I=p.clientY,E.length<35){const e=L().trail,d=e.hues[0]+Math.random()*(e.hues[1]-e.hues[0]),i={x:P,y:I,life:1,size:2+Math.random()*3,vx:0,vy:0,hue:d,sat:e.sat,lit:e.lit,glow:e.glow,behavior:e.behavior};switch(e.behavior){case"drip":i.vx=(Math.random()-.5)*1.2,i.vy=Math.random()*2+.5;break;case"fizz":i.vx=(Math.random()-.5)*3,i.vy=-Math.random()*2-.5,i.size*=.8;break;case"sparkle":i.vx=(Math.random()-.5)*2,i.vy=(Math.random()-.5)*2,i.size=1+Math.random()*2;break;case"float":i.vx=(Math.random()-.5)*.8,i.vy=-Math.random()*.5-.2;break;case"orbit":i.angle=Math.random()*Math.PI*2,i.orbitR=5+Math.random()*15,i.orbitSpeed=.08+Math.random()*.1,i.vx=0,i.vy=0;break;case"rise":i.vx=(Math.random()-.5)*1,i.vy=-Math.random()*3-1,i.size=1.5+Math.random()*3;break;case"glitch":i.vx=(Math.random()-.5)*5,i.vy=(Math.random()-.5)*5,i.size=1+Math.random()*2,i.shape="rect";break;case"bubble":i.vx=(Math.random()-.5)*.5,i.vy=-Math.random()*1.5-.3,i.size=3+Math.random()*4,i.shape="ring";break;case"spiral":i.angle=Math.random()*Math.PI*2,i.spiralR=0,i.spiralSpeed=.12;break;case"leaf":i.vx=(Math.random()-.5)*2,i.vy=Math.random()*1.5+.5,i.wobble=Math.random()*Math.PI*2;break;case"zap":i.vx=(Math.random()-.5)*6,i.vy=(Math.random()-.5)*6,i.size=1+Math.random()*1.5,i.shape="line";break;case"ash":i.vx=(Math.random()-.5)*.5,i.vy=Math.random()*.8+.2,i.size=1+Math.random()*2;break;default:i.vx=(Math.random()-.5)*1.5,i.vy=Math.random()*2+.5}E.push(i)}},{passive:!0}),z()}function z(){if(!f||!w)return;if(E.length===0){requestAnimationFrame(z);return}const o=F,p=A;c.clearRect(0,0,o,p);for(let r=E.length-1;r>=0;r--){const e=E[r];switch(e.life-=.03,e.behavior){case"drip":e.x+=e.vx,e.y+=e.vy,e.vy+=.06;break;case"fizz":e.x+=e.vx,e.y+=e.vy,e.vx*=.96,e.vy*=.96;break;case"sparkle":e.x+=e.vx*e.life,e.y+=e.vy*e.life;break;case"float":e.x+=e.vx+Math.sin(e.life*8)*.5,e.y+=e.vy;break;case"orbit":e.angle+=e.orbitSpeed,e.x=e.x+Math.cos(e.angle)*e.orbitR*.03,e.y=e.y+Math.sin(e.angle)*e.orbitR*.03,e.orbitR*=.99;break;case"rise":e.x+=e.vx,e.y+=e.vy,e.vx+=(Math.random()-.5)*.2;break;case"glitch":Math.random()>.7&&(e.x+=(Math.random()-.5)*8,e.y+=(Math.random()-.5)*8);break;case"bubble":e.x+=e.vx+Math.sin(e.life*10)*.3,e.y+=e.vy,e.size*=1.005;break;case"spiral":e.angle+=e.spiralSpeed,e.spiralR+=.3,e.x+=Math.cos(e.angle)*e.spiralR*.05,e.y+=Math.sin(e.angle)*e.spiralR*.05;break;case"leaf":e.wobble+=.1,e.x+=e.vx+Math.sin(e.wobble)*1.2,e.y+=e.vy,e.vx*=.98;break;case"zap":e.x+=e.vx,e.y+=e.vy,e.vx*=.85,e.vy*=.85;break;case"ash":e.x+=e.vx+Math.sin(e.life*5)*.3,e.y+=e.vy;break;default:e.x+=e.vx,e.y+=e.vy,e.vy+=.05}if(e.life<=0){E.splice(r,1);continue}const d=e.life*.55,i=`hsla(${e.hue}, ${e.sat}%, ${e.lit}%, ${d.toFixed(3)})`,k=e.size*e.life;if(e.shape==="rect"?(c.fillStyle=i,c.fillRect(e.x-k/2,e.y-k/2,k,k*.4)):e.shape==="ring"?(c.strokeStyle=i,c.lineWidth=.8,c.beginPath(),c.arc(e.x,e.y,k,0,Math.PI*2),c.stroke()):e.shape==="line"?(c.strokeStyle=i,c.lineWidth=1,c.beginPath(),c.moveTo(e.x,e.y),c.lineTo(e.x+e.vx*3,e.y+e.vy*3),c.stroke()):(c.fillStyle=i,c.beginPath(),c.arc(e.x,e.y,k,0,Math.PI*2),c.fill()),e.life>.4&&e.glow){const M=(d*.25).toFixed(3);c.fillStyle=`hsla(${e.glow[0]}, ${e.glow[1]}%, ${e.glow[2]}%, ${M})`,c.beginPath(),c.arc(e.x,e.y,k*2.5,0,Math.PI*2),c.fill()}}requestAnimationFrame(z)}function C(){const o=document.createElement("style");o.textContent=`
            /* Enhanced button hover states */
            .start-btn, .play-btn, .hero-cta, .start-btn-alt {
                position: relative;
                overflow: hidden;
                transition: all 0.3s cubic-bezier(0.25,0.8,0.25,1) !important;
            }
            .start-btn:hover, .play-btn:hover, .hero-cta:hover, .start-btn-alt:hover {
                transform: scale(1.05) !important;
                box-shadow:
                    0 0 20px var(--accent-red-glow, rgba(204,17,34,0.4)),
                    0 0 40px var(--border-glow, rgba(204,17,34,0.2)),
                    inset 0 0 15px var(--border-glow, rgba(204,17,34,0.1)) !important;
            }
            .start-btn:active, .play-btn:active, .hero-cta:active, .start-btn-alt:active {
                transform: scale(0.97) !important;
                animation: btnShake 0.15s ease 1 !important;
            }
            @keyframes btnShake {
                0%{transform:translate(0) scale(0.97)} 25%{transform:translate(-2px,1px) scale(0.97)}
                50%{transform:translate(2px,-1px) scale(0.97)} 75%{transform:translate(-1px,-1px) scale(0.97)}
                100%{transform:translate(0) scale(0.97)}
            }
            /* Shimmer sweep across button */
            .start-btn::after, .play-btn::after, .hero-cta::after, .start-btn-alt::after {
                content: '';
                position: absolute;
                top: -50%;
                left: -75%;
                width: 50%;
                height: 200%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
                transform: skewX(-25deg);
                transition: none;
                animation: btnShimmer 4s ease-in-out infinite;
            }
            @keyframes btnShimmer {
                0% { left: -75%; }
                50% { left: 125%; }
                100% { left: 125%; }
            }
            /* Glow pulse for CTA */
            .hero-cta {
                animation: ctaGlowPulse 3s ease-in-out infinite !important;
            }
            @keyframes ctaGlowPulse {
                0%,100% { box-shadow: 0 0 15px var(--accent-red-glow, rgba(204,17,34,0.3)), 0 4px 20px rgba(0,0,0,0.3); }
                50% { box-shadow: 0 0 30px var(--accent-red-glow, rgba(204,17,34,0.5)), 0 0 60px var(--border-glow, rgba(204,17,34,0.15)), 0 4px 20px rgba(0,0,0,0.3); }
            }
        `,document.head.appendChild(o),document.addEventListener("click",function(p){const r=p.target.closest(".start-btn, .play-btn, .hero-cta, .start-btn-alt");if(!r)return;const e=r.getBoundingClientRect(),d=e.left+e.width/2,i=e.top+e.height/2;l(d,i)})}function l(o,p){for(let r=0;r<12;r++){const e=document.createElement("div"),d=r/12*Math.PI*2,i=30+Math.random()*40,k=Math.cos(d)*i,M=Math.sin(d)*i,j=3+Math.random()*4;e.style.cssText=`
                position:fixed;left:${o}px;top:${p}px;
                width:${j}px;height:${j}px;
                background:radial-gradient(circle, var(--accent-red, #ff4444), var(--bg-secondary, #880000));
                border-radius:50%;pointer-events:none;z-index:99998;
                transition:all 0.5s cubic-bezier(0.25,0.8,0.25,1);
                opacity:1;
            `,document.body.appendChild(e),requestAnimationFrame(()=>{e.style.transform=`translate(${k}px, ${M}px) scale(0)`,e.style.opacity="0"}),setTimeout(()=>e.remove(),600)}}function n(){const o=document.createElement("style");o.textContent=`
            /* Glitch-on-scroll for section headings */
            .section-title, h2, .section-header h2 {
                transition: all 0.4s ease;
            }
            .heading-glitch {
                animation: headingGlitch 0.6s ease 1 !important;
            }
            @keyframes headingGlitch {
                0% { transform:translate(0); filter:none; }
                10% { transform:translate(-2px,1px); filter:blur(1px); color:#ff4444; }
                20% { transform:translate(2px,-1px); filter:none; }
                30% { transform:translate(-1px,-1px); filter:blur(0.5px); }
                40% { transform:translate(1px,1px); filter:none; color:inherit; }
                50% { transform:translate(0); clip-path:inset(20% 0 30% 0); }
                60% { clip-path:inset(60% 0 10% 0); }
                70% { clip-path:none; transform:translate(-1px,0); }
                100% { transform:translate(0); filter:none; clip-path:none; }
            }
            /* Typewriter reveal */
            .heading-reveal {
                animation: headingReveal 0.8s ease forwards !important;
            }
            @keyframes headingReveal {
                0% { opacity:0; letter-spacing:15px; filter:blur(8px); }
                50% { opacity:0.7; letter-spacing:5px; filter:blur(2px); }
                100% { opacity:1; letter-spacing:normal; filter:blur(0); }
            }
        `,document.head.appendChild(o);const p=new IntersectionObserver(function(r){r.forEach(e=>{if(e.isIntersecting&&!e.target.dataset.animated){e.target.dataset.animated="1";const d=Math.random()>.4?"heading-glitch":"heading-reveal";e.target.classList.add(d),setTimeout(()=>e.target.classList.remove(d),1e3)}})},{threshold:.3});document.querySelectorAll(".section-title, .section-header h2, h2").forEach(r=>{p.observe(r)})}function s(){g(),y(),q()}function g(){const p="data:image/svg+xml,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
            <path d="M0,0 Q30,5 50,50 Q5,30 0,0" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>
            <path d="M0,0 Q20,15 50,50 Q15,20 0,0" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="0.3"/>
            <path d="M0,0 Q10,25 50,50 Q25,10 0,0" fill="none" stroke="rgba(255,255,255,0.025)" stroke-width="0.3"/>
            <path d="M0,0 Q40,2 50,50" fill="none" stroke="rgba(255,255,255,0.02)" stroke-width="0.3"/>
            <path d="M0,0 Q2,40 50,50" fill="none" stroke="rgba(255,255,255,0.02)" stroke-width="0.3"/>
            <circle cx="15" cy="15" r="0.5" fill="rgba(255,255,255,0.04)"/>
            <circle cx="25" cy="10" r="0.3" fill="rgba(255,255,255,0.03)"/>
        </svg>`),r=document.createElement("style");r.textContent=`
            /* Cobweb corners */
            body::before {
                content:'';
                position:fixed;
                top:var(--nav-height, 60px);
                left:0;
                width:120px;
                height:120px;
                background-image:url("${p}");
                background-size:contain;
                background-repeat:no-repeat;
                pointer-events:none;
                z-index:50;
                opacity:0.6;
            }
            body::after {
                content:'';
                position:fixed;
                top:var(--nav-height, 60px);
                right:0;
                width:120px;
                height:120px;
                background-image:url("${p}");
                background-size:contain;
                background-repeat:no-repeat;
                pointer-events:none;
                z-index:50;
                opacity:0.5;
                transform:scaleX(-1);
            }
        `,document.head.appendChild(r)}function y(){const o=document.createElement("div");o.id="ambient-dust",o.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:49;overflow:hidden;",document.body.appendChild(o);const p=document.createElement("style");p.textContent=`
            .dust-particle {
                position:absolute;
                border-radius:50%;
                background:rgba(200,190,170,0.15);
                pointer-events:none;
                animation:dustFloat linear infinite;
            }
            @keyframes dustFloat {
                0% { transform:translateY(0) translateX(0) rotate(0deg); opacity:0; }
                10% { opacity:1; }
                90% { opacity:1; }
                100% { transform:translateY(-100vh) translateX(30px) rotate(360deg); opacity:0; }
            }
        `,document.head.appendChild(p);for(let r=0;r<20;r++){const e=document.createElement("div");e.className="dust-particle";const d=1+Math.random()*2.5,i=Math.random()*100,k=Math.random()*15,M=10+Math.random()*15;e.style.cssText+=`
                width:${d}px;height:${d}px;
                left:${i}%;
                bottom:-5px;
                animation-delay:${k}s;
                animation-duration:${M}s;
            `,o.appendChild(e)}}function q(){const o=document.createElement("style");o.textContent=`
            /* Subtle scratch/grunge texture */
            .main-content::after {
                content:'';
                position:fixed;
                top:0;left:0;width:100%;height:100%;
                pointer-events:none;
                z-index:48;
                background-image:
                    linear-gradient(90deg, transparent 98%, rgba(255,255,255,0.01) 98.5%, transparent 99%),
                    linear-gradient(0deg, transparent 97%, rgba(255,255,255,0.008) 97.5%, transparent 98%),
                    linear-gradient(45deg, transparent 96%, rgba(255,255,255,0.005) 96.5%, transparent 97%);
                background-size: 80px 100%, 100% 60px, 120px 120px;
                opacity:0.5;
                mix-blend-mode:overlay;
            }
        `,document.head.appendChild(o)}return document.readyState==="loading"?document.addEventListener("DOMContentLoaded",G):G(),{init:G}})();const ye=Object.freeze(Object.defineProperty({__proto__:null},Symbol.toStringTag,{value:"Module"}));export{be as a,ye as m,ge as s,ve as t};
