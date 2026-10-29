// Programa de treino padrão (Fase 1) e validação para importar programas novos.
export const ACTIVITY_TYPES = ['Pilates', 'Natação', 'Futevôlei', 'Vôlei', 'Futebol', 'Caminhada', 'Corrida', 'Outro'];

export const ACTIVITY_NOTES = {
  'Pilates': 'Avise a instrutora das suas restrições de lombar e joelho antes da aula. Foco em estabilização da lombar, glúteo médio e controle do quadril. Evite rolamentos e flexão repetida da coluna até a instrutora adaptar os exercícios.',
  'Natação': 'Aquecimento: 200 m soltos, crawl ou costas. Principal: 6 x 100 m alternando crawl e costas, com 30 s de descanso. Solte 100 m leves no final. Evite o nado borboleta. No nado peito, pare se o joelho incomodar na pernada.'
};

export const DEFAULT_PROGRAM = {
  name: 'Fase 1 - Retomada',
  phase: 1,
  schedule: {
    '1': { w: 'seg' },
    '2': { w: 'ter' },
    '3': { w: 'qua' },
    '4': { w: 'qui' },
    '5': { a: 'Pilates', note: ACTIVITY_NOTES['Pilates'] },
    '6': { a: 'Natação', note: ACTIVITY_NOTES['Natação'] },
    '0': null
  },
  reminders: {
    rules: [
      { t: 'Direita primeiro', d: 'Em todo exercício de uma perna, comece pela direita e repita o mesmo número de repetições na esquerda.' },
      { t: 'Coluna neutra', d: 'Se a postura da lombar se perder, pare a série. Dor que irradia para a perna encerra o treino.' },
      { t: 'Reserve 2 reps', d: 'Termine cada série com a sensação de que dava para fazer mais 2 repetições.' }
    ],
    avoid: [
      'Agachamento e terra pesados',
      'Abdominal tradicional',
      'Saltos com carga, como agachamento com salto na caixa',
      'Flexão repetida da coluna sob peso'
    ],
    next: [
      'Semanas 5 a 10: séries de 8 a 10 repetições com mais carga. Entram afundo, agachamento búlgaro leve e terra romeno com barra.',
      'Semana 11 em diante: pliometria de baixo impacto, depois deslocamentos laterais.',
      'Depois: futevôlei e vôlei, de forma gradual, com liberação da fisioterapia.'
    ]
  },
  workouts: [
    {
      id: 'seg', name: 'Pernas A', focus: 'Joelho e quadríceps', minutes: 50, rest: 60,
      warmup: 'Aquecimento, 5 min: gato-camelo x10, ponte de glúteo x12, agachamento sem peso x10.',
      exercises: [
        { ex: 'leg-press', sets: 3, reps: '12' },
        { ex: 'extensora', sets: 3, reps: '12', side: true, tag: 'Uma perna por vez, direita primeiro' },
        { ex: 'goblet', sets: 3, reps: '10' },
        { ex: 'step-up', sets: 3, reps: '10', side: true, tag: 'Direita primeiro' },
        { ex: 'panturrilha-pe', sets: 3, reps: '15' },
        { ex: 'farmer-walk', sets: 3, mode: 'time', seconds: 30, tag: 'Finalizador' }
      ]
    },
    {
      id: 'ter', name: 'Superiores e core', focus: 'Peito, costas, ombros e estabilidade da lombar', minutes: 50, rest: 60,
      warmup: 'Aquecimento, 5 min: gato-camelo x10, ponte de glúteo x12, agachamento sem peso x10.',
      exercises: [
        { ex: 'supino-halter', sets: 3, reps: '10-12' },
        { ex: 'remada-baixa', sets: 3, reps: '12' },
        { ex: 'desenvolvimento', sets: 3, reps: '10' },
        { ex: 'puxada', sets: 3, reps: '10-12' },
        { ex: 'prancha', sets: 3, mode: 'time', seconds: 30, rest: 45 },
        { ex: 'dead-bug', sets: 3, reps: '8', side: true, rest: 45 },
        { ex: 'bird-dog', sets: 3, reps: '8', side: true, rest: 45 }
      ]
    },
    {
      id: 'qua', name: 'Pernas B', focus: 'Posterior de coxa e glúteo', minutes: 50, rest: 60,
      warmup: 'Aquecimento, 5 min: gato-camelo x10, ponte de glúteo x12, agachamento sem peso x10.',
      exercises: [
        { ex: 'mesa-flexora', sets: 3, reps: '12' },
        { ex: 'hip-thrust', sets: 3, reps: '12' },
        { ex: 'stiff', sets: 3, reps: '10' },
        { ex: 'abdutora', sets: 3, reps: '15' },
        { ex: 'prancha-lateral', sets: 3, mode: 'time', seconds: 20, side: true, rest: 45 },
        { ex: 'panturrilha-sentada', sets: 3, reps: '15', tag: 'Finalizador' }
      ]
    },
    {
      id: 'qui', name: 'Full body em circuito', focus: 'Ritmo mais alto para gastar mais energia', minutes: 45, rest: 35, circuit: true,
      intro: 'Circuito de 3 voltas: faça um exercício de cada, na ordem, e repita. Descanse de 30 a 40 s entre os exercícios e 1 min 30 s entre as voltas. Carga leve a moderada.',
      warmup: 'Aquecimento, 5 min: gato-camelo x10, ponte de glúteo x12, agachamento sem peso x10.',
      exercises: [
        { ex: 'leg-press', sets: 3, reps: '12', tag: 'Carga leve' },
        { ex: 'remada-unilateral', sets: 3, reps: '10', side: true },
        { ex: 'supino-maquina', sets: 3, reps: '12' },
        { ex: 'elevacao-pelvica-uni', sets: 3, reps: '8', side: true, tag: 'Direita primeiro' },
        { ex: 'pallof', sets: 3, reps: '10', side: true },
        { ex: 'farmer-walk', sets: 4, mode: 'time', seconds: 30, rest: 20, tag: 'Finalizador, 20 s de descanso' }
      ]
    }
  ],
  exercises: {
    'leg-press': { name: 'Leg press 45°', video: 'rAUy2-fNrsw',
      cues: ['Pés na largura dos ombros, na altura média da plataforma', 'Desça até cerca de 90° de flexão do joelho', 'Lombar sempre encostada no apoio', 'Não trave os joelhos no topo'],
      warn: 'Se a lombar descolar do encosto, reduza a amplitude.' },
    'extensora': { name: 'Cadeira extensora', video: 's_5HG9UWIj4',
      cues: ['Carga leve: suba em 1 s e desça em 3 s', 'Alinhe o eixo da máquina com o joelho'],
      warn: 'Dor na frente do joelho: reduza a carga e a amplitude.' },
    'goblet': { name: 'Agachamento goblet no banco', video: 'jaglUwcC1zE',
      cues: ['Halter junto ao peito, cotovelos para baixo', 'Sente no banco com controle, sem se jogar', 'Tronco firme e olhar para frente'],
      warn: 'Pare onde conseguir manter a lombar neutra.' },
    'step-up': { name: 'Step-up baixo', video: 'hsxKlElRKcU',
      cues: ['Degrau de 20 a 30 cm', 'Suba empurrando com a perna de cima, sem impulso da de baixo', 'Joelho alinhado com o pé, sem cair para dentro'] },
    'panturrilha-pe': { name: 'Panturrilha em pé', video: 'qWHH0We_9r0',
      cues: ['Suba até a ponta dos pés e segure 1 s', 'Desça devagar até alongar'] },
    'farmer-walk': { name: 'Farmer walk', video: 'nm4bbGi8N20',
      cues: ['Halteres moderados, um em cada mão', 'Ombros para trás, abdômen firme, passos curtos'] },
    'supino-halter': { name: 'Supino com halteres', video: 'jrT3xWa0U9M',
      cues: ['Escápulas juntas e para baixo, pés firmes no chão', 'Desça até a linha do peito, cotovelos a cerca de 45° do tronco'],
      warn: 'Sem arquear a lombar para subir a carga.' },
    'remada-baixa': { name: 'Remada baixa no cabo', video: 'eM0iMLxRIlM',
      cues: ['Peito aberto, coluna neutra', 'Puxe o cotovelo para trás e aperte as costas por 1 s', 'Tronco parado, sem balançar'] },
    'desenvolvimento': { name: 'Desenvolvimento com halteres', video: 'eufDL9MmF8A',
      cues: ['Banco com encosto, costas apoiadas', 'Suba sem empurrar o quadril para frente'],
      warn: 'Lombar arqueando é sinal de carga alta demais.' },
    'puxada': { name: 'Puxada na frente', video: 'gUfVYr5AaYE',
      cues: ['Puxe a barra até a altura do queixo', 'Cotovelos para baixo e para trás, sem jogar o tronco'] },
    'prancha': { name: 'Prancha', video: 'rttTAImJW-A',
      cues: ['Cotovelos sob os ombros, corpo em linha reta', 'Aperte glúteo e abdômen, sem deixar o quadril cair'] },
    'dead-bug': { name: 'Dead bug', video: 'sFZP91mNDMo',
      cues: ['Lombar colada no chão o tempo todo', 'Estenda braço e perna opostos, devagar'] },
    'bird-dog': { name: 'Bird dog', video: '_1j_HWknGLg',
      cues: ['Quadril parado, sem girar', 'Segure 2 s com braço e perna esticados'] },
    'mesa-flexora': { name: 'Mesa flexora', video: 'Qz-y0Yijdl0',
      cues: ['Quadril colado no banco', 'Suba em 1 s e desça em 3 s'] },
    'hip-thrust': { name: 'Hip thrust', video: 'yA9GQKcUEEc',
      cues: ['Costas apoiadas no banco, queixo levemente recolhido', 'Suba até alinhar ombro, quadril e joelho', 'Aperte o glúteo por 1 s no topo'],
      warn: 'No topo, o movimento vem do glúteo. A lombar não participa.' },
    'stiff': { name: 'Stiff com halteres', video: 'hTSsiQaS9pU',
      cues: ['Joelhos levemente flexionados, o quadril vai para trás', 'Halteres rentes às pernas', 'Desça até a altura dos joelhos, coluna neutra'],
      warn: 'Perdeu a coluna neutra? Pare a série. Carga leve nestas 4 semanas.' },
    'abdutora': { name: 'Abdução na máquina', video: 'E5r5OmVfxpU',
      cues: ['Costas apoiadas', 'Abra sem balançar o tronco e volte devagar'] },
    'prancha-lateral': { name: 'Prancha lateral', video: 'A0RGKVDnUok',
      cues: ['Cotovelo sob o ombro, quadril alto', 'Corpo em linha reta da cabeça aos pés'] },
    'panturrilha-sentada': { name: 'Panturrilha sentada', video: 'UqsUaoE3SSs',
      cues: ['Amplitude completa, pausa de 1 s no topo'] },
    'remada-unilateral': { name: 'Remada unilateral no banco', video: 'dqVGn298xGw',
      cues: ['Mão e joelho apoiados no banco, coluna neutra', 'Puxe o cotovelo em direção ao quadril'] },
    'supino-maquina': { name: 'Supino na máquina', video: 'e-F32H5SF6E',
      cues: ['Banco regulado com as pegadas na linha do peito', 'Costas apoiadas'] },
    'elevacao-pelvica-uni': { name: 'Elevação pélvica com uma perna', video: 'r7Dk1EVQSZI',
      cues: ['Pé de apoio firme no chão', 'Quadril nivelado, sem girar'] },
    'pallof': { name: 'Pallof press', video: '6q2n6pxG7jE',
      cues: ['Cabo na altura do peito, de lado para a polia', 'Estenda os braços sem deixar o tronco girar'] }
  }
};

export function validateProgram(p) {
  const err = [];
  if (!p || typeof p !== 'object' || Array.isArray(p)) return { ok: false, errors: ['O conteúdo não é um objeto JSON de programa.'] };
  if (typeof p.name !== 'string' || !p.name.trim()) err.push('Falta "name" (nome do programa).');
  if (!p.exercises || typeof p.exercises !== 'object') err.push('Falta "exercises" (biblioteca de exercícios).');
  else {
    Object.keys(p.exercises).forEach(k => {
      const e = p.exercises[k];
      if (!e || typeof e.name !== 'string' || !e.name) err.push(`Exercício "${k}": falta "name".`);
      if (e && e.cues !== undefined && !Array.isArray(e.cues)) err.push(`Exercício "${k}": "cues" precisa ser uma lista.`);
    });
  }
  const ids = new Set();
  if (!Array.isArray(p.workouts) || !p.workouts.length) err.push('Falta "workouts" (lista de treinos).');
  else {
    p.workouts.forEach((w, i) => {
      const t = `Treino ${i + 1}`;
      if (!w || typeof w.id !== 'string' || !w.id) err.push(`${t}: falta "id".`);
      else if (ids.has(w.id)) err.push(`${t}: id repetido "${w.id}".`);
      else ids.add(w.id);
      if (!w || !w.name) err.push(`${t}: falta "name".`);
      if (!w || !Array.isArray(w.exercises) || !w.exercises.length) { err.push(`${t}: falta "exercises".`); return; }
      w.exercises.forEach((e, j) => {
        const tt = `${t}, exercício ${j + 1}`;
        if (!e || !p.exercises || !p.exercises[e.ex]) err.push(`${tt}: "${e && e.ex}" não existe em "exercises".`);
        if (!e || !Number.isInteger(e.sets) || e.sets < 1 || e.sets > 10) err.push(`${tt}: "sets" precisa ser um número inteiro de 1 a 10.`);
        if (e && e.mode === 'time') { if (!(e.seconds > 0)) err.push(`${tt}: falta "seconds" (tempo em segundos).`); }
        else if (!e || e.reps === undefined || e.reps === null || e.reps === '') err.push(`${tt}: falta "reps".`);
      });
    });
  }
  if (p.schedule !== undefined) {
    if (!p.schedule || typeof p.schedule !== 'object') err.push('"schedule" precisa ser um objeto com os dias 0 a 6.');
    else Object.keys(p.schedule).forEach(d => {
      const v = p.schedule[d];
      if (v === null) return;
      if (!/^[0-6]$/.test(d)) err.push(`schedule: dia inválido "${d}" (use 0 para domingo até 6 para sábado).`);
      else if (v.w && !ids.has(v.w)) err.push(`schedule: o dia ${d} aponta para o treino "${v.w}" que não existe.`);
      else if (!v.w && !v.a) err.push(`schedule: o dia ${d} precisa de "w" (treino) ou "a" (atividade).`);
    });
  }
  return { ok: err.length === 0, errors: err };
}
