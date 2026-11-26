/* =========================================================
   initScene() — floating 3D objects in the hero (Three.js)
   Graduation cap, open book, scale of justice + minimal shapes
   ========================================================= */
(function () {
  const C = { crimson: 0xC5192D, coral: 0xFF3A21, slate: 0x1E293B, smoke: 0xF8FAFC, rose: 0xFEE2E2 };

  function mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .55, metalness: .05, flatShading: true }, opts));
  }

  function makeCap() {
    const g = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.2, .08, 2.2), mat(C.slate));
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.75, .85, .55, 24), mat(C.slate));
    base.position.y = -.3;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(.86, .86, .1, 24), mat(C.crimson));
    band.position.y = -.12;
    const button = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 12), mat(C.coral));
    button.position.y = .08;
    const cord = new THREE.Mesh(new THREE.BoxGeometry(1.05, .03, .03), mat(C.coral));
    cord.position.set(.53, .06, 0);
    const tassel = new THREE.Mesh(new THREE.CylinderGeometry(.06, .12, .55, 8), mat(C.coral));
    tassel.position.set(1.06, -.22, 0);
    g.add(board, base, band, button, cord, tassel);
    return g;
  }

  function makeBook() {
    const g = new THREE.Group();
    const coverMat = mat(C.crimson);
    const pageMat = mat(0xffffff, { roughness: .9 });
    [-1, 1].forEach(side => {
      const half = new THREE.Group();
      const cover = new THREE.Mesh(new THREE.BoxGeometry(1.2, .05, 1.6), coverMat);
      cover.position.x = .6 * side;
      const pages = new THREE.Mesh(new THREE.BoxGeometry(1.12, .12, 1.5), pageMat);
      pages.position.set(.58 * side, .08, 0);
      half.add(cover, pages);
      half.rotation.z = side * .28;
      g.add(half);
    });
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1.6, 8), coverMat);
    spine.rotation.x = Math.PI / 2;
    g.add(spine);
    return g;
  }

  function makeScale() {
    const g = new THREE.Group();
    const m = mat(C.coral);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.55, .65, .14, 24), m);
    base.position.y = -1.1;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, 2, 12), m);
    const top = new THREE.Mesh(new THREE.SphereGeometry(.14, 16, 16), m);
    top.position.y = 1.08;
    const beam = new THREE.Group();
    beam.position.y = .85;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.2, .07, .07), m);
    beam.add(bar);
    [-1, 1].forEach(side => {
      const pan = new THREE.Group();
      pan.position.x = 1.05 * side;
      const string = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .7, 4), mat(C.slate));
      string.position.y = -.35;
      const dish = new THREE.Mesh(new THREE.SphereGeometry(.38, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m);
      dish.material = mat(C.coral, { side: THREE.DoubleSide });
      dish.position.y = -.68;
      pan.add(string, dish);
      pan.userData.side = side;
      beam.add(pan);
    });
    g.add(base, pillar, top, beam);
    g.userData.beam = beam;
    return g;
  }

  function initScene() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas || typeof THREE === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (e) { return; } // no WebGL: the hero still works without 3D
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
    camera.position.set(0, 0, 14);

    scene.add(new THREE.HemisphereLight(0xffffff, C.rose, .9));
    const key = new THREE.DirectionalLight(0xffffff, .9);
    key.position.set(5, 8, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(C.coral, .35);
    rim.position.set(-6, -2, -4);
    scene.add(rim);

    const world = new THREE.Group();
    scene.add(world);

    const cap = makeCap();
    const book = makeBook();
    const scale = makeScale();
    const items = [
      { obj: cap, pos: [3.6, 2.3, 0], rot: [.35, .4, -.15], s: .95, speed: .7, amp: .25 },
      { obj: scale, pos: [4.6, -.6, -1], rot: [0, -.3, 0], s: .9, speed: .55, amp: .2 },
      { obj: book, pos: [2.2, -2.6, .8], rot: [.6, .5, 0], s: .85, speed: .8, amp: .22 },
      { obj: new THREE.Mesh(new THREE.IcosahedronGeometry(.45, 0), mat(C.crimson)), pos: [1.2, 1.2, -2], rot: [0, 0, 0], s: 1, speed: 1, amp: .3, spin: .4 },
      { obj: new THREE.Mesh(new THREE.TorusGeometry(.35, .12, 12, 32), mat(C.coral)), pos: [6.2, 2.4, -2.5], rot: [.6, 0, 0], s: 1, speed: .9, amp: .35, spin: .5 },
      { obj: new THREE.Mesh(new THREE.OctahedronGeometry(.35, 0), mat(C.slate)), pos: [6.4, -2.6, -1.5], rot: [0, 0, 0], s: 1, speed: 1.2, amp: .25, spin: .6 },
      { obj: new THREE.Mesh(new THREE.SphereGeometry(.22, 20, 20), mat(C.rose, { flatShading: false })), pos: [0.4, -1.1, 1], rot: [0, 0, 0], s: 1, speed: 1.4, amp: .3 },
      { obj: new THREE.Mesh(new THREE.SphereGeometry(.14, 16, 16), mat(C.crimson, { flatShading: false })), pos: [5.4, .9, 1.4], rot: [0, 0, 0], s: 1, speed: 1.6, amp: .2 },
    ];
    items.forEach((it, i) => {
      it.obj.position.set(...it.pos);
      it.obj.rotation.set(...it.rot);
      it.obj.scale.setScalar(0.001);
      it.base = new THREE.Vector3(...it.pos);
      it.phase = i * 1.3;
      it.delay = .15 + i * .08;
      world.add(it.obj);
    });

    let w = 0, h = 0, layoutX = 0;
    function resize() {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // Desktop: objects on the right. Mobile: centred behind the text, smaller.
      const mobile = w < 760;
      layoutX = mobile ? -2.3 : (w < 1100 ? -0.6 : 0);
      world.scale.setScalar(mobile ? .62 : 1);
      world.position.y = mobile ? 2.2 : 0;
      canvas.style.opacity = mobile ? .45 : 1;
    }
    resize();
    window.addEventListener('resize', resize);

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener('pointermove', e => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    let visible = true;
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);

    const clock = new THREE.Clock();
    const easeOutBack = t => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

    function frame() {
      requestAnimationFrame(frame);
      if (!visible) return;
      const t = clock.getElapsedTime();
      mouse.x += (mouse.tx - mouse.x) * .05;
      mouse.y += (mouse.ty - mouse.y) * .05;
      const scrollY = Math.min(window.scrollY / window.innerHeight, 1.2);

      world.position.x = layoutX + mouse.x * .35;
      world.rotation.y = mouse.x * .12;
      world.rotation.x = mouse.y * .08 + scrollY * .25;

      items.forEach(it => {
        const p = Math.min(Math.max((t - it.delay) / .9, 0), 1);
        it.obj.scale.setScalar(Math.max(.001, easeOutBack(p) * it.s));
        if (reduced) return;
        it.obj.position.y = it.base.y + Math.sin(t * it.speed + it.phase) * it.amp - scrollY * 1.5;
        it.obj.rotation.y += .002 + (it.spin || 0) * .004;
        if (it.spin) it.obj.rotation.x += it.spin * .003;
      });
      const beam = scale.userData.beam;
      beam.rotation.z = reduced ? 0 : Math.sin(t * .8) * .12;
      beam.children.forEach(c => { if (c.userData.side) c.rotation.z = -beam.rotation.z; });

      renderer.render(scene, camera);
    }
    frame();
  }

  window.initScene = initScene;
})();
