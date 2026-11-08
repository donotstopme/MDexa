/** Estilos del reporte (los mismos del original). Se inyectan en la app y se incrustan en el .html descargable. */
export const CSS_REPORTE = String.raw`.rep{color:var(--text);font-size:14px;line-height:1.45}
.rep h1{font-size:24px;margin:0 0 4px}
.rep h2{font-size:17px;margin:28px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--line)}
.rep h3{font-size:15px;margin:18px 0 6px}
.rep .sub{color:var(--muted);font-size:13px}
.rep .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:10px;margin:16px 0}
.rep .tile{border:1px solid var(--line);border-radius:10px;padding:10px 12px;border-top:4px solid var(--line)}
.rep .tile .n{font-size:26px;font-weight:700;line-height:1.1}
.rep .tile .l{font-size:12px;color:var(--muted)}
.rep .tile.verde{border-top-color:var(--c-verde)} .rep .tile.azul{border-top-color:var(--c-azul)} .rep .tile.amar{border-top-color:var(--c-amar)}
.rep .tile.gris{border-top-color:var(--c-gris)} .rep .tile.rojo{border-top-color:var(--c-rojo)}
.rep .t-ok{color:var(--c-verde)} .rep .t-dan{color:var(--c-rojo)} .rep .t-warn{color:var(--t-amar)} .rep .t-mut{color:var(--muted)}
.rep .es-gris{color:var(--c-gris)} .rep .es-azul{color:var(--c-azul)} .rep .es-amar{color:var(--t-amar)} .rep .es-verde{color:var(--c-verde)} .rep .es-rojo{color:var(--c-rojo)}
.rep .bar{height:10px;background:var(--line);border-radius:99px;overflow:hidden;display:flex}
.rep .bar>div{height:100%}
.rep .f-verde{background:var(--c-verde)} .rep .f-azul{background:var(--c-azul)} .rep .f-amar{background:var(--c-amar)} .rep .f-gris{background:var(--c-gris)} .rep .f-rojo{background:var(--c-rojo)}
.rep .leyenda{display:flex;flex-wrap:wrap;gap:14px;font-size:12px;color:var(--muted);margin-top:6px}
.rep .leyenda i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.rep .dos{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:12px}
.rep .fila-p{display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px}
.rep .scroll{overflow-x:auto}
.rep table{width:100%;border-collapse:collapse;font-size:13px}
.rep th,.rep td{border-bottom:1px solid var(--line);padding:6px 7px;text-align:left;vertical-align:top;cursor:default}
.rep th{font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);font-weight:600;white-space:normal}
.rep .num{text-align:right;white-space:nowrap}
.rep td.txt{white-space:pre-line}
.rep .pct{display:flex;align-items:center;gap:6px;min-width:110px}
.rep .pct .bar{flex:1;height:6px}
.rep ul{margin:4px 0 10px;padding-left:20px} .rep li{margin:3px 0}
.rep .persona{border:1px solid var(--line);border-radius:10px;padding:4px 14px 8px;margin-bottom:10px}
.rep .etq{font-size:12px;color:var(--muted);font-weight:600;margin-top:8px}
.rep .chip{display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:600;border:1px solid currentColor}
.rep .vacio{color:var(--muted);font-style:italic}
.rep .av-svg{width:100%;height:auto;display:block;overflow:visible}.rep .av-eje{font-size:11px;fill:var(--muted)}.rep .av-hoy{font-size:11px;font-weight:700;fill:var(--c-rojo)}.rep .av-val{font-size:13px;font-weight:700;fill:var(--text)}
.rep .av-ley{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px;color:var(--muted);margin:4px 0}.rep .av-ley span{display:inline-flex;align-items:center;gap:6px}
.rep .av-k{display:inline-block;width:18px;height:0;border-top:2px solid;vertical-align:middle}.rep .av-k.real{border-color:var(--av-real)}.rep .av-k.ideal{border-color:var(--av-ideal)}.rep .av-k.proy{border-color:var(--av-real);border-top-style:dashed;opacity:.7}.rep .av-k.hoy{border-color:var(--c-rojo);width:2px;height:12px;border-top:0;border-left:2px solid var(--c-rojo)}
.rep .av-tabla{border-collapse:collapse;font-size:12.5px;min-width:340px}.rep .av-tabla .num{text-align:right}
@media print{.rep .av-graf{break-inside:avoid}}
.rep .tam{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.rep .tam svg{flex-shrink:0} .rep .tam-XS svg,.rep .tam-S svg{color:var(--c-verde)} .rep .tam-M svg{color:var(--c-azul)} .rep .tam-L svg{color:var(--warn)} .rep .tam-XL svg,.rep .tam-XL b{color:var(--c-rojo)}
@media (max-width:700px){.rep .dos{grid-template-columns:1fr}}
@media print{.rep h2,.rep h3{break-after:avoid}.rep tr,.rep .persona,.rep .tile{break-inside:avoid}}
`;
