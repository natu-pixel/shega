
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const output = path.join(root, "public", "models", "arena-fans");
const sourcePath = path.join(root, "public", "models", "festival-people-hero.glb");
const attributionPath = path.join(root, "public", "models", "festival-people-hero.attribution.json");
const columns = 8, rows = 6, tileWidth = 192, tileHeight = 256;
const width = columns * tileWidth, height = rows * tileHeight;
const supersampling = 3;
const minimumMargin = 6;
const poses = [
  "manuel-hands-up", "manuel-groove", "red-hands-up",
  "red-groove", "kandace-hands-up", "kandace-groove",
];

function dependency(name) {
  try {
    return require(name);
  } catch (localError) {
    if (process.env.SHEGA_BROWSER_TOOLS) {
      try {
        return createRequire(path.join(path.resolve(process.env.SHEGA_BROWSER_TOOLS), "..", "package.json"))(name);
      } catch {
        // Explain the existing-tool requirement instead of installing packages.
      }
    }
    throw new Error(`Missing existing ${name}. Set SHEGA_BROWSER_TOOLS to an existing node_modules directory containing it. No dependencies are installed by this script.`, { cause: localError });
  }
}

async function browserSetup(config) {
  const THREE = await import("three");
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const gltf = await new GLTFLoader().loadAsync("/source.glb");
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(config.tileWidth * config.supersampling, config.tileHeight * config.supersampling);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  document.body.appendChild(renderer.domElement);
  // A broad, neutral camera-relative rig keeps all eight views equally useful.
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  scene.add(new THREE.HemisphereLight(0xffffff, 0xaaa8a6, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  const fill = new THREE.DirectionalLight(0xffffff, 1.2);
  scene.add(key, key.target, fill, fill.target);
  key.target.position.set(0, 0.75, 0);
  fill.target.position.set(0, 0.75, 0);
  const variants = [];
  const meshes = [];
  const bounds = { minY: Infinity, maxY: -Infinity, maxAbsX: 0 };
  const point = new THREE.Vector3();
  for (const name of config.poses) {
    const variant = gltf.scene.getObjectByName(name);
    if (!variant) throw new Error(`Missing source pose ${name}`);
    scene.add(variant);
    variant.updateMatrixWorld(true);
    variant.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const position = mesh.geometry.getAttribute("position");
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
        bounds.minY = Math.min(bounds.minY, point.y);
        bounds.maxY = Math.max(bounds.maxY, point.y);
        for (let view = 0; view < config.columns; view++) {
          const angle = view * Math.PI * 2 / config.columns;
          bounds.maxAbsX = Math.max(bounds.maxAbsX, Math.abs(point.x * Math.cos(angle) - point.z * Math.sin(angle)));
        }
      }
      const geometry = mesh.geometry.clone();
      const wardrobeMask = new Float32Array(position.count);
      for (let i = 0; i < position.count; i++) {
        const y = position.getY(i), x = Math.abs(position.getX(i));
        wardrobeMask[i] = THREE.MathUtils.smoothstep(y, 0.49, 0.57)
          * (1 - THREE.MathUtils.smoothstep(y, 0.77, 0.83))
          * (1 - THREE.MathUtils.smoothstep(x, 0.15, 0.22));
      }
      geometry.setAttribute("wardrobeMask", new THREE.BufferAttribute(wardrobeMask, 1));
      mesh.geometry = geometry;
      const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const colorMaterials = [], maskMaterials = [];
      for (const source of sourceMaterials) {
        const hair = source.name === "Hairmat" || source.name === "braid01";
        const material = source.isMeshBasicMaterial
          ? new THREE.MeshStandardMaterial({
            name: source.name, map: source.map, color: source.color,
            roughness: 0.85, metalness: 0, alphaMap: source.alphaMap,
            opacity: source.opacity, transparent: !hair && source.transparent,
            alphaTest: hair ? 0.4 : source.alphaTest,
            side: hair ? THREE.DoubleSide : source.side,
          })
          : source.clone();
        if (hair) {
          material.alphaTest = 0.4;
          material.transparent = false;
          material.side = THREE.DoubleSide;
        }
        if (source.name === "Hairmat") material.color.set("#302822");
        material.depthWrite = true;
        colorMaterials.push(material);
        const body = source.name === "rp_manuel_animated_001_mat";
        const clothes = body || source.name === "f_dress_01" || source.name === "Topmat";
        const mask = new THREE.MeshBasicMaterial({
          name: `${source.name}-clothing-mask`, map: material.map,
          color: material.color, alphaMap: material.alphaMap,
          opacity: material.opacity, transparent: material.transparent,
          alphaTest: material.alphaTest, side: material.side, toneMapped: false,
        });
        mask.onBeforeCompile = (shader) => {
          shader.vertexShader = "attribute float wardrobeMask;\nvarying float vWardrobeMask;\n" + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvWardrobeMask = wardrobeMask;");
          shader.fragmentShader = "varying float vWardrobeMask;\n" + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace("#include <alphatest_fragment>", `
            #include <alphatest_fragment>
            float warmSkin = step(diffuseColor.g * 1.18, diffuseColor.r) * step(diffuseColor.b * 1.12, diffuseColor.g);
            float fabric = ${body ? "vWardrobeMask * (1.0 - warmSkin)" : clothes ? "1.0" : "0.0"};
            float protectedSurface = ${body ? "max(warmSkin, 1.0 - step(0.00001, vWardrobeMask))" : clothes ? "0.0" : "1.0"};
            // Green is a validation-only skin/hair channel, never exported.
            diffuseColor.rgb = vec3(fabric, protectedSurface, 0.0);
          `);
        };
        mask.customProgramCacheKey = () => `arena-clothing-mask-${body ? "body" : clothes ? "clothes" : "protected"}`;
        maskMaterials.push(mask);
      }
      meshes.push({ mesh, color: colorMaterials, mask: maskMaterials, array: Array.isArray(mesh.material) });
    });
    variant.visible = false;
    variants.push(variant);
  }
  // Keep y=.75 and a single shared scale. Ten source pixels leave >=6 after
  // supersampling/filter support; expand all sides, never rescale each pose.
  const margin = 10;
  const aspect = config.tileWidth / config.tileHeight;
  const frameHeight = Math.ceil(Math.max(
    1.5,
    (0.75 - bounds.minY) / (0.5 - margin / config.tileHeight),
    (bounds.maxY - 0.75) / (0.5 - margin / config.tileHeight),
    bounds.maxAbsX / (aspect * (0.5 - margin / config.tileWidth)),
  ) * 100) / 100;
  const frameWidth = frameHeight * aspect;
  const camera = new THREE.OrthographicCamera(-frameWidth / 2, frameWidth / 2, frameHeight / 2, -frameHeight / 2, 0.01, 20);
  const frameBottom = 0.75 - frameHeight / 2, frameTop = 0.75 + frameHeight / 2;
  window.arenaBake = {
    render(pose, view, maskPass) {
      variants.forEach((variant, index) => { variant.visible = index === pose; });
      for (const item of meshes) {
        const materials = maskPass ? item.mask : item.color;
        item.mesh.material = item.array ? materials : materials[0];
      }
      const angle = view * Math.PI * 2 / config.columns;
      camera.position.set(Math.sin(angle) * 4, 0.75, Math.cos(angle) * 4);
      camera.lookAt(0, 0.75, 0);
      key.position.set(Math.sin(angle - 0.65) * 3, 3.2, Math.cos(angle - 0.65) * 3);
      fill.position.set(Math.sin(angle + 1.2) * 3, 1.3, Math.cos(angle + 1.2) * 3);
      renderer.outputColorSpace = maskPass ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace;
      renderer.toneMapping = maskPass ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL("image/png");
    },
    dispose() {
      const textures = new Set();
      for (const item of meshes) {
        item.mesh.geometry.dispose();
        for (const material of [...item.color, ...item.mask]) {
          for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
          material.dispose();
        }
      }
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
  return {
    frameWidth, frameHeight, frameBottom, frameTop, cameraY: 0.75, sourceBounds: bounds,
    groundAnchor: { x: 0.5, y: frameTop / frameHeight, origin: "top-left" },
    threeRevision: THREE.REVISION,
  };
}

function alphaStats(data, w, h, threshold = 0) {
  let minX = w, minY = h, maxX = -1, maxY = -1, pixels = 0, opaquePixels = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha >= 250) opaquePixels++;
      if (alpha <= threshold) continue;
      pixels++;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  return {
    minX, minY, maxX, maxY, pixels, opaquePixels,
    marginPixels: Math.min(minX, minY, w - 1 - maxX, h - 1 - maxY),
  };
}

function mipBytes(w, h, channels = 4) {
  let total = 0;
  for (;;) {
    total += w * h * channels;
    if (w === 1 && h === 1) return total;
    w = Math.max(1, Math.floor(w / 2)); h = Math.max(1, Math.floor(h / 2));
  }
}

function paste(atlas, tile, atlasWidth, x, y, w, h, channels) {
  for (let row = 0; row < h; row++) {
    const start = ((y + row) * atlasWidth + x) * channels;
    atlas.set(tile.subarray(row * w * channels, (row + 1) * w * channels), start);
  }
}

function pngBytes(url) {
  if (!url.startsWith("data:image/png;base64,")) throw new Error("Browser did not return a PNG.");
  return Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
}

async function main() {
  const puppeteer = dependency("puppeteer-core");
  const sharp = dependency("sharp");
  sharp.cache(false);
  sharp.concurrency(1);
  const chrome = process.env.SHEGA_CHROME
    || path.join(process.env.PROGRAMFILES || "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe");
  try { await fs.access(chrome); } catch {
    throw new Error(`Chrome not found at ${chrome}. Set SHEGA_CHROME to an existing Chrome executable.`);
  }
  const previewArg = process.argv.find((arg) => arg.startsWith("--preview="));
  const preview = previewArg ? path.resolve(root, previewArg.slice("--preview=".length)) : null;
  if (preview && (path.relative(root, preview).startsWith("..") || path.isAbsolute(path.relative(root, preview)))) {
    throw new Error("--preview must be a directory inside the project.");
  }
  const source = await fs.readFile(sourcePath);
  const credits = JSON.parse(await fs.readFile(attributionPath, "utf8"));
  const sourceSHA256 = crypto.createHash("sha256").update(source).digest("hex");
  const threeRoot = path.resolve(path.dirname(require.resolve("three")), "..");
  const html = `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>`;
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, "http://127.0.0.1").pathname;
      if (pathname === "/") {
        response.writeHead(200, { "Content-Type": "text/html" }); response.end(html); return;
      }
      if (pathname === "/source.glb") {
        response.writeHead(200, { "Content-Type": "model/gltf-binary" }); response.end(source); return;
      }
      if (pathname.startsWith("/three/")) {
        const file = path.resolve(threeRoot, ...pathname.slice(7).split("/"));
        const relative = path.relative(threeRoot, file);
        if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Invalid module path");
        response.writeHead(200, { "Content-Type": "text/javascript" });
        response.end(await fs.readFile(file)); return;
      }
      response.writeHead(404); response.end();
    } catch (error) {
      response.writeHead(500); response.end(String(error));
    }
  });
  let browser;
  const browserProfile = path.join(root, `.arena-fan-bake-browser-${process.pid}`);
  const errors = [];
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject); server.listen(0, "127.0.0.1", resolve);
    });
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await puppeteer.launch({
      executablePath: chrome, headless: true, protocolTimeout: 180000,
      userDataDir: browserProfile,
      args: ["--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--disable-component-update", "--disable-sync", "--disable-extensions", "--enable-unsafe-swiftshader"],
    });
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const url = request.url();
      if (url.startsWith(`${origin}/`) || url.startsWith("data:") || url.startsWith("blob:")) request.continue();
      else { errors.push(`Blocked nonlocal request: ${url}`); request.abort(); }
    });
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(origin, { waitUntil: "load" });
    const projection = await page.evaluate(browserSetup, { poses, columns, tileWidth, tileHeight, supersampling });
    console.log("Projection:", JSON.stringify(projection));
    const rgba = Buffer.alloc(width * height * 4);
    const maskWidth = width / 2, maskHeight = height / 2;
    const maskAtlas = Buffer.alloc(maskWidth * maskHeight);
    const frames = [];
    let totalProtectedPixels = 0;
    for (let pose = 0; pose < rows; pose++) {
      for (let view = 0; view < columns; view++) {
        const colorPNG = pngBytes(await page.evaluate((p, v) => window.arenaBake.render(p, v, false), pose, view));
        const color = await sharp(colorPNG).resize(tileWidth, tileHeight, { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer();
        const bounds = alphaStats(color, tileWidth, tileHeight);
        if (bounds.opaquePixels < 200 || bounds.marginPixels < minimumMargin) {
          throw new Error(`Empty or clipped frame ${poses[pose]}/${view}: ${JSON.stringify(bounds)}`);
        }
        const maskPNG = pngBytes(await page.evaluate((p, v) => window.arenaBake.render(p, v, true), pose, view));
        const diagnostic = await sharp(maskPNG).ensureAlpha().raw().toBuffer();
        let protectedPixels = 0, violations = 0;
        for (let i = 0; i < diagnostic.length; i += 4) {
          if (diagnostic[i + 1] >= 254 && diagnostic[i + 3] >= 254) {
            protectedPixels++;
            if (diagnostic[i] > 1) violations++;
          }
        }
        if (violations || protectedPixels < 200) throw new Error(`Skin/hair mask protection failed for ${poses[pose]}/${view}: ${violations} violations, ${protectedPixels} protected pixels.`);
        totalProtectedPixels += protectedPixels;
        const mask = await sharp(maskPNG).flatten({ background: "#000000" })
          .resize(tileWidth / 2, tileHeight / 2, { kernel: "cubic" }).extractChannel(0).raw().toBuffer();
        const maskedPixels = mask.reduce((total, value) => total + (value > 127 ? 1 : 0), 0);
        if (maskedPixels < 20) throw new Error(`Empty clothing mask for ${poses[pose]}/${view}.`);
        paste(rgba, color, width, view * tileWidth, pose * tileHeight, tileWidth, tileHeight, 4);
        paste(maskAtlas, mask, maskWidth, view * tileWidth / 2, pose * tileHeight / 2, tileWidth / 2, tileHeight / 2, 1);
        frames.push({
          pose, name: poses[pose], view, yaw: view * Math.PI * 2 / columns,
          rect: { x: view * tileWidth, y: pose * tileHeight, width: tileWidth, height: tileHeight },
          alphaBounds: bounds, maskedPixels, protectedPixels, skinMaskViolations: violations,
        });
      }
      console.log(`Baked ${poses[pose]}: eight color + protected-clothing views.`);
    }
    await page.evaluate(() => window.arenaBake.dispose());
    await browser.close(); browser = null;
    if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
    await fs.mkdir(output, { recursive: true });
    const colorBytes = await sharp(rgba, { raw: { width, height, channels: 4 } })
      .webp({ quality: 96, alphaQuality: 100, effort: 6, smartSubsample: true }).toBuffer();
    const maskBytes = await sharp(maskAtlas, { raw: { width: maskWidth, height: maskHeight, channels: 1 } })
      .webp({ lossless: true, effort: 6 }).toBuffer();
    const decoded = await sharp(colorBytes).ensureAlpha().raw().toBuffer();
    const decodedMask = await sharp(maskBytes).raw().toBuffer({ resolveWithObject: true });
    const colorInfo = await sharp(colorBytes).metadata();
    if (!colorInfo.hasAlpha || colorInfo.width !== width || colorInfo.height !== height) throw new Error("Color WebP lost alpha or dimensions.");
    for (const frame of frames) {
      const { x, y } = frame.rect;
      const pixels = Buffer.alloc(tileWidth * tileHeight * 4);
      for (let row = 0; row < tileHeight; row++) {
        const offset = ((y + row) * width + x) * 4;
        decoded.copy(pixels, row * tileWidth * 4, offset, offset + tileWidth * 4);
      }
      const bounds = alphaStats(pixels, tileWidth, tileHeight);
      if (bounds.marginPixels < minimumMargin || bounds.opaquePixels !== frame.alphaBounds.opaquePixels) throw new Error(`Encoded alpha changed for ${frame.name}/${frame.view}.`);
      frame.encodedAlphaBounds = bounds;
    }
    for (let i = 0; i < maskAtlas.length; i++) {
      const offset = i * decodedMask.info.channels;
      for (let c = 0; c < Math.min(3, decodedMask.info.channels); c++) {
        if (decodedMask.data[offset + c] !== maskAtlas[i]) throw new Error("Clothing WebP changed the linear grayscale mask.");
      }
    }
    const textureMetadata = (url, bytes, w, h, colorSpace) => ({
      url, width: w, height: h, bytes: bytes.length,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      colorSpace, decodedRGBABytes: w * h * 4, decodedRGBAWithMipsBytes: mipBytes(w, h),
    });
    const metadata = {
      version: 1, columns, rows, tileWidth, tileHeight, width, height,
      render: {
        columns, rows, frameWidth: projection.frameWidth, frameHeight: projection.frameHeight,
        groundOffset: -projection.frameBottom,
      },
      viewAngleStep: Math.PI * 2 / columns, viewAngleStepDegrees: 360 / columns,
      viewConvention: "view i: camera=(sin(i*2pi/8)*4,0.75,cos(i*2pi/8)*4), target=(0,0.75,0); front view=0 (+Z)",
      rowConvention: "Top-to-bottom FESTIVAL_DANCE_VARIANTS; columns left-to-right views 0..7.",
      normalizedStandingHeight: 1, ...projection, minimumMarginPixels: minimumMargin,
      frameAdjustment: "Shared 1.5-high by 1.125-wide frame expanded around y=.75 to preserve grounded feet plus transparent gutters. No per-pose rescaling or camera tilt.",
      textures: {
        color: textureMetadata("/models/arena-fans/color.webp", colorBytes, width, height, "srgb"),
        clothing: textureMetadata("/models/arena-fans/clothing.webp", maskBytes, maskWidth, maskHeight, "linear / THREE.NoColorSpace"),
      },
      rendering: {
        transparent: true, alpha: "straight; WebP alpha quality 100; hair alphaTest=.4 and DoubleSide",
        supersampling, lighting: "Neutral ambient + hemisphere + camera-relative soft directional key/fill; no floor, shadows, or other humans.",
        toneMapping: "ACESFilmicToneMapping, exposure=1; diffuse baked display-referred sRGB, use THREE.SRGBColorSpace.",
        mask: "Linear grayscale; white=cloth, black=skin/hair/background. Read red channel with THREE.NoColorSpace.",
        tint: "Multiply or luminance-preserving recolor only where clothing.r > 0; never multiply the complete cutout by wardrobe color.",
        filtering: "Linear min/mag filtering; clamp-to-edge; transparent inner gutters. If mipmapping an atlas, prevent sampling across tiles at very small footprints.",
        groundAnchor: "Normalized top-left image coordinates. Plane center height=(frameBottom+frameTop)/2 times standing height; do not ground the padded tile bottom.",
      },
      wardrobeProtection: {
        manuel: "rp_manuel_animated_001_mat: smoothstep(y,.49,.57)*(1-smoothstep(y,.77,.83))*(1-smoothstep(abs(x),.15,.22)); exclude r>=g*1.18 && g>=b*1.12 in linear source texture color.",
        red: "f_dress_01 only", kandace: "Topmat only", hairTint: "#302822",
        totalProtectedPixels, violations: 0,
      },
      source: { url: "/models/festival-people-hero.glb", sha256: sourceSHA256, bytes: source.length },
      license: credits.license, licenseURL: credits.licenseURL,
      attribution: "/models/arena-fans/attribution.json",
      frames,
    };
    const attribution = {
      assets: ["/models/arena-fans/color.webp", "/models/arena-fans/clothing.webp"],
      license: credits.license, licenseURL: credits.licenseURL, sources: credits.sources,
      preparedSource: { url: metadata.source.url, sha256: sourceSHA256, attribution: "/models/festival-people-hero.attribution.json" },
      sourceModifications: credits.modifications,
      modifications: "Eight orthographic yaw renders of six existing static hero poses; neutral studio lighting, sRGB color, original textured faces, cutout alpha hair with natural #302822 Hairmat, supersampling, transparent padded framing, fabric-only wardrobe masks, WebP compression. No new models or invented texture detail.",
      reproduction: "node scripts\\prepare-arena-fans.mjs; requires existing three, sharp, puppeteer-core and Chrome. Optional SHEGA_BROWSER_TOOLS points to existing node_modules; SHEGA_CHROME selects Chrome.",
    };
    await fs.writeFile(path.join(output, "color.webp"), colorBytes);
    await fs.writeFile(path.join(output, "clothing.webp"), maskBytes);
    await fs.writeFile(path.join(output, "atlas.json"), `${JSON.stringify(metadata, null, 2)}\n`);
    await fs.writeFile(path.join(output, "attribution.json"), `${JSON.stringify(attribution, null, 2)}\n`);
    if (preview) {
      await fs.mkdir(preview, { recursive: true });
      await sharp(colorBytes).flatten({ background: "#32343a" }).png().toFile(path.join(preview, "arena-fans-contact-dark.png"));
      await sharp(colorBytes).flatten({ background: "#e7e5df" }).png().toFile(path.join(preview, "arena-fans-contact-light.png"));
      await sharp(maskBytes).resize(width, height, { kernel: "nearest" }).png().toFile(path.join(preview, "arena-fans-clothing-mask.png"));
    }
    console.log(JSON.stringify({
      frames: frames.length, minimumMargin: Math.min(...frames.map((frame) => frame.alphaBounds.marginPixels)),
      color: metadata.textures.color, clothing: metadata.textures.clothing,
      frameWidth: projection.frameWidth, frameHeight: projection.frameHeight,
      groundAnchor: projection.groundAnchor, protectedPixels: totalProtectedPixels, violations: 0,
      preview,
    }, null, 2));
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(browserProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
