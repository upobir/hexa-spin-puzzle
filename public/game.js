(function () {
  'use strict';

  const N = 4;
  const ROWS = N;
  const COLS = 2 * N - 1;
  const TOTAL_CELLS = ROWS * COLS;

  const CANVAS_SIZE = 600;
  const PADDING = 40;
  const SQRT3 = Math.sqrt(3);
  const AVAIL = CANVAS_SIZE - 2 * PADDING;
  const H = Math.min(AVAIL / N, (AVAIL * SQRT3) / (2 * N - 1));
  const S = 2 * H / SQRT3;

  let board = [];
  let rotationPoints = []; // { row, col, x, y } - corners where 6 triangles meet
  let activeRotation = null; // { row, col, startTime, duration }

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let hoverPoint = null;

  function rowColToIndex(row, col) {
    if (row < 1 || row > ROWS || col < 1 || col > COLS) return -1;
    return (row - 1) * COLS + (col - 1);
  }

  function isUpright(row, col) {
    // r odd: odd c = upright, even c = down. r even: odd c = down, even c = upright
    // upright = point at top; inverted from (r+c) parity
    return (row % 2 === 1 && col % 2 === 0) || (row % 2 === 0 && col % 2 === 1);
  }

  function getTriangleCorners(row, col) {
    const up = isUpright(row, col);
    const halfS = S / 2;
    const thirdH = H / 3;
    const twoThirdH = (2 * H) / 3;

    const baseY = (row - 1) * H;
    const x = (col - 0.5) * halfS;

    if (up) {
      return [
        { x, y: baseY + H },
        { x: x - halfS, y: baseY },
        { x: x + halfS, y: baseY }
      ];
    } else {
      return [
        { x, y: baseY },
        { x: x + halfS, y: baseY + H },
        { x: x - halfS, y: baseY + H }
      ];
    }
  }

  function getTriangleCenter(row, col) {
    const up = isUpright(row, col);
    const baseY = (row - 1) * H;
    const x = (col - 0.5) * (S / 2);
    const y = up ? baseY + H / 3 : baseY + (2 * H) / 3;
    return { x, y };
  }

  function getRotationPoints() {
    const points = [];
    for (let row = 1; row < ROWS; row++) {
      const isOddRow = row % 2 === 1;
      if (isOddRow) {
        for (let col = 2; col <= COLS; col += 2) {
          points.push({ row, col });
        }
      } else {
        for (let col = 3; col < COLS; col += 2) {
          points.push({ row, col });
        }
      }
    }
    return points;
  }

  function getSixCells(row, col) {
    const order = [
      [row, col - 1], [row, col], [row, col + 1],
      [row + 1, col + 1], [row + 1, col], [row + 1, col - 1]
    ];
    return order.map(([r, c]) => rowColToIndex(r, c)).filter(i => i >= 0);
  }

  const ROTATION_DURATION = 350;

  function rotateAt(row, col) {
    const indices = getSixCells(row, col);
    if (indices.length !== 6) return;
    if (activeRotation) return; // ignore while animating

    activeRotation = { row, col, startTime: performance.now(), duration: ROTATION_DURATION };
    hoverPoint = null;
    requestAnimationFrame(animationTick);
  }

  function applyRotation(row, col) {
    const indices = getSixCells(row, col);
    if (indices.length !== 6) return;

    const cells = indices.map(i => ({ ...board[i] }));
    for (let i = 0; i < 6; i++) {
      const prev = (i + 5) % 6;
      const { id, orientation } = cells[prev];
      board[indices[i]] = { id, orientation: (orientation + 1) % 6 };
    }
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function animationTick() {
    if (!activeRotation) return;
    const elapsed = performance.now() - activeRotation.startTime;
    const raw = Math.min(1, elapsed / activeRotation.duration);
    activeRotation.progress = easeInOutCubic(raw);
    draw();

    if (raw < 1) {
      requestAnimationFrame(animationTick);
    } else {
      applyRotation(activeRotation.row, activeRotation.col);
      activeRotation = null;
      draw();
    }
  }

  function buildRotationPoints() {
    const pts = getRotationPoints();
    rotationPoints = pts.map(({ row, col }) => {
      const center = getRotationPointCenter(row, col);
      return { row, col, x: center.x + PADDING, y: center.y + PADDING };
    });
  }

  function getRotationPointCenter(row, col) {
    const baseY = (row - 1) * H;
    const x = (col - 0.5) * (S / 2);
    const y = baseY + H;
    return { x, y };
  }

  function buildBoard() {
    board = [];
    for (let i = 0; i < TOTAL_CELLS; i++) {
      board.push({ id: i + 1, orientation: 0 });
    }
    buildRotationPoints();
  }

  function rotatePoint(px, py, cx, cy, angleRad) {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const dx = px - cx;
    const dy = py - cy;
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos
    };
  }

  function draw() {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.save();
    ctx.translate(PADDING, PADDING);

    const rotCenter = activeRotation
      ? getRotationPointCenter(activeRotation.row, activeRotation.col)
      : null;
    const animAngle = activeRotation ? activeRotation.progress * (Math.PI / 3) : 0;
    const sixIndices = activeRotation ? new Set(getSixCells(activeRotation.row, activeRotation.col)) : new Set();

    for (let row = 1; row <= ROWS; row++) {
      for (let col = 1; col <= COLS; col++) {
        const idx = rowColToIndex(row, col);
        const cell = board[idx];
        let corners = getTriangleCorners(row, col);

        if (sixIndices.has(idx) && rotCenter) {
          corners = corners.map(p => rotatePoint(p.x, p.y, rotCenter.x, rotCenter.y, animAngle));
        }

        ctx.fillStyle = '#e8e8e8';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        ctx.lineTo(corners[1].x, corners[1].y);
        ctx.lineTo(corners[2].x, corners[2].y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        let center = getTriangleCenter(row, col);
        if (sixIndices.has(idx) && rotCenter) {
          center = rotatePoint(center.x, center.y, rotCenter.x, rotCenter.y, animAngle);
        }
        // base orientation + interpolated rotation during animation (label rotates with triangle)
        const angle = board[idx].orientation * Math.PI / 3 + (sixIndices.has(idx) && rotCenter ? animAngle : 0);

        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate(angle);

        ctx.fillStyle = '#333';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const label = String(cell.id);
        ctx.fillText(label, 0, 0);

        // underline under the label (rotated together)
        const metrics = ctx.measureText(label);
        const underlineWidth = Math.min(S * 0.5, metrics.width + 6);
        const underlineY = 10;
        ctx.beginPath();
        ctx.moveTo(-underlineWidth / 2, underlineY);
        ctx.lineTo(underlineWidth / 2, underlineY);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#333';
        ctx.stroke();

        ctx.restore();
      }
    }

    for (const pt of rotationPoints) {
      if (pt === hoverPoint) {
        const px = pt.x - PADDING;
        const py = pt.y - PADDING;
        ctx.fillStyle = 'rgba(100, 150, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(px, py, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4a90d9';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function hitTestRotationPoint(sx, sy) {
    const RADIUS = 18;
    let best = null;
    let bestDist = Infinity;
    for (const pt of rotationPoints) {
      const d = Math.hypot(sx - pt.x, sy - pt.y);
      if (d < RADIUS && d < bestDist) {
        bestDist = d;
        best = pt;
      }
    }
    return best;
  }

  function handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const sx = (e.clientX - rect.left) * scaleX;
    const sy = (e.clientY - rect.top) * scaleY;

    const pt = hitTestRotationPoint(sx, sy);
    if (pt) {
      rotateAt(pt.row, pt.col);
      draw();
    }
  }

  function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const sx = (e.clientX - rect.left) * scaleX;
    const sy = (e.clientY - rect.top) * scaleY;

    const pt = hitTestRotationPoint(sx, sy);
    if (pt !== hoverPoint) {
      hoverPoint = pt;
      draw();
    }
  }

  function handleMouseLeave() {
    if (hoverPoint) {
      hoverPoint = null;
      draw();
    }
  }

  function init() {
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    buildBoard();
    draw();
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
  }

  init();
})();
