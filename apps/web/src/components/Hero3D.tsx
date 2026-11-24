// 3D hero visual: a glowing crystal core inside orbiting rings and a drifting particle field, with mouse parallax.
// It uses WebGL when available and falls back to a static glow when WebGL is missing, the page is narrow, or the user
// prefers reduced motion. The scene is disposed when the component unmounts.
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Box } from '@chakra-ui/react';

function canUseWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function Hero3D() {
  const mount = useRef<HTMLDivElement | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !canUseWebGL()) {
      setFallback(true);
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFallback(true);
      return;
    }
    const width = el.clientWidth || 480;
    const height = el.clientHeight || 480;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 6.2;

    // Lights: cyan and magenta rim light give the glossy, glowing look.
    scene.add(new THREE.AmbientLight(0x6b5cff, 0.5));
    const cyan = new THREE.PointLight(0x22d3ee, 22, 20);
    cyan.position.set(3, 2, 4);
    const pink = new THREE.PointLight(0xec4899, 16, 20);
    pink.position.set(-3, -2, 3);
    scene.add(cyan, pink);

    // Core: a glossy crystal (faceted icosahedron) with a wireframe shell on top.
    const coreGeo = new THREE.IcosahedronGeometry(1.45, 1);
    const core = new THREE.Mesh(
      coreGeo,
      new THREE.MeshPhysicalMaterial({ color: 0x1b1f5c, metalness: 0.2, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1, transparent: true, opacity: 0.92 }),
    );
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.62, 2),
      new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe: true, transparent: true, opacity: 0.35 }),
    );
    const group = new THREE.Group();
    group.add(core, shell);
    scene.add(group);

    // Rings: three tilted torus rings in the brand gradient colours.
    const rings: THREE.Mesh[] = [];
    const ringColors = [0x22d3ee, 0x8b5cf6, 0xec4899];
    ringColors.forEach((color, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.2 + i * 0.45, 0.012 + i * 0.002, 16, 160),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 - i * 0.15 }),
      );
      ring.rotation.set(Math.PI / 2.4 + i * 0.35, i * 0.6, i * 0.25);
      rings.push(ring);
      scene.add(ring);
    });

    // Particles: a slow drifting field around the crystal.
    const count = 260;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2.6 + Math.random() * 2.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: 0xbfe9ff, size: 0.03, transparent: true, opacity: 0.85 }));
    scene.add(particles);

    // Pointer parallax.
    const target = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      target.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      target.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    let frame = 0;
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(el);

    const clock = new THREE.Clock();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      if (!visible) return;
      const t = clock.getElapsedTime();
      group.rotation.y = t * 0.25 + target.x * 0.35;
      group.rotation.x = Math.sin(t * 0.4) * 0.12 + target.y * 0.2;
      core.scale.setScalar(1 + Math.sin(t * 1.6) * 0.03);
      rings.forEach((ring, i) => {
        ring.rotation.z += 0.002 * (i + 1);
      });
      particles.rotation.y = t * 0.04;
      cyan.position.x = Math.cos(t * 0.8) * 3.5;
      cyan.position.y = Math.sin(t * 0.8) * 2.5;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = el.clientWidth || width;
      const h = el.clientHeight || height;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', onResize);
      observer.disconnect();
      coreGeo.dispose();
      core.geometry.dispose();
      (core.material as THREE.Material).dispose();
      shell.geometry.dispose();
      (shell.material as THREE.Material).dispose();
      rings.forEach((r) => {
        r.geometry.dispose();
        (r.material as THREE.Material).dispose();
      });
      particleGeo.dispose();
      (particles.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <Box position="relative" w="full" h={{ base: '340px', md: '460px' }} aria-hidden>
      {fallback ? (
        <Box position="absolute" inset={0} display="grid" placeItems="center">
          <Box w="62%" h="62%" borderRadius="full" bgImage="radial-gradient(circle at 35% 30%, #22D3EE 0%, #8B5CF6 45%, #EC4899 85%)" boxShadow="0 0 80px 10px rgba(139,92,246,0.55)" opacity={0.85} />
        </Box>
      ) : null}
      <Box ref={mount} position="absolute" inset={0} />
    </Box>
  );
}
