/**
 * JointPanel.js
 * 우측 관절 각도 패널 렌더링
 */

import { G1_JOINTS } from './joints.js';

export class JointPanel {
  constructor(container) {
    this._container = container;
    this._rows      = [];
    this._build();
  }

  _build() {
    this._container.innerHTML = '';

    // 그룹별로 묶어서 표시
    const groups = [
      { key: 'leg',   label: '다리' },
      { key: 'waist', label: '허리' },
      { key: 'arm',   label: '팔' },
      { key: 'head',  label: '머리' },
    ];

    for (const g of groups) {
      const gHeader = document.createElement('div');
      gHeader.className   = 'joint-group-label';
      gHeader.textContent = g.label;
      gHeader.style.cssText = 'font-size:10px;color:#4a9eff;font-weight:600;padding:4px 4px 2px;text-transform:uppercase;letter-spacing:0.06em;';
      this._container.appendChild(gHeader);

      const joints = G1_JOINTS.filter(j => j.group === g.key);
      for (const jd of joints) {
        const row = document.createElement('div');
        row.className = 'joint-row';

        const nameEl = document.createElement('span');
        nameEl.className   = 'joint-name';
        nameEl.textContent = jd.name.replace(/_/g, ' ');
        nameEl.title       = `컬럼 ${jd.csvCol}`;

        const barWrap = document.createElement('div');
        barWrap.className = 'joint-bar-wrap';
        const bar = document.createElement('div');
        bar.className = 'joint-bar';
        bar.style.width = '0%';
        barWrap.appendChild(bar);

        const valEl = document.createElement('span');
        valEl.className   = 'joint-val';
        valEl.textContent = '0.00';

        row.appendChild(nameEl);
        row.appendChild(barWrap);
        row.appendChild(valEl);
        this._container.appendChild(row);

        this._rows.push({ jd, row, bar, valEl });
      }
    }
  }

  /**
   * @param {number[]} joints - 29개 관절 각도 배열 (rad)
   */
  update(joints) {
    for (const { jd, bar, valEl, row } of this._rows) {
      const val = joints[jd.id] ?? 0;
      const [lo, hi] = jd.limit;
      const range = hi - lo;
      const pct   = range > 0 ? ((val - lo) / range) * 100 : 50;

      bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
      valEl.textContent = val.toFixed(3);

      const absFrac = Math.abs(val) / Math.max(Math.abs(lo), Math.abs(hi));
      bar.className = 'joint-bar' + (absFrac > 0.95 ? ' exceed' : absFrac > 0.8 ? ' warn' : '');

      // 범위 이탈 시 행 강조
      if (val < lo - 0.01 || val > hi + 0.01) {
        row.style.background = 'rgba(224,85,85,0.12)';
      } else {
        row.style.background = '';
      }
    }
  }

  reset() {
    for (const { bar, valEl, row } of this._rows) {
      bar.style.width     = '0%';
      bar.className       = 'joint-bar';
      valEl.textContent   = '0.000';
      row.style.background = '';
    }
  }
}
