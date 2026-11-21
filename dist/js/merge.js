// O plano de vínculo é calculado em memória até a confirmação do técnico.
const mergeLabels = {
  tagNumber:"Brinco", tagColor:"Cor do brinco", age:"Idade", sex:"Sexo", breed:"Raça",
  arrival:"Entrada", origin:"Origem", from:"Propriedade de Origem",
  entryPriceKg:"Preço do kg de entrada", exit:"Saída atual"
};

function mergePlan(first, second, choices) {
  const merged = withLots({...second, ...first}, [...animalLots(first), ...animalLots(second)]);
  const questions = [];
  const unique = (rows, key) => [...new Map(rows.map(r => [key(r),r])).values()];
  function choose(key, title, values, labels) {
    questions.push({key,title,labels});
    return values[choices[key] ?? 0];
  }
  function display(v) {
    if (typeof v !== "object") return String(v ?? "");
    return Object.values(v).filter(hasInfo).join(" · ");
  }
  for (const key of Object.keys(mergeLabels)) {
    const pair = [first, second].map(a => key === "tagNumber" ? a.tagNumber || a.id : a[key]);
    const [a,b] = pair;
    if (key === "tagNumber" && a !== b) {
      const owner = choose(key, mergeLabels[key], [first, second],pair);
      merged.tagNumber = owner.tagNumber || owner.id;
      merged.id = owner.id;
    } else if (hasInfo(a) && hasInfo(b) && JSON.stringify(a) !== JSON.stringify(b)) {
      merged[key] = choose(key, mergeLabels[key], pair, pair.map(display));
    } else if (hasInfo(a) || hasInfo(b)) merged[key] = hasInfo(a) ? a : b;
  }
  for (const kind of ["weights","vaccines"]) {
    merged[kind] = [];
    const weight = kind === "weights";
    const key = r => weight ? String(Number(r.kg)) : JSON.stringify([r.name.trim().toLocaleLowerCase("pt-BR"),r.next || ""]);
    const describe = r => weight ? r.kg+" kg" : r.name+" · Próxima dose: "+(r.next ? date(r.next) : "não informada");
    const days = new Map();
    for (const [side, animal] of [first,second].entries()) {
      for (const row of animal[kind]) {
        if (!days.has(row.day)) days.set(row.day,[[],[]]);
        days.get(row.day)[side].push(row);
      }
    }
    for (const [day, groups] of days) {
      const knownDates = new Map();
      const vaccineName = row => row.name.trim().toLocaleLowerCase("pt-BR");
      if (!weight) {
        for (const row of groups.flat()) {
          if (!row.next) continue;
          const name = vaccineName(row);
          if (!knownDates.has(name)) knownDates.set(name,new Set());
          knownDates.get(name).add(row.next);
        }
      }
      const [a,b] = groups.map(rows=>unique(rows.map(row=>{
        if (weight || row.next) return row;
        const dates = knownDates.get(vaccineName(row));
        return dates?.size === 1 ? {...row,next:[...dates][0]} : row;
      }),key));
      const keysA = new Set(a.map(key)), keysB = new Set(b.map(key));
      const left = a.filter(r=>!keysB.has(key(r))), right = b.filter(r=>!keysA.has(key(r)));
      const common = a.filter(r=>keysB.has(key(r)));
      if (a.length && b.length && (left.length || right.length)) {
        const pair = [left,right];
        const keep = choose(kind+day,(weight ? "Pesagem" : "Vacinação")+" de "+date(day),pair,
          [a,b].map(rows=>rows.map(describe).join(" / ")));
        merged[kind].push(...common,...keep);
      } else merged[kind].push(...common,...left,...right);
    }
  }
  merged.baths = unique([...(first.baths||[]),...(second.baths||[])],r=>r.day);
  merged.movements = unique([...(first.movements||[]),...(second.movements||[])],r=>JSON.stringify(r));
  return {merged,questions};
}

function mergedDatabase(data, a, b, merged) {
  const valid = new Set(merged.weights.map(r=>JSON.stringify([r.day,r.kg])));
  const seen = new Set();
  const session = [];
  for (const row of data.session) {
    if (row.id !== a.id && row.id !== b.id) { session.push(row); continue; }
    const key = JSON.stringify([row.day,row.kg]);
    if (valid.has(key) && !seen.has(key)) {
      seen.add(key);
      session.push({...row,id:merged.id});
    }
  }
  return {...data, session, animals:data.animals.filter(x=>x!==b).map(x=>x===a?merged:x)};
}

function openAnimalMerge() {
  const allowed = () => signedIn && currentRole === "tecnico" && tab === "individual";
  if (!allowed()) return;
  const records = db.animals.slice();
  const snapshot = JSON.stringify(db);
  const label = a => [a.id,a.tagColor,a.breed,a.sex,a.origin,animalLots(a).map(id=>"Lote "+id).join(", ")].filter(Boolean).join(" · ");
  const buttons = (next, back=true) => '<div class="actions"><button type="button" class="primary" id="merge-next">'+next+'</button>'+(back ? '<button type="button" id="merge-back">Voltar</button>' : '')+' <button type="button" id="merge-cancel">Cancelar</button></div>';
  let a,b,choices = {};
  function wire(back,next) {
    $("#modal-close").hidden = true;
    if (back) $("#merge-back").onclick = back;
    $("#merge-cancel").onclick = ()=>$("#modal").close();
    $("#merge-next").onclick = ()=>{if (allowed()) next();};
  }
  function select() {
    const options = selected => '<option value="">Selecione um animal</option>'+records.map((r,i)=>
      '<option value="'+i+'" '+(r===selected?'selected':'')+'>'+esc(label(r))+'</option>').join("");
    modal('<h2>Vincular cadastros</h2><label for="merge-a">Primeiro cadastro</label><select id="merge-a">'+options(a)+'</select><label for="merge-b">Segundo cadastro</label><select id="merge-b">'+options(b)+'</select><p id="merge-error" role="alert"></p>'+buttons("Comparar cadastros",false));
    wire(null,()=>{
      const left=$("#merge-a").value,right=$("#merge-b").value;
      if (!left || !right || left===right) { $("#merge-error").textContent="Selecione dois cadastros diferentes."; return; }
      if (a!==records[left] || b!==records[right]) choices={};
      a=records[left]; b=records[right]; review(0);
    });
  }
  function review(i) {
    const {merged,questions} = mergePlan(a,b,choices);
    const q = questions[i];
    if (q) {
      modal('<h2>Escolha qual registro manter</h2><p><strong>'+esc(q.title)+'</strong></p>'+
        q.labels.map((v,j)=>'<label class="merge-choice"><input type="radio" name="merge-choice" value="'+j+'" '+(choices[q.key]===j?'checked':'')+'><span>Ficha '+(j+1)+' ('+esc([a,b][j].id)+') · '+esc(v)+'</span></label>').join("")+'<p id="merge-error" role="alert"></p>'+buttons("Continuar"));
      wire(()=>i ? review(i-1) : select(),()=>{
        const choice=$('input[name="merge-choice"]:checked');
        if (!choice) { $("#merge-error").textContent="Selecione o registro que deseja manter."; return; }
        choices[q.key]=Number(choice.value); review(i+1);
      });
      return;
    }
    modal('<h2>Confirmar vínculo</h2><p>'+esc(label(a))+'<br>'+esc(label(b))+'</p><p>As duas fichas passarão a ser uma. Brinco <b>'+esc(merged.tagNumber || merged.id)+'</b> · '+esc(merged.tagColor || "Cor não informada")+'</p><p>'+merged.weights.length+' pesagem(ns) · '+merged.vaccines.length+' vacinação(ões)</p>'+buttons("Confirmar vínculo"));
    wire(()=>i ? review(i-1) : select(),()=>{
      if (JSON.stringify(db)!==snapshot) { $("#modal").close(); toast("Os cadastros mudaram. Inicie o vínculo novamente."); return; }
      const before=db;
      try {
        const next=mergedDatabase(db,a,b,merged);
        validateBackup(next); db=next; save();
      } catch (error) { db=before; toast(error.message); return; }
      $("#modal").close(); render(); toast("Cadastros vinculados.");
    });
  }
  select();
}
