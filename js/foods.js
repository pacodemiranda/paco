// Alimentação: refeições, favoritos iniciais (estimativas médias, editáveis no app) e cálculo do gasto basal.
export const MEALS = [['cafe', 'Café da manhã'], ['almoco', 'Almoço'], ['lanche', 'Lanche'], ['jantar', 'Jantar'], ['ceia', 'Ceia']];

export const ACTIVITY_LEVELS = [
  [1.2, 'Sedentário (trabalho sentado)'],
  [1.375, 'Pouco ativo']
];

export const KCAL_PER_MIN = 5; // usado só quando o treino não tem calorias informadas

// Mifflin-St Jeor
export function bmr({ kg, cm, age, sex }) {
  return 10 * kg + 6.25 * cm - 5 * age + (sex === 'f' ? -161 : 5);
}

const f = (id, meal, name, kcal) => ({ id: 'fav-' + id, meal, name, kcal });

// Valores aproximados. O app avisa que são estimativas e deixa o usuário ajustar cada um.
export const DEFAULT_FAVS = [
  f('cafe-preto', 'cafe', 'Café preto (500 ml)', 10),
  f('pao-queijo', 'cafe', 'Pão de queijo (unidade)', 130),
  f('pao-franc-queijo', 'cafe', 'Pão francês com queijo', 270),
  f('pao-ovo', 'cafe', 'Pão com ovo', 290),
  f('pao-peru-cafe', 'cafe', 'Pão com queijo e peito de peru', 300),
  f('ovo', 'cafe', 'Ovo mexido ou frito (unidade)', 110),
  f('strudel', 'cafe', 'Strudel (fatia)', 320),
  f('bolo-aipim', 'cafe', 'Bolo de aipim (fatia)', 280),
  f('alm-light', 'almoco', 'Almoço empresa - opção light', 550),
  f('alm-dia', 'almoco', 'Almoço empresa - prato do dia', 850),
  f('alm-massa', 'almoco', 'Almoço empresa - massa (pequeno)', 650),
  f('alm-salada', 'almoco', 'Almoço empresa - salada com frango', 400),
  f('alm-feijoada', 'almoco', 'Feijoada', 1000),
  f('alm-carne', 'almoco', 'Carne assada sem arroz', 600),
  f('alm-linguica', 'almoco', 'Linguiça com tropeiro', 950),
  f('alm-moqueca', 'almoco', 'Moqueca', 850),
  f('alm-dobradinha', 'almoco', 'Dobradinha', 900),
  f('alm-frango', 'almoco', 'Frango assado, arroz de brócolis e batata portuguesa', 900),
  f('chopp', 'almoco', 'Chopp (300 ml)', 125),
  f('sobremesa', 'almoco', 'Sobremesa (porção)', 300),
  f('pizza', 'jantar', 'Pizza (fatia)', 280),
  f('hamburguer', 'jantar', 'Hambúrguer com batata', 1000),
  f('pao-peru-jantar', 'jantar', 'Pão com queijo e peito de peru', 300)
];
