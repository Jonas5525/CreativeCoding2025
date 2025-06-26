window.addEventListener('load', () => {
  const socket = new WebSocket('wss://creativecoding2025-production.up.railway.app');

  let audioContext; 
  let analyser;
  let freqDataArray;
  let visualizerBars = [];
  let animationId = null;

  const sounds = {};
  const activeSources = {};
  const buttonEntities = {};

  const soundNames = [
    'drum', 'bass', 'melody',
    'drumloop2', 'drumloop', 'hihatclosed', 'traploop',
    'melody2', 'fastdrum2', 'fastdrum', 'drumloop3',
    'drumloop4', 'drumloop5', 'discoloop', 'drumloop6', 'electronicbeat'
  ];

  async function loadSounds() {
    for (let name of soundNames) {
      try {
        const response = await fetch(`audio/${name}.wav`);
        const arrayBuffer = await response.arrayBuffer();
        sounds[name] = arrayBuffer;
        console.log(`✅ Loaded ${name}`);
      } catch (e) {
        console.error(`❌ Error loading ${name}:`, e);
      }
    }
  }

  async function decodeSounds() {
    const decodedSounds = {};
    for (let name of soundNames) {
      try {
        decodedSounds[name] = await audioContext.decodeAudioData(sounds[name].slice(0));
      } catch (e) {
        console.error(`❌ Fehler beim Dekodieren von ${name}:`, e);
      }
    }
    return decodedSounds;
  }

  let decodedSounds = {};

  async function playSound(name) {
    if (!audioContext) {
      console.warn('AudioContext nicht vorhanden!');
      return;
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    if (activeSources[name]) return;

    const source = audioContext.createBufferSource();
    source.buffer = decodedSounds[name];
    source.loop = true;

    if (!analyser) {
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      freqDataArray = new Uint8Array(analyser.frequencyBinCount);
    }

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    source.start();
    activeSources[name] = source;

    if (visualizerBars.length === 0) createVisualizerBars();
    if (!animationId) animateVisualizer();

    updateButtonColor(name);
  }

  function stopSound(name) {
    if (activeSources[name]) {
      activeSources[name].stop();
      delete activeSources[name];
      updateButtonColor(name);
    }

    if (Object.keys(activeSources).length === 0) {
      visualizerBars.forEach(pair => {
        if (pair.left.parentNode) pair.left.parentNode.removeChild(pair.left);
        if (pair.right.parentNode) pair.right.parentNode.removeChild(pair.right);
      });
      visualizerBars = [];
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  function sendSound(name) {
    if (activeSources[name]) {
      stopSound(name);
      socket.send(JSON.stringify({ type: 'sound', name, action: 'stop' }));
    } else {
      playSound(name);
      socket.send(JSON.stringify({ type: 'sound', name, action: 'start' }));
    }
  }

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'sound') {
      if (data.action === 'start') {
        playSound(data.name);
      } else if (data.action === 'stop') {
        stopSound(data.name);
      }
    }
  };

  function updateButtonColor(name) {
    const btn = buttonEntities[name];
    if (btn) {
      btn.setAttribute('color', activeSources[name] ? '#00ff00' : '#0077cc');
    }
  }

const buttonPositions = {
  drum:        { x: -1.7, y: 1,  z: -10.5 },
  bass:        { x: -1.2, y: 1,  z: -10.5 },
  melody:      { x: -0.7,  y: 1,  z: -10.5 },
  drumloop2:   { x: -0.2,  y: 1,  z: -10.5 },
  drumloop:    { x: 0.3,  y: 1,  z: -10.5 },
  hihatclosed: { x: 0.8, y: 1,  z: -10.5 },
  traploop:    { x: 1.3, y: 1,  z: -10.5 },
  melody2:     { x: 1.8,  y: 1,  z: -10.5 },
  fastdrum2:   { x: -1.7,  y: 1.3,  z: -10.5 },
  fastdrum:    { x: -1.2,  y: 1.3,  z: -10.5 },
  drumloop3:   { x: -0.7, y: 1.3, z: -10.5 },
  drumloop4:   { x: -0.2, y: 1.3, z: -10.5 },
  drumloop5:   { x: 0.3,  y: 1.3, z: -10.5 },
  discoloop:   { x: 0.8,  y: 1.3, z: -10.5 },
  drumloop6:   { x: 1.3,  y: 1.3, z: -10.5 },
  electronicbeat: { x: 1.8, y: 1.3, z: -10.5 },
};

function create3DButtons() {
  const scene = document.querySelector('a-scene');

  soundNames.forEach(name => {
    const pos = buttonPositions[name] || { x: 0, y: 0, z: 2 }; 

    const btn = document.createElement('a-box');
    btn.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
    btn.setAttribute('width', '0.3');
    btn.setAttribute('height', '0.2');
    btn.setAttribute('depth', '0.2');
    btn.setAttribute('rotation', '0 180 0');
    btn.setAttribute('color', '#0077cc');
    btn.setAttribute('class', 'clickable');
    btn.setAttribute('soundname', name);

    const label = document.createElement('a-text');
    label.setAttribute('value', buttonLabels[name] || name);
    label.setAttribute('align', 'center');
    label.setAttribute('width', '1.5');
    label.setAttribute('position', '0 0 0.1');
    label.setAttribute('color', 'white');

    btn.appendChild(label);

    btn.addEventListener('click', async () => {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        decodedSounds = await decodeSounds();
      }
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      sendSound(name);
    });

    buttonEntities[name] = btn;
    scene.appendChild(btn);
  });
}

const buttonLabels = {
  drum: "DRUM 1",
  bass: "BASS 1",
  melody: "BEAT 1",
  drumloop2: "DRUM 9",
  drumloop: "DRUM 8",
  hihatclosed: "HI-HAT",
  traploop: "BEAT 2",
  melody2: "BEAT 3",
  fastdrum2: "DRUM 2",
  fastdrum: "DRUM 3",
  drumloop3: "DRUM 4",
  drumloop4: "DRUM 5",
  drumloop5: "DRUM 6",
  discoloop: "BEAT 4",
  drumloop6: "DRUM 7",
  electronicbeat: "BEAT 5"
};

function createVisualizerBars() {
  const container1 = document.querySelector('#visualizer');
  const container2 = document.querySelector('#visualizer2');
  const numBars = 32;

  visualizerBars = [];

  for (let i = 0; i < numBars; i++) {
    const offsetFromCenter = i - Math.floor(numBars / 2);
    const xPos = offsetFromCenter * 0.3;

    const bar1 = document.createElement('a-box');
    bar1.setAttribute('width', 0.25);
    bar1.setAttribute('depth', 0.1);
    bar1.setAttribute('height', 0.1);
    bar1.setAttribute('position', `${xPos} 0.1 0`);
    bar1.setAttribute('color', '#00ff88');
    container1.appendChild(bar1);

    const bar2 = document.createElement('a-box');
    bar2.setAttribute('width', 0.25);
    bar2.setAttribute('depth', 0.1);
    bar2.setAttribute('height', 0.1);
    bar2.setAttribute('position', `${xPos} 0.1 0`);
    bar2.setAttribute('color', '#8800ff');
    container2.appendChild(bar2);

    visualizerBars.push({ left: bar1, right: bar2 });
  }
}

function animateVisualizer() {
  if (!analyser) return;

  analyser.getByteFrequencyData(freqDataArray);

  for (let i = 0; i < visualizerBars.length; i++) {
    const val = freqDataArray[i];
    const height = (val / 255) * 2 + 0.1;

    const offsetFromCenter = i - Math.floor(visualizerBars.length / 2);
    const xPos = offsetFromCenter * 0.3;

    const leftBar = visualizerBars[i].left;
    const rightBar = visualizerBars[i].right;

    leftBar.setAttribute('height', height);
    leftBar.setAttribute('position', `${xPos} ${height / 2} 0`);
    leftBar.setAttribute('color', `rgb(${val}, ${255 - val}, 180)`);

    rightBar.setAttribute('height', height);
    rightBar.setAttribute('position', `${xPos} ${height / 2} 0`);
    rightBar.setAttribute('color', `rgb(${255 - val}, ${val}, 180)`);
  }

  animationId = requestAnimationFrame(animateVisualizer);
}

function createNeonSquareFrame() {
  const container = document.querySelector('#neon-frame');
  const size = 10;
  const thickness = 0.05;
  const colorStart = [255, 0, 255]; 
  const colorEnd = [0, 255, 255];   

  const segments = [
    { pos: [0, size / 2, 0], scale: [size, thickness, thickness] },
    { pos: [0, -size / 2, 0], scale: [size, thickness, thickness] }, 
    { pos: [-size / 2, 0, 0], scale: [thickness, size, thickness] }, 
    { pos: [size / 2, 0, 0], scale: [thickness, size, thickness] }  
  ];

  segments.forEach((seg, i) => {
    const bar = document.createElement('a-box');
    bar.setAttribute('position', seg.pos.join(' '));
    bar.setAttribute('scale', seg.scale.join(' '));
    const t = i / (segments.length - 1);
    const r = Math.round(colorStart[0] * (1 - t) + colorEnd[0] * t);
    const g = Math.round(colorStart[1] * (1 - t) + colorEnd[1] * t);
    const b = Math.round(colorStart[2] * (1 - t) + colorEnd[2] * t);

    bar.setAttribute('color', `rgb(${r}, ${g}, ${b})`);
    bar.setAttribute('emissive', `rgb(${r}, ${g}, ${b})`);
    bar.setAttribute('material', 'shader: standard; emissiveIntensity: 1.5; metalness: 0.3; roughness: 0.1');
    container.appendChild(bar);
  });
}

createNeonSquareFrame();

setInterval(() => {
  const bars = document.querySelectorAll('#neon-frame a-box');
  bars.forEach((bar, i) => {
    const t = (Date.now() / 500 + i) % 1;
    const r = Math.round(255 * Math.abs(Math.sin(t * Math.PI)));
    const b = 255 - r;
    bar.setAttribute('emissive', `rgb(${r}, 0, ${b})`);
  });
}, 100);

  loadSounds().then(() => {
    create3DButtons();
  });

  let myId = null;
  const avatars = {};

const niceColors = [
  '#e6194b', // rot
  '#3cb44b', // grün
  '#ffe119', // gelb
  '#4363d8', // blau
  '#f58231', // orange
  '#911eb4', // lila
  '#46f0f0', // türkis
  '#f032e6', // pink
  '#bcf60c', // limette
  '#fabebe', // hellrosa
  '#008080', // teel
  '#e6beff', // lavendel
  '#9a6324', // braun
  '#fffac8', // pastellgelb
  '#800000', // dunkelrot
  '#aaffc3', // mint
  '#808000', // oliv
  '#ffd8b1', // pfirsich
];

function getNiceColorFromId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % niceColors.length;
  return niceColors[index];
}

function createAvatar(id) {
  const scene = document.querySelector('a-scene');
  const avatar = document.createElement('a-sphere');
  avatar.setAttribute('radius', 0.25);

  const color = id === myId ? '#00ff00' : getNiceColorFromId(id);
  avatar.setAttribute('color', color);

  avatar.setAttribute('id', `avatar-${id}`);
  scene.appendChild(avatar);
  avatars[id] = avatar;
}

  function updateAvatar(id, position) {
    if (!avatars[id]) {
      createAvatar(id);
    }
    avatars[id].setAttribute('position', position);
  }

  function removeAvatar(id) {
    const avatar = avatars[id];
    if (avatar) {
      avatar.parentNode.removeChild(avatar);
      delete avatars[id];
    }
  }

  setInterval(() => {
    if (!myId) return;
    const camera = document.querySelector('[camera]');
    if (!camera) return;
    const position = camera.object3D.position;
    socket.send(JSON.stringify({
      type: 'avatar',
      position: {
        x: position.x,
        y: position.y,
        z: position.z
      }
    }));
  }, 100);

  socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'init') {
      myId = data.id;
      createAvatar(myId);
    }

    if (data.type === 'avatar' && data.id !== myId) {
      const pos = data.position;
      updateAvatar(data.id, `${pos.x} ${pos.y} ${pos.z}`);
    }

    if (data.type === 'remove') {
      removeAvatar(data.id);
    }
  });

});
