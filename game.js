(function () {
  'use strict';

  const CANVAS_SIZE = 600;
  const PADDING = 40;
  const SQRT3 = Math.sqrt(3);

  let N = 4;
  let ROWS, COLS, TOTAL_CELLS, H, S;

  function updateGeometry() {
    ROWS = N;
    COLS = 2 * N - 1;
    TOTAL_CELLS = ROWS * COLS;
    const AVAIL = CANVAS_SIZE - 2 * PADDING;
    H = Math.min(AVAIL / N, (AVAIL * SQRT3) / (2 * N - 1));
    S = 2 * H / SQRT3;
  }

  const MAX_HISTORY = 50;

  let board = [];
  let rotationPoints = []; // { row, col, x, y } - corners where 6 triangles meet
  let activeRotation = null; // { row, col, startTime, duration }
  let history = [];
  let historyIndex = -1;

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
      pushHistory();
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

  function copyBoard() {
    return board.map(cell => ({ id: cell.id, orientation: cell.orientation }));
  }

  function initHistory() {
    history = [copyBoard()];
    historyIndex = 0;
    updateUndoRedoButtons();
  }

  function pushHistory() {
    history = history.slice(0, historyIndex + 1);
    history.push(copyBoard());
    if (history.length > MAX_HISTORY) {
      history.shift();
      historyIndex = MAX_HISTORY - 1;
    } else {
      historyIndex = history.length - 1;
    }
    updateUndoRedoButtons();
  }

  function restoreFromHistory(index) {
    const state = history[index];
    for (let i = 0; i < board.length; i++) {
      board[i].id = state[i].id;
      board[i].orientation = state[i].orientation;
    }
  }

  function undo() {
    if (activeRotation || historyIndex <= 0) return;
    historyIndex--;
    restoreFromHistory(historyIndex);
    draw();
    updateUndoRedoButtons();
  }

  function redo() {
    if (activeRotation || historyIndex >= history.length - 1) return;
    historyIndex++;
    restoreFromHistory(historyIndex);
    draw();
    updateUndoRedoButtons();
  }

  function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.disabled = historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = historyIndex >= history.length - 1;
  }

  function setN(newN) {
    if (activeRotation) return;
    N = newN;
    updateGeometry();
    buildBoard();
    initHistory();
    draw();
  }

  function shuffle() {
    if (activeRotation) return;
    const pts = getRotationPoints().filter(p => getSixCells(p.row, p.col).length === 6);
    if (pts.length === 0) return;
    const count = 100 * N * N;
    for (let i = 0; i < count; i++) {
      const pt = pts[Math.floor(Math.random() * pts.length)];
      applyRotation(pt.row, pt.col);
    }
    pushHistory();
    draw();
  }

  function reset() {
    if (activeRotation) return;
    buildBoard();
    initHistory();
    draw();
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

        const correctPosition = cell.id === idx + 1;
        const correctOrientation = cell.orientation === 0;
        if (correctPosition && correctOrientation) {
          ctx.fillStyle = '#f0e4e4';
        } else if (correctPosition) {
          ctx.fillStyle = '#e0e4f0';
        } else {
          ctx.fillStyle = '#e8e8e8';
        }
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
    updateGeometry();
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    buildBoard();
    initHistory();
    draw();
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const nSelect = document.getElementById('n-select');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    nSelect.addEventListener('change', () => setN(parseInt(nSelect.value, 10)));
    shuffleBtn.addEventListener('click', shuffle);
    document.getElementById('reset-btn').addEventListener('click', reset);
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);
  }

  init();
})();
